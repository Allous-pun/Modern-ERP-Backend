// src/controllers/system/compliance.controller.js
const Compliance = require('../../models/system/compliance.model');
const OrganizationMember = require('../../models/organizationMember.model');

// ============================================
// FRAMEWORK MANAGEMENT
// ============================================

/**
 * @desc    Get compliance overview
 * @route   GET /api/system/compliance
 * @access  Private (requires security.compliance_view)
 */
const getComplianceOverview = async (req, res) => {
    try {
        let compliance = await Compliance.findOne({ 
            organization: req.organization.id 
        })
        .populate('frameworks.assignedTo', 'personalInfo.firstName personalInfo.lastName')
        .populate('audits.createdBy', 'personalInfo.firstName personalInfo.lastName');

        if (!compliance) {
            // Create default compliance record
            compliance = await Compliance.create({
                organization: req.organization.id,
                frameworks: [],
                checklists: [],
                audits: [],
                regulatoryRequirements: []
            });
        }

        res.status(200).json({
            success: true,
            data: {
                overview: compliance.summary,
                frameworks: compliance.frameworks,
                recentAudits: compliance.audits.slice(-5),
                overallScore: compliance.overallComplianceScore
            }
        });

    } catch (error) {
        console.error('Get compliance overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch compliance overview'
        });
    }
};

/**
 * @desc    Add compliance framework
 * @route   POST /api/system/compliance/frameworks
 * @access  Private (requires security.compliance_manage)
 */
const addFramework = async (req, res) => {
    try {
        const { name, customName, assignedTo, notes } = req.body;

        let compliance = await Compliance.findOne({ 
            organization: req.organization.id 
        });

        if (!compliance) {
            compliance = new Compliance({ organization: req.organization.id });
        }

        // Check if framework already exists
        const existing = compliance.frameworks.find(f => f.name === name);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Framework already exists'
            });
        }

        compliance.frameworks.push({
            name,
            customName: name === 'OTHER' ? customName : undefined,
            status: 'not_started',
            assignedTo,
            notes
        });

        await compliance.save();

        res.status(201).json({
            success: true,
            message: 'Framework added successfully',
            data: compliance.frameworks[compliance.frameworks.length - 1]
        });

    } catch (error) {
        console.error('Add framework error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add framework'
        });
    }
};

/**
 * @desc    Update framework status
 * @route   PUT /api/system/compliance/frameworks/:frameworkId
 * @access  Private (requires security.compliance_manage)
 */
const updateFramework = async (req, res) => {
    try {
        const { frameworkId } = req.params;
        const { status, certificationDate, expiryDate, assignedTo, notes } = req.body;

        const compliance = await Compliance.findOne({ 
            organization: req.organization.id 
        });

        if (!compliance) {
            return res.status(404).json({
                success: false,
                message: 'Compliance record not found'
            });
        }

        const framework = compliance.frameworks.id(frameworkId);
        if (!framework) {
            return res.status(404).json({
                success: false,
                message: 'Framework not found'
            });
        }

        if (status) framework.status = status;
        if (certificationDate) framework.certificationDate = certificationDate;
        if (expiryDate) framework.expiryDate = expiryDate;
        if (assignedTo) framework.assignedTo = assignedTo;
        if (notes) framework.notes = notes;

        await compliance.save();

        res.status(200).json({
            success: true,
            message: 'Framework updated successfully',
            data: framework
        });

    } catch (error) {
        console.error('Update framework error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update framework'
        });
    }
};

// ============================================
// CHECKLIST MANAGEMENT
// ============================================

/**
 * @desc    Create compliance checklist
 * @route   POST /api/system/compliance/checklists
 * @access  Private (requires security.compliance_manage)
 */
const createChecklist = async (req, res) => {
    try {
        const { framework, category, items } = req.body;

        let compliance = await Compliance.findOne({ 
            organization: req.organization.id 
        });

        if (!compliance) {
            compliance = new Compliance({ organization: req.organization.id });
        }

        const newChecklist = {
            framework,
            category,
            items: items.map(item => ({
                requirement: item.requirement,
                description: item.description,
                assignedTo: item.assignedTo,
                dueDate: item.dueDate,
                status: 'pending'
            })),
            overallProgress: 0,
            lastReviewed: new Date()
        };

        compliance.checklists.push(newChecklist);
        await compliance.save();

        res.status(201).json({
            success: true,
            message: 'Checklist created successfully',
            data: compliance.checklists[compliance.checklists.length - 1]
        });

    } catch (error) {
        console.error('Create checklist error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create checklist'
        });
    }
};

/**
 * @desc    Update checklist item status
 * @route   PUT /api/system/compliance/checklists/:checklistId/items/:itemId
 * @access  Private (requires security.compliance_manage)
 */
const updateChecklistItem = async (req, res) => {
    try {
        const { checklistId, itemId } = req.params;
        const { status, notes, evidence } = req.body;

        const compliance = await Compliance.findOne({ 
            organization: req.organization.id 
        });

        if (!compliance) {
            return res.status(404).json({
                success: false,
                message: 'Compliance record not found'
            });
        }

        const checklist = compliance.checklists.id(checklistId);
        if (!checklist) {
            return res.status(404).json({
                success: false,
                message: 'Checklist not found'
            });
        }

        const item = checklist.items.id(itemId);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Checklist item not found'
            });
        }

        if (status) {
            item.status = status;
            if (status === 'compliant') {
                item.completedAt = new Date();
            }
        }
        if (notes) item.notes = notes;
        if (evidence) {
            item.evidence.push({
                ...evidence,
                uploadedBy: req.user.memberId,
                uploadedAt: new Date()
            });
        }

        // Recalculate overall progress
        const totalItems = checklist.items.length;
        const completedItems = checklist.items.filter(i => i.status === 'compliant').length;
        checklist.overallProgress = Math.round((completedItems / totalItems) * 100);
        checklist.lastReviewed = new Date();
        checklist.reviewedBy = req.user.memberId;

        await compliance.save();

        res.status(200).json({
            success: true,
            message: 'Checklist item updated successfully',
            data: item
        });

    } catch (error) {
        console.error('Update checklist item error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update checklist item'
        });
    }
};

// ============================================
// AUDIT MANAGEMENT
// ============================================

/**
 * @desc    Create audit record
 * @route   POST /api/system/compliance/audits
 * @access  Private (requires security.compliance_manage)
 */
const createAudit = async (req, res) => {
    try {
        const {
            title, type, framework, auditor, auditorContact,
            auditDate, scope, findings, reportFile
        } = req.body;

        let compliance = await Compliance.findOne({ 
            organization: req.organization.id 
        });

        if (!compliance) {
            compliance = new Compliance({ organization: req.organization.id });
        }

        const audit = {
            title,
            type,
            framework,
            auditor,
            auditorContact,
            auditDate,
            reportDate: new Date(),
            scope,
            findings: findings || [],
            overallStatus: 'pending',
            createdBy: req.user.memberId,
            reportFile
        };

        compliance.audits.push(audit);
        compliance.lastAuditDate = auditDate;
        
        // Set next audit date (default 1 year)
        const nextDate = new Date(auditDate);
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        compliance.nextAuditDate = nextDate;

        await compliance.save();

        // Update overall compliance score
        await calculateComplianceScore(compliance._id);

        res.status(201).json({
            success: true,
            message: 'Audit record created successfully',
            data: compliance.audits[compliance.audits.length - 1]
        });

    } catch (error) {
        console.error('Create audit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create audit record'
        });
    }
};

/**
 * @desc    Update audit finding
 * @route   PUT /api/system/compliance/audits/:auditId/findings/:findingId
 * @access  Private (requires security.compliance_manage)
 */
const updateAuditFinding = async (req, res) => {
    try {
        const { auditId, findingId } = req.params;
        const { status, remediation, resolvedAt } = req.body;

        const compliance = await Compliance.findOne({ 
            organization: req.organization.id 
        });

        if (!compliance) {
            return res.status(404).json({
                success: false,
                message: 'Compliance record not found'
            });
        }

        const audit = compliance.audits.id(auditId);
        if (!audit) {
            return res.status(404).json({
                success: false,
                message: 'Audit not found'
            });
        }

        const finding = audit.findings.id(findingId);
        if (!finding) {
            return res.status(404).json({
                success: false,
                message: 'Finding not found'
            });
        }

        if (status) finding.status = status;
        if (remediation) finding.remediation = remediation;
        if (resolvedAt) {
            finding.resolvedAt = resolvedAt;
            finding.resolvedBy = req.user.memberId;
        }

        // Check if all findings are resolved
        const allResolved = audit.findings.every(f => f.status === 'resolved');
        if (allResolved) {
            audit.overallStatus = 'passed';
        } else {
            const hasCritical = audit.findings.some(f => 
                f.severity === 'critical' && f.status !== 'resolved'
            );
            audit.overallStatus = hasCritical ? 'failed' : 'partial';
        }

        await compliance.save();

        res.status(200).json({
            success: true,
            message: 'Audit finding updated successfully',
            data: finding
        });

    } catch (error) {
        console.error('Update audit finding error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update audit finding'
        });
    }
};

// ============================================
// REPORTS
// ============================================

/**
 * @desc    Get compliance reports
 * @route   GET /api/system/compliance/reports
 * @access  Private (requires security.compliance_view)
 */
const getComplianceReports = async (req, res) => {
    try {
        const { framework, fromDate, toDate } = req.query;

        const compliance = await Compliance.findOne({ 
            organization: req.organization.id 
        })
        .populate('audits.createdBy', 'personalInfo.firstName personalInfo.lastName');

        if (!compliance) {
            return res.status(404).json({
                success: false,
                message: 'No compliance data found'
            });
        }

        // Filter audits by date range
        let audits = compliance.audits;
        if (fromDate || toDate) {
            audits = audits.filter(audit => {
                const auditDate = new Date(audit.auditDate);
                if (fromDate && auditDate < new Date(fromDate)) return false;
                if (toDate && auditDate > new Date(toDate)) return false;
                return true;
            });
        }

        // Filter by framework
        if (framework) {
            audits = audits.filter(a => a.framework === framework);
        }

        // Generate report
        const report = {
            summary: {
                totalFrameworks: compliance.frameworks.length,
                compliantFrameworks: compliance.frameworks.filter(f => f.status === 'compliant').length,
                totalAudits: audits.length,
                passedAudits: audits.filter(a => a.overallStatus === 'passed').length,
                failedAudits: audits.filter(a => a.overallStatus === 'failed').length,
                overallScore: compliance.overallComplianceScore
            },
            frameworks: compliance.frameworks.map(f => ({
                name: f.name,
                status: f.status,
                certificationDate: f.certificationDate,
                expiryDate: f.expiryDate
            })),
            recentAudits: audits.slice(-10).map(a => ({
                title: a.title,
                type: a.type,
                auditDate: a.auditDate,
                overallStatus: a.overallStatus,
                findingsCount: a.findings.length,
                openFindings: a.findings.filter(f => f.status !== 'resolved').length
            })),
            generatedAt: new Date(),
            generatedBy: req.user.memberId
        };

        res.status(200).json({
            success: true,
            data: report
        });

    } catch (error) {
        console.error('Get compliance reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate compliance report'
        });
    }
};

/**
 * @desc    Export compliance data
 * @route   GET /api/system/compliance/export
 * @access  Private (requires security.compliance_view)
 */
const exportComplianceData = async (req, res) => {
    try {
        const compliance = await Compliance.findOne({ 
            organization: req.organization.id 
        })
        .populate('frameworks.assignedTo', 'personalInfo.firstName personalInfo.lastName')
        .populate('audits.createdBy', 'personalInfo.firstName personalInfo.lastName')
        .lean();

        if (!compliance) {
            return res.status(404).json({
                success: false,
                message: 'No compliance data found'
            });
        }

        // Remove sensitive or unnecessary fields
        delete compliance._id;
        delete compliance.organization;
        delete compliance.__v;

        res.status(200).json({
            success: true,
            data: compliance
        });

    } catch (error) {
        console.error('Export compliance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export compliance data'
        });
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function calculateComplianceScore(complianceId) {
    try {
        const compliance = await Compliance.findById(complianceId);
        if (!compliance) return;

        let totalScore = 0;
        let totalWeight = 0;

        // Score from frameworks
        compliance.frameworks.forEach(framework => {
            const frameworkScores = {
                'compliant': 100,
                'in_progress': 50,
                'non_compliant': 0,
                'audit_required': 25,
                'not_started': 0
            };
            totalScore += frameworkScores[framework.status] || 0;
            totalWeight++;
        });

        // Score from checklists
        compliance.checklists.forEach(checklist => {
            totalScore += checklist.overallProgress;
            totalWeight++;
        });

        // Score from audits
        compliance.audits.forEach(audit => {
            const resolvedFindings = audit.findings.filter(f => f.status === 'resolved').length;
            const totalFindings = audit.findings.length;
            if (totalFindings > 0) {
                const auditScore = (resolvedFindings / totalFindings) * 100;
                totalScore += auditScore;
                totalWeight++;
            }
        });

        compliance.overallComplianceScore = totalWeight > 0 
            ? Math.round(totalScore / totalWeight) 
            : 0;

        await compliance.save();
    } catch (error) {
        console.error('Error calculating compliance score:', error);
    }
}

module.exports = {
    // Overview
    getComplianceOverview,
    
    // Frameworks
    addFramework,
    updateFramework,
    
    // Checklists
    createChecklist,
    updateChecklistItem,
    
    // Audits
    createAudit,
    updateAuditFinding,
    
    // Reports
    getComplianceReports,
    exportComplianceData
};