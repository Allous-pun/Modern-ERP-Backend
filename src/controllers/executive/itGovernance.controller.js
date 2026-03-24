// src/controllers/executive/itGovernance.controller.js
const ITGovernanceDashboard = require('../../models/executive/itGovernanceDashboard.model');
const ITCompliance = require('../../models/executive/itCompliance.model');
const DigitalTransformation = require('../../models/executive/digitalTransformation.model');
const Compliance = require('../../models/system/compliance.model');
const { logExecutiveAction } = require('../../services/executive/auditHelper.service');
const mongoose = require('mongoose');

// ==================== HELPER FUNCTIONS ====================

/**
 * Get the correct user ID (handles both supreme admin and regular users)
 */
const getMemberId = (req) => {
    return req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
};

function calculateDateRange(period, referenceDate = new Date()) {
    const date = new Date(referenceDate);
    const start = new Date(date);
    const end = new Date(date);
    
    switch(period) {
        case 'daily':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'weekly':
            start.setDate(date.getDate() - date.getDay());
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        case 'monthly':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'quarterly':
            const quarter = Math.floor(date.getMonth() / 3);
            start.setMonth(quarter * 3, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(quarter * 3 + 3, 0);
            end.setHours(23, 59, 59, 999);
            break;
    }
    
    return { start, end };
}

// ==================== DASHBOARD FUNCTIONS ====================

/**
 * @desc    Get IT governance dashboard
 * @route   GET /api/executive/it-governance/dashboard
 * @access  Private (CIO, CTO, CEO)
 */
const getITGovernanceDashboard = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { period = 'monthly' } = req.query;
        
        // Calculate date range
        const dateRange = calculateDateRange(period);
        
        // Get the correct user ID
        const memberId = getMemberId(req);
        
        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Get compliance data from System Compliance model
        const compliance = await Compliance.findOne({ 
            organization: req.organization.id,
            status: 'active'
        }).lean();
        
        // Get or generate dashboard
        let dashboard = await ITGovernanceDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        }).populate('createdBy', 'personalInfo firstName personalInfo lastName email');
        
        // If not found, generate new dashboard with compliance data
        if (!dashboard) {
            dashboard = await generateITGovernanceDashboard(
                req.organization.id,
                dateRange,
                period,
                memberId,
                compliance
            );
        } else {
            // Update dashboard with latest compliance data if needed
            if (compliance) {
                dashboard.compliance = {
                    frameworks: compliance.frameworks || [],
                    policies: compliance.policies || [],
                    standards: compliance.standards || [],
                    overallScore: compliance.overallScore || 75,
                    status: compliance.status || 'needs_improvement'
                };
                
                // Update risk score based on compliance
                if (compliance.overallScore < 70) {
                    dashboard.risk = {
                        ...dashboard.risk,
                        complianceRisk: {
                            score: 85 - compliance.overallScore,
                            level: compliance.overallScore < 60 ? 'high' : 'medium'
                        }
                    };
                }
                
                await dashboard.save();
            }
        }
        
        // Check for IT governance alerts
        const alerts = await checkITGovernanceAlerts(req.organization.id, dashboard);
        
        // Apply organization settings
        const enhancedDashboard = applySettingsToDashboard(dashboard, req.settings);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'it_governance_dashboard',
            targetId: dashboard._id,
            description: `Viewed IT governance dashboard for ${period}`,
            metadata: { 
                responseTime: Date.now() - startTime,
                memberId,
                period
            }
        });
        
        res.status(200).json({
            success: true,
            data: {
                dashboard: enhancedDashboard,
                alerts
            }
        });
        
    } catch (error) {
        console.error('Get IT governance dashboard error:', error);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'it_governance_dashboard',
            description: 'Failed to view IT governance dashboard',
            success: false,
            error: error.message
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to fetch IT governance dashboard',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Get IT compliance dashboard (reads from System Compliance)
 * @route   GET /api/executive/it-governance/compliance
 * @access  Private (CIO)
 */
const getITComplianceDashboard = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { framework } = req.query;
        
        const memberId = getMemberId(req);
        
        // Read from System Compliance model
        const compliance = await Compliance.findOne({ 
            organization: req.organization.id 
        }).populate('frameworks.assignedTo', 'personalInfo.firstName personalInfo.lastName email');
        
        if (!compliance) {
            return res.status(200).json({
                success: true,
                data: {
                    summary: {
                        totalFrameworks: 0,
                        compliantFrameworks: 0,
                        overallScore: 0,
                        findings: 0,
                        remediated: 0
                    },
                    frameworks: [],
                    upcomingAudits: []
                }
            });
        }
        
        // Filter by framework if specified
        let frameworks = compliance.frameworks;
        if (framework) {
            frameworks = frameworks.filter(f => f.name === framework || f.customName === framework);
        }
        
        // Calculate overall compliance score
        const frameworkScores = {
            'compliant': 100,
            'in_progress': 50,
            'non_compliant': 0,
            'audit_required': 25,
            'not_started': 0
        };
        
        let totalScore = 0;
        frameworks.forEach(f => {
            totalScore += frameworkScores[f.status] || 0;
        });
        
        const overallScore = frameworks.length > 0 ? Math.round(totalScore / frameworks.length) : 0;
        
        // Get upcoming audits from System Compliance
        const upcomingAudits = (compliance.audits || [])
            .filter(a => new Date(a.auditDate) > new Date())
            .sort((a, b) => new Date(a.auditDate) - new Date(b.auditDate))
            .slice(0, 5)
            .map(a => ({
                framework: a.framework,
                date: a.auditDate,
                type: a.type,
                auditor: a.auditor
            }));
        
        // Calculate findings
        const allFindings = (compliance.audits || []).flatMap(a => a.findings || []);
        const openFindings = allFindings.filter(f => f.status !== 'resolved').length;
        const resolvedFindings = allFindings.filter(f => f.status === 'resolved').length;
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'it_compliance',
            description: 'Viewed IT compliance dashboard',
            metadata: { 
                responseTime: Date.now() - startTime,
                memberId
            }
        });
        
        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalFrameworks: frameworks.length,
                    compliantFrameworks: frameworks.filter(f => f.status === 'compliant').length,
                    overallScore,
                    findings: allFindings.length,
                    openFindings,
                    remediated: resolvedFindings
                },
                frameworks: frameworks.map(f => ({
                    name: f.name === 'OTHER' ? f.customName : f.name,
                    status: f.status,
                    certificationDate: f.certificationDate,
                    expiryDate: f.expiryDate,
                    assignedTo: f.assignedTo,
                    notes: f.notes
                })),
                upcomingAudits
            }
        });
        
    } catch (error) {
        console.error('Get IT compliance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch IT compliance dashboard'
        });
    }
};

/**
 * @desc    Get digital transformation progress
 * @route   GET /api/executive/it-governance/digital-transformation
 * @access  Private (CIO, CTO, CEO)
 */
const getDigitalTransformation = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { status, category, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        
        const query = { organization: req.organization.id, isActive: true };
        
        if (status) query.status = status;
        if (category) query.category = category;
        
        const initiatives = await DigitalTransformation.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('stakeholders.programManager', 'personalInfo firstName personalInfo lastName email')
            .populate('stakeholders.businessOwner', 'personalInfo firstName personalInfo lastName email')
            .populate('stakeholders.itLead', 'personalInfo firstName personalInfo lastName email');
        
        const total = await DigitalTransformation.countDocuments(query);
        
        // FIX: Use new mongoose.Types.ObjectId() instead of just mongoose.Types.ObjectId()
        const stats = await DigitalTransformation.aggregate([
            { $match: { organization: new mongoose.Types.ObjectId(req.organization.id), isActive: true } },
            { $group: {
                _id: null,
                total: { $sum: 1 },
                totalBudget: { $sum: '$budget.allocated.total' },
                totalSpent: { $sum: '$budget.spent.total' },
                inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                planned: { $sum: { $cond: [{ $eq: ['$status', 'planned'] }, 1, 0] } }
            }}
        ]);
        
        // Get progress by category
        const byCategory = await DigitalTransformation.aggregate([
            { $match: { organization: new mongoose.Types.ObjectId(req.organization.id), isActive: true } },
            { $group: {
                _id: '$category',
                count: { $sum: 1 },
                totalProgress: { $avg: '$progress.overall' },
                totalBudget: { $sum: '$budget.allocated.total' }
            }}
        ]);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'digital_transformation',
            description: 'Viewed digital transformation progress',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            count: initiatives.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            stats: stats[0] || {},
            byCategory,
            data: initiatives
        });
        
    } catch (error) {
        console.error('Get digital transformation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch digital transformation progress'
        });
    }
};

/**
 * @desc    Create digital transformation initiative
 * @route   POST /api/executive/it-governance/digital-transformation
 * @access  Private (CIO, CTO)
 */
const createDigitalTransformation = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const initiativeData = req.body;
        
        // Get the correct user ID
        const memberId = getMemberId(req);
        
        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const initiative = new DigitalTransformation({
            organization: req.organization.id,
            ...initiativeData,
            createdBy: memberId,
            status: 'planned'
        });
        
        await initiative.save();
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'digital_transformation',
            targetId: initiative._id,
            targetName: initiative.name,
            changes: initiativeData,
            description: `Created digital transformation initiative: ${initiative.name}`,
            metadata: { 
                responseTime: Date.now() - startTime,
                memberId
            }
        });
        
        res.status(201).json({
            success: true,
            data: initiative,
            message: 'Digital transformation initiative created successfully'
        });
        
    } catch (error) {
        console.error('Create digital transformation error:', error);
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'digital_transformation',
            description: 'Failed to create digital transformation initiative',
            success: false,
            error: error.message
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create digital transformation initiative'
        });
    }
};

/**
 * @desc    Update digital transformation initiative
 * @route   PUT /api/executive/it-governance/digital-transformation/:id
 * @access  Private (CIO, CTO)
 */
const updateDigitalTransformation = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        // Get the correct user ID
        const memberId = getMemberId(req);
        
        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const initiative = await DigitalTransformation.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!initiative) {
            return res.status(404).json({
                success: false,
                message: 'Digital transformation initiative not found'
            });
        }
        
        // Store old values for audit
        const oldValues = {
            name: initiative.name,
            status: initiative.status,
            progress: initiative.progress.overall
        };
        
        // Update
        Object.assign(initiative, req.body);
        initiative.updatedBy = memberId;
        
        // Recalculate progress and ROI
        if (initiative.calculateProgress) await initiative.calculateProgress();
        if (initiative.calculateROI) await initiative.calculateROI();
        
        await initiative.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'digital_transformation',
            targetId: initiative._id,
            targetName: initiative.name,
            changes: {
                before: oldValues,
                after: {
                    name: initiative.name,
                    status: initiative.status,
                    progress: initiative.progress.overall
                }
            },
            description: `Updated digital transformation initiative: ${initiative.name}`,
            metadata: { 
                responseTime: Date.now() - startTime,
                memberId
            }
        });
        
        res.status(200).json({
            success: true,
            data: initiative,
            message: 'Digital transformation initiative updated successfully'
        });
        
    } catch (error) {
        console.error('Update digital transformation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update digital transformation initiative'
        });
    }
};

/**
 * @desc    Get system performance metrics
 * @route   GET /api/executive/it-governance/system-performance
 * @access  Private (CIO, CTO)
 */
const getSystemPerformance = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { system } = req.query;
        const memberId = getMemberId(req);
        
        const dashboard = await ITGovernanceDashboard.findOne({
            organization: req.organization.id
        }).sort({ 'period.end': -1 });
        
        let performance = dashboard ? dashboard.systemPerformance : {};
        
        // Filter by system if specified
        if (system && performance.criticalSystems) {
            performance = performance.criticalSystems.find(s => s.name === system) || performance;
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'system_performance',
            description: 'Viewed system performance metrics',
            metadata: { 
                responseTime: Date.now() - startTime,
                memberId
            }
        });
        
        res.status(200).json({
            success: true,
            data: performance
        });
        
    } catch (error) {
        console.error('Get system performance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system performance metrics'
        });
    }
};

/**
 * @desc    Get cybersecurity metrics
 * @route   GET /api/executive/it-governance/cybersecurity
 * @access  Private (CIO, CTO, CRO)
 */
const getCybersecurityMetrics = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const memberId = getMemberId(req);
        
        const dashboard = await ITGovernanceDashboard.findOne({
            organization: req.organization.id
        }).sort({ 'period.end': -1 });
        
        const cybersecurity = dashboard ? dashboard.cybersecurity : {};
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'cybersecurity',
            description: 'Viewed cybersecurity metrics',
            metadata: { 
                responseTime: Date.now() - startTime,
                memberId
            }
        });
        
        res.status(200).json({
            success: true,
            data: cybersecurity
        });
        
    } catch (error) {
        console.error('Get cybersecurity metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cybersecurity metrics'
        });
    }
};

/**
 * @desc    Get IT service delivery metrics
 * @route   GET /api/executive/it-governance/service-delivery
 * @access  Private (CIO, IT Manager)
 */
const getServiceDelivery = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const memberId = getMemberId(req);
        
        const dashboard = await ITGovernanceDashboard.findOne({
            organization: req.organization.id
        }).sort({ 'period.end': -1 });
        
        const serviceDelivery = dashboard ? dashboard.serviceDelivery : {};
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'service_delivery',
            description: 'Viewed IT service delivery metrics',
            metadata: { 
                responseTime: Date.now() - startTime,
                memberId
            }
        });
        
        res.status(200).json({
            success: true,
            data: serviceDelivery
        });
        
    } catch (error) {
        console.error('Get service delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch IT service delivery metrics'
        });
    }
};

/**
 * @desc    Get data governance metrics
 * @route   GET /api/executive/it-governance/data-governance
 * @access  Private (CIO, Data Officer)
 */
const getDataGovernance = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const memberId = getMemberId(req);
        
        const dashboard = await ITGovernanceDashboard.findOne({
            organization: req.organization.id
        }).sort({ 'period.end': -1 });
        
        const dataGovernance = dashboard ? dashboard.dataGovernance : {};
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'data_governance',
            description: 'Viewed data governance metrics',
            metadata: { 
                responseTime: Date.now() - startTime,
                memberId
            }
        });
        
        res.status(200).json({
            success: true,
            data: dataGovernance
        });
        
    } catch (error) {
        console.error('Get data governance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch data governance metrics'
        });
    }
};

/**
 * @desc    Get IT audit management (reads from System Compliance audits)
 * @route   GET /api/executive/it-governance/audit
 * @access  Private (CIO, Audit Committee)
 */
const getITAuditManagement = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const memberId = getMemberId(req);
        
        // Read from System Compliance audits
        const compliance = await Compliance.findOne({ 
            organization: req.organization.id 
        }).populate('audits.createdBy', 'personalInfo.firstName personalInfo.lastName email');
        
        if (!compliance || !compliance.audits || compliance.audits.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    audits: [],
                    schedule: { planned: 0, completed: 0, upcoming: [] },
                    remediation: { open: 0, inProgress: 0, closed: 0, overdue: 0 },
                    auditFindings: { bySeverity: { critical: 0, high: 0, medium: 0, low: 0 } }
                }
            });
        }
        
        const audits = compliance.audits;
        
        // Calculate findings by severity
        const findingsBySeverity = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };
        
        let openFindings = 0;
        let inProgressFindings = 0;
        let closedFindings = 0;
        let overdueFindings = 0;
        
        audits.forEach(audit => {
            (audit.findings || []).forEach(finding => {
                findingsBySeverity[finding.severity] = (findingsBySeverity[finding.severity] || 0) + 1;
                
                if (finding.status === 'open') openFindings++;
                if (finding.status === 'in_progress') inProgressFindings++;
                if (finding.status === 'resolved') closedFindings++;
                
                // Check overdue
                if (finding.dueDate && new Date(finding.dueDate) < new Date() && finding.status !== 'resolved') {
                    overdueFindings++;
                }
            });
        });
        
        // Calculate schedule stats
        const completedAudits = audits.filter(a => a.overallStatus === 'passed' || a.overallStatus === 'failed');
        const plannedAudits = audits.filter(a => a.overallStatus === 'pending');
        
        // Upcoming audits
        const upcomingAudits = audits
            .filter(a => new Date(a.auditDate) > new Date())
            .sort((a, b) => new Date(a.auditDate) - new Date(b.auditDate))
            .slice(0, 5)
            .map(a => ({
                name: a.title,
                date: a.auditDate,
                scope: a.scope
            }));
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'it_audit',
            description: 'Viewed IT audit management',
            metadata: { 
                responseTime: Date.now() - startTime,
                memberId
            }
        });
        
        res.status(200).json({
            success: true,
            data: {
                audits: audits.map(a => ({
                    _id: a._id,
                    name: a.title,
                    type: a.type,
                    framework: a.framework,
                    auditor: a.auditor,
                    auditDate: a.auditDate,
                    status: a.overallStatus,
                    findingsCount: (a.findings || []).length,
                    openFindings: (a.findings || []).filter(f => f.status !== 'resolved').length,
                    reportFile: a.reportFile
                })),
                schedule: {
                    planned: plannedAudits.length,
                    completed: completedAudits.length,
                    upcoming: upcomingAudits
                },
                remediation: {
                    open: openFindings,
                    inProgress: inProgressFindings,
                    closed: closedFindings,
                    overdue: overdueFindings,
                    meanTimeToClose: 0
                },
                auditFindings: {
                    bySeverity: findingsBySeverity,
                    byCategory: []
                }
            }
        });
        
    } catch (error) {
        console.error('Get IT audit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch IT audit management'
        });
    }
};

/**
 * @desc    Get vendor risk management
 * @route   GET /api/executive/it-governance/vendor-risk
 * @access  Private (CIO, Procurement)
 */
const getVendorRiskManagement = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const memberId = getMemberId(req);
        
        const dashboard = await ITGovernanceDashboard.findOne({
            organization: req.organization.id
        }).sort({ 'period.end': -1 });
        
        const vendorRisk = dashboard ? dashboard.vendorRisk : {};
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'vendor_risk',
            description: 'Viewed vendor risk management',
            metadata: { 
                responseTime: Date.now() - startTime,
                memberId
            }
        });
        
        res.status(200).json({
            success: true,
            data: vendorRisk
        });
        
    } catch (error) {
        console.error('Get vendor risk error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendor risk management'
        });
    }
};

/**
 * @desc    Get technology portfolio
 * @route   GET /api/executive/it-governance/technology-portfolio
 * @access  Private (CIO, CTO)
 */
const getTechnologyPortfolio = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const memberId = getMemberId(req);
        
        const dashboard = await ITGovernanceDashboard.findOne({
            organization: req.organization.id
        }).sort({ 'period.end': -1 });
        
        const portfolio = dashboard ? dashboard.technologyPortfolio : {};
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'technology_portfolio',
            description: 'Viewed technology portfolio',
            metadata: { 
                responseTime: Date.now() - startTime,
                memberId
            }
        });
        
        res.status(200).json({
            success: true,
            data: portfolio
        });
        
    } catch (error) {
        console.error('Get technology portfolio error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch technology portfolio'
        });
    }
};

/**
 * @desc    Get IT strategy alignment
 * @route   GET /api/executive/it-governance/strategy-alignment
 * @access  Private (CIO, CEO)
 */
const getITStrategyAlignment = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const memberId = getMemberId(req);
        
        const dashboard = await ITGovernanceDashboard.findOne({
            organization: req.organization.id
        }).sort({ 'period.end': -1 });
        
        const strategy = dashboard ? dashboard.strategyAlignment : {};
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'it_strategy',
            description: 'Viewed IT strategy alignment',
            metadata: { 
                responseTime: Date.now() - startTime,
                memberId
            }
        });
        
        res.status(200).json({
            success: true,
            data: strategy
        });
        
    } catch (error) {
        console.error('Get IT strategy error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch IT strategy alignment'
        });
    }
};

/**
 * @desc    Acknowledge IT governance alert
 * @route   PUT /api/executive/it-governance/alerts/:alertId/acknowledge
 * @access  Private (CIO)
 */
const acknowledgeITAlert = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { alertId } = req.params;
        
        // Get the correct user ID
        const memberId = getMemberId(req);
        
        if (!memberId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const dateRange = calculateDateRange('daily');
        
        const dashboard = await ITGovernanceDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard not found'
            });
        }
        
        const alert = dashboard.alerts.id(alertId);
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }
        
        alert.acknowledged = {
            by: memberId,
            at: new Date()
        };
        
        await dashboard.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'it_governance_alert',
            targetId: alertId,
            description: `Acknowledged IT governance alert: ${alert.message}`,
            metadata: { 
                responseTime: Date.now() - startTime,
                memberId
            }
        });
        
        res.status(200).json({
            success: true,
            message: 'Alert acknowledged successfully'
        });
        
    } catch (error) {
        console.error('Acknowledge alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to acknowledge alert'
        });
    }
};

// ==================== GENERATION FUNCTIONS ====================

/**
 * Generate IT Governance Dashboard
 */
async function generateITGovernanceDashboard(organizationId, dateRange, period, memberId, complianceData = null) {
    const dashboard = new ITGovernanceDashboard({
        organization: organizationId,
        name: `IT Governance Dashboard - ${period}`,
        period: dateRange,
        
        // Strategy Alignment
        strategyAlignment: {
            vision: "Drive business value through technology innovation",
            mission: "Deliver secure, reliable, and innovative IT solutions",
            strategicObjectives: [
                { 
                    name: "Cloud First", 
                    description: "Migrate 80% of workloads to cloud",
                    businessGoal: "Reduce infrastructure costs by 30%",
                    progress: 65, 
                    status: "on_track"
                }
            ],
            businessAlignment: { score: 78, byDepartment: [] },
            itValue: { total: 2500000, roi: 15.5, byInitiative: [] }
        },
        
        // Compliance Dashboard
        compliance: {
            overall: {
                score: complianceData?.overallScore || 75,
                status: (complianceData?.overallScore || 75) > 80 ? "good" : "fair",
                findings: (complianceData?.audits || []).flatMap(a => a.findings || []).length,
                remediated: (complianceData?.audits || []).flatMap(a => 
                    (a.findings || []).filter(f => f.status === 'resolved')
                ).length
            },
            frameworks: (complianceData?.frameworks || []).map(f => ({
                name: f.name === 'OTHER' ? f.customName : f.name,
                status: f.status,
                score: f.status === 'compliant' ? 100 : f.status === 'in_progress' ? 50 : 0,
                lastAudit: complianceData?.lastAuditDate,
                nextAudit: complianceData?.nextAuditDate,
                findings: (complianceData?.audits || [])
                    .flatMap(a => a.findings || [])
                    .filter(f => f.framework === f.name)
            })),
            complianceCosts: { total: 450000, byFramework: [], forecast: 480000 }
        },
        
        // Digital Transformation
        digitalTransformation: {
            overall: { progress: 42, score: 65, maturity: "developing" },
            initiatives: [],
            technologyAdoption: {},
            digitalCapabilities: []
        },
        
        // System Performance
        systemPerformance: {
            overall: { availability: 99.2, performance: 85, reliability: 92, satisfaction: 78 },
            criticalSystems: [],
            serviceLevels: { agreements: [], achievements: { ytd: 98.2, qtd: 98.5, mtd: 99.1 } },
            capacity: { current: {}, utilization: {}, forecast: {} }
        },
        
        // Cybersecurity
        cybersecurity: {
            posture: { overall: { score: 82, level: "good", trend: "up" }, byDomain: [] },
            vulnerabilities: { total: 45, bySeverity: { critical: 2, high: 8, medium: 15, low: 20 } },
            incidents: { total: 12, bySeverity: { critical: 0, high: 2, medium: 4, low: 6 } },
            securityControls: { total: 85, implemented: 72, effective: 65 }
        },
        
        // Service Delivery
        serviceDelivery: {
            serviceDesk: { tickets: { total: 850, open: 45, resolved: 785, backlog: 20 }, metrics: {} },
            incidentManagement: { incidents: { total: 120, major: 3 }, metrics: { mttd: 5, mttr: 45 } },
            changeManagement: { changes: { total: 85, successful: 78 }, successRate: 91.8 }
        },
        
        // Data Governance
        dataGovernance: {
            framework: { maturity: "defined", policies: { total: 25, implemented: 20 } },
            dataQuality: { overall: { score: 82, completeness: 88, accuracy: 85 } },
            dataPrivacy: { compliance: { gdpr: 85, ccpa: 78 } },
            dataSecurity: { classification: { public: 2000, internal: 1500, confidential: 800, restricted: 200 } }
        },
        
        // IT Audit
        itAudit: {
            audits: (complianceData?.audits || []).map(a => ({
                name: a.title,
                scope: a.scope,
                auditor: a.auditor,
                type: a.type,
                startDate: a.auditDate,
                endDate: a.reportDate,
                status: a.overallStatus,
                findings: {
                    total: (a.findings || []).length,
                    critical: (a.findings || []).filter(f => f.severity === 'critical').length,
                    high: (a.findings || []).filter(f => f.severity === 'high').length,
                    medium: (a.findings || []).filter(f => f.severity === 'medium').length,
                    low: (a.findings || []).filter(f => f.severity === 'low').length
                },
                compliance: a.overallStatus === 'passed' ? 100 : a.overallStatus === 'partial' ? 50 : 0
            })),
            schedule: {
                planned: (complianceData?.audits || []).filter(a => a.overallStatus === 'pending').length,
                completed: (complianceData?.audits || []).filter(a => a.overallStatus === 'passed' || a.overallStatus === 'failed').length,
                upcoming: []
            },
            remediation: {
                open: (complianceData?.audits || []).flatMap(a => (a.findings || []).filter(f => f.status === 'open')).length,
                inProgress: (complianceData?.audits || []).flatMap(a => (a.findings || []).filter(f => f.status === 'in_progress')).length,
                closed: (complianceData?.audits || []).flatMap(a => (a.findings || []).filter(f => f.status === 'resolved')).length,
                overdue: 0
            }
        },
        
        // Vendor Risk
        vendorRisk: {
            vendors: { total: 85, critical: 12, highRisk: 3, mediumRisk: 8, lowRisk: 74 },
            byCategory: [],
            assessments: [],
            performance: { overall: 88, byVendor: [] }
        },
        
        // Technology Portfolio
        technologyPortfolio: {
            applications: { total: 145, byStatus: { active: 120, development: 15, retired: 8 }, byCriticality: { critical: 25 } },
            infrastructure: { servers: { physical: 50, virtual: 150, cloud: 200 } },
            software: { licenses: { total: 2500, used: 2100, compliance: 95 } },
            cloud: { providers: [], cost: { total: 45000, byService: [] } },
            portfolioMetrics: { totalCost: 3200000, roi: 18, tco: 4500000 }
        },
        
        createdBy: memberId,
        isActive: true
    });
    
    // Add sample alerts
    dashboard.alerts.push({
        type: 'compliance',
        severity: 'warning',
        message: 'Compliance score below target',
        metric: 'compliance_score',
        value: dashboard.compliance.overall.score || 75,
        threshold: 85,
        timestamp: new Date()
    });
    
    await dashboard.save();
    return dashboard;
}

/**
 * Check for IT governance alerts
 */
async function checkITGovernanceAlerts(organizationId, dashboard) {
    const alerts = [];
    
    // Check compliance
    if (dashboard.compliance?.overall?.score < 80) {
        alerts.push({
            type: 'compliance',
            severity: 'warning',
            message: 'Overall compliance score below target',
            metric: 'compliance_score',
            value: dashboard.compliance.overall.score,
            threshold: 80
        });
    }
    
    // Check critical vulnerabilities
    if (dashboard.cybersecurity?.vulnerabilities?.bySeverity?.critical > 0) {
        alerts.push({
            type: 'security',
            severity: 'critical',
            message: 'Critical vulnerabilities require immediate attention',
            metric: 'critical_vulnerabilities',
            value: dashboard.cybersecurity.vulnerabilities.bySeverity.critical,
            threshold: 0
        });
    }
    
    // Check system availability
    if (dashboard.systemPerformance?.overall?.availability < 99.5) {
        alerts.push({
            type: 'performance',
            severity: 'critical',
            message: 'System availability below target',
            metric: 'availability',
            value: dashboard.systemPerformance.overall.availability,
            threshold: 99.5
        });
    }
    
    // Check audit findings
    if (dashboard.itAudit?.remediation?.overdue > 0) {
        alerts.push({
            type: 'audit',
            severity: 'warning',
            message: `${dashboard.itAudit.remediation.overdue} overdue audit findings`,
            metric: 'overdue_findings',
            value: dashboard.itAudit.remediation.overdue,
            threshold: 0
        });
    }
    
    // Check vendor risk
    if (dashboard.vendorRisk?.highRisk > 0) {
        alerts.push({
            type: 'vendor',
            severity: 'warning',
            message: `${dashboard.vendorRisk.highRisk} high-risk vendors identified`,
            metric: 'high_risk_vendors',
            value: dashboard.vendorRisk.highRisk,
            threshold: 0
        });
    }
    
    // Check data quality
    if (dashboard.dataGovernance?.dataQuality?.overall?.score < 80) {
        alerts.push({
            type: 'data_governance',
            severity: 'warning',
            message: 'Data quality score below target',
            metric: 'data_quality',
            value: dashboard.dataGovernance.dataQuality.overall.score,
            threshold: 80
        });
    }
    
    // Update dashboard with new alerts
    if (alerts.length > 0) {
        dashboard.alerts = [...alerts, ...(dashboard.alerts || [])].slice(0, 50);
        await dashboard.save();
    }
    
    return alerts;
}

/**
 * Apply organization settings to dashboard
 */
function applySettingsToDashboard(dashboard, settings) {
    if (!dashboard || !settings) return dashboard;
    
    const dashboardObj = dashboard.toObject ? dashboard.toObject() : dashboard;
    
    // Add currency info
    dashboardObj.currency = settings.baseCurrency || 'USD';
    dashboardObj.dateFormat = settings.dateFormat || 'DD/MM/YYYY';
    
    return dashboardObj;
}

// ==================== EXPORTS ====================

module.exports = {
    getITGovernanceDashboard,
    getITComplianceDashboard,
    getDigitalTransformation,
    createDigitalTransformation,
    updateDigitalTransformation,
    getSystemPerformance,
    getCybersecurityMetrics,
    getServiceDelivery,
    getDataGovernance,
    getITAuditManagement,
    getVendorRiskManagement,
    getTechnologyPortfolio,
    getITStrategyAlignment,
    acknowledgeITAlert,
    generateITGovernanceDashboard,
    calculateDateRange,
    checkITGovernanceAlerts,
    applySettingsToDashboard
};