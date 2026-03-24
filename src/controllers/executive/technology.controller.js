// src/controllers/executive/technology.controller.js
const TechnologyDashboard = require('../../models/executive/technologyDashboard.model');
const InnovationPipeline = require('../../models/executive/innovationPipeline.model');
const TechnicalDebt = require('../../models/executive/technicalDebt.model');
const { logExecutiveAction } = require('../../services/executive/auditHelper.service');
const mongoose = require('mongoose');

// Fix: Use correct ObjectId creation
const ObjectId = mongoose.Types.ObjectId;

/**
 * @desc    Get technology dashboard
 * @route   GET /api/executive/technology/dashboard
 * @access  Private (CTO, CEO)
 */
const getTechnologyDashboard = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { period = 'monthly' } = req.query;
        
        // Calculate date range
        const dateRange = calculateDateRange(period);
        
        // Get or generate dashboard
        let dashboard = await TechnologyDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        }).populate('createdBy', 'personalInfo firstName personalInfo lastName email');
        
        // If not found, generate new dashboard
        if (!dashboard) {
            // FIX: Get the correct user ID
            const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
            
            dashboard = await generateTechnologyDashboard(
                req.organization.id,
                dateRange,
                period,
                memberId
            );
        }
        
        // Check for technology alerts
        const alerts = await checkTechnologyAlerts(req.organization.id, dashboard);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'technology_dashboard',
            targetId: dashboard._id,
            description: `Viewed technology dashboard for ${period}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: {
                dashboard,
                alerts
            }
        });
        
    } catch (error) {
        console.error('Get technology dashboard error:', error);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'technology_dashboard',
            description: 'Failed to view technology dashboard',
            success: false,
            error
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to fetch technology dashboard'
        });
    }
};

/**
 * @desc    Get innovation pipeline
 * @route   GET /api/executive/technology/innovation
 * @access  Private (CTO)
 */
const getInnovationPipeline = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { status, category, stage, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        
        const query = { organization: req.organization.id, isActive: true };
        
        if (status) query.status = status;
        if (category) query.category = category;
        if (stage) query.stage = stage;
        
        const innovations = await InnovationPipeline.find(query)
            .sort({ submittedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('submittedBy', 'personalInfo firstName personalInfo lastName email')
            .populate('development.lead', 'personalInfo firstName personalInfo lastName email');
        
        const total = await InnovationPipeline.countDocuments(query);
        
        // FIX: Use new ObjectId() properly
        const stats = await InnovationPipeline.aggregate([
            { $match: { organization: new ObjectId(req.organization.id), isActive: true } },
            { $group: {
                _id: null,
                total: { $sum: 1 },
                submitted: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
                underReview: { $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] } },
                approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                inDevelopment: { $sum: { $cond: [{ $in: ['$status', ['in_development', 'testing']] }, 1, 0] } },
                implemented: { $sum: { $cond: [{ $eq: ['$status', 'implemented'] }, 1, 0] } }
            }}
        ]);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'innovation_pipeline',
            description: 'Viewed innovation pipeline',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            count: innovations.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            stats: stats[0] || {},
            data: innovations
        });
        
    } catch (error) {
        console.error('Get innovation pipeline error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch innovation pipeline'
        });
    }
};

/**
 * @desc    Create innovation idea
 * @route   POST /api/executive/technology/innovation
 * @access  Private (All employees with innovation permission)
 */
const createInnovationIdea = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const innovationData = req.body;
        
        // FIX: Get the correct user ID
        const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
        
        const innovation = new InnovationPipeline({
            organization: req.organization.id,
            ...innovationData,
            submittedBy: memberId,
            createdBy: memberId,
            status: 'submitted'
        });
        
        await innovation.save();
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'innovation_idea',
            targetId: innovation._id,
            targetName: innovation.title,
            changes: innovationData,
            description: `Submitted innovation idea: ${innovation.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(201).json({
            success: true,
            data: innovation,
            message: 'Innovation idea submitted successfully'
        });
        
    } catch (error) {
        console.error('Create innovation idea error:', error);
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'innovation_idea',
            description: 'Failed to submit innovation idea',
            success: false,
            error
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to submit innovation idea'
        });
    }
};

/**
 * @desc    Update innovation idea
 * @route   PUT /api/executive/technology/innovation/:id
 * @access  Private (CTO, Innovation Manager)
 */
const updateInnovationIdea = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        // FIX: Get the correct user ID
        const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
        
        const innovation = await InnovationPipeline.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!innovation) {
            return res.status(404).json({
                success: false,
                message: 'Innovation idea not found'
            });
        }
        
        // Store old values for audit
        const oldValues = {
            title: innovation.title,
            status: innovation.status,
            stage: innovation.stage
        };
        
        // Update
        Object.assign(innovation, req.body);
        innovation.updatedBy = memberId;
        
        // Recalculate ROI if needed
        if (innovation.calculateROI) innovation.calculateROI();
        
        // Update progress
        if (innovation.updateProgress) innovation.updateProgress();
        
        await innovation.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'innovation_idea',
            targetId: innovation._id,
            targetName: innovation.title,
            changes: {
                before: oldValues,
                after: {
                    title: innovation.title,
                    status: innovation.status,
                    stage: innovation.stage
                }
            },
            description: `Updated innovation idea: ${innovation.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: innovation,
            message: 'Innovation idea updated successfully'
        });
        
    } catch (error) {
        console.error('Update innovation idea error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update innovation idea'
        });
    }
};

/**
 * @desc    Review innovation idea
 * @route   POST /api/executive/technology/innovation/:id/review
 * @access  Private (CTO, Innovation Manager)
 */
const reviewInnovationIdea = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        const { decision, comments, score } = req.body;
        
        // FIX: Get the correct user ID
        const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
        
        const innovation = await InnovationPipeline.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!innovation) {
            return res.status(404).json({
                success: false,
                message: 'Innovation idea not found'
            });
        }
        
        // Add review
        innovation.reviews.push({
            reviewer: memberId,
            stage: innovation.stage,
            decision,
            comments,
            score
        });
        
        // Update status based on decision
        if (decision === 'approve') {
            innovation.status = 'approved';
            innovation.approvedAt = new Date();
        } else if (decision === 'reject') {
            innovation.status = 'rejected';
        } else if (decision === 'more_info') {
            innovation.status = 'under_review';
        }
        
        innovation.reviewedAt = new Date();
        innovation.updatedBy = memberId;
        
        await innovation.save();
        
        await logExecutiveAction({
            req,
            action: 'review',
            targetType: 'innovation_idea',
            targetId: innovation._id,
            targetName: innovation.title,
            changes: { decision },
            description: `Reviewed innovation idea: ${innovation.title} - ${decision}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: innovation,
            message: `Innovation idea ${decision} successfully`
        });
        
    } catch (error) {
        console.error('Review innovation idea error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to review innovation idea'
        });
    }
};

/**
 * @desc    Get technical debt
 * @route   GET /api/executive/technology/technical-debt
 * @access  Private (CTO, Tech Leads)
 */
const getTechnicalDebt = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { severity, category, status, system, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        
        const query = { organization: req.organization.id, isActive: true };
        
        if (severity) query.severity = severity;
        if (category) query.category = category;
        if (status) query.status = status;
        if (system) query.system = system;
        
        const debts = await TechnicalDebt.find(query)
            .sort({ severity: -1, identifiedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('owner', 'personalInfo firstName personalInfo lastName email')
            .populate('identifiedBy', 'personalInfo firstName personalInfo lastName email');
        
        const total = await TechnicalDebt.countDocuments(query);
        
        // FIX: Use new ObjectId() properly
        const stats = await TechnicalDebt.aggregate([
            { $match: { organization: new ObjectId(req.organization.id), isActive: true } },
            { $group: {
                _id: null,
                total: { $sum: 1 },
                critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
                high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
                medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
                low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
                totalEffort: { $sum: '$effort.estimated.hours' },
                totalInterest: { $sum: '$interest.accrued' }
            }}
        ]);
        
        // Get debt by category
        const byCategory = await TechnicalDebt.getDebtByCategory(req.organization.id);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'technical_debt',
            description: 'Viewed technical debt',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            count: debts.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            stats: stats[0] || {},
            byCategory,
            data: debts
        });
        
    } catch (error) {
        console.error('Get technical debt error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch technical debt'
        });
    }
};

/**
 * @desc    Create technical debt entry
 * @route   POST /api/executive/technology/technical-debt
 * @access  Private (Tech Leads, Architects)
 */
const createTechnicalDebt = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const debtData = req.body;
        
        // FIX: Get the correct user ID
        const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
        
        const debt = new TechnicalDebt({
            organization: req.organization.id,
            ...debtData,
            identifiedBy: memberId,
            createdBy: memberId
        });
        
        // Calculate initial interest
        if (debt.calculateInterest) debt.calculateInterest();
        
        await debt.save();
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'technical_debt',
            targetId: debt._id,
            targetName: debt.title,
            changes: debtData,
            description: `Created technical debt entry: ${debt.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(201).json({
            success: true,
            data: debt,
            message: 'Technical debt entry created successfully'
        });
        
    } catch (error) {
        console.error('Create technical debt error:', error);
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'technical_debt',
            description: 'Failed to create technical debt entry',
            success: false,
            error
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create technical debt entry'
        });
    }
};

/**
 * @desc    Update technical debt
 * @route   PUT /api/executive/technology/technical-debt/:id
 * @access  Private (Tech Leads, Architects)
 */
const updateTechnicalDebt = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        // FIX: Get the correct user ID
        const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
        
        const debt = await TechnicalDebt.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!debt) {
            return res.status(404).json({
                success: false,
                message: 'Technical debt entry not found'
            });
        }
        
        // Store old values
        const oldValues = {
            severity: debt.severity,
            status: debt.status,
            effort: debt.effort?.estimated
        };
        
        // Update
        Object.assign(debt, req.body);
        debt.updatedBy = memberId;
        
        // Add to history
        debt.history.push({
            status: debt.status,
            changedBy: memberId,
            changedAt: new Date(),
            notes: req.body.notes || 'Updated'
        });
        
        // Recalculate interest
        if (debt.calculateInterest) debt.calculateInterest();
        
        await debt.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'technical_debt',
            targetId: debt._id,
            targetName: debt.title,
            changes: {
                before: oldValues,
                after: {
                    severity: debt.severity,
                    status: debt.status
                }
            },
            description: `Updated technical debt: ${debt.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: debt,
            message: 'Technical debt updated successfully'
        });
        
    } catch (error) {
        console.error('Update technical debt error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update technical debt'
        });
    }
};

/**
 * @desc    Resolve technical debt
 * @route   POST /api/executive/technology/technical-debt/:id/resolve
 * @access  Private (Tech Leads, Architects)
 */
const resolveTechnicalDebt = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        const { notes } = req.body;
        
        // FIX: Get the correct user ID
        const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
        
        const debt = await TechnicalDebt.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!debt) {
            return res.status(404).json({
                success: false,
                message: 'Technical debt entry not found'
            });
        }
        
        await debt.resolve(memberId, notes);
        
        await logExecutiveAction({
            req,
            action: 'resolve',
            targetType: 'technical_debt',
            targetId: debt._id,
            targetName: debt.title,
            description: `Resolved technical debt: ${debt.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            message: 'Technical debt resolved successfully'
        });
        
    } catch (error) {
        console.error('Resolve technical debt error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resolve technical debt'
        });
    }
};

/**
 * @desc    Get product roadmap
 * @route   GET /api/executive/technology/roadmap
 * @access  Private (CTO, Product Managers)
 */
const getProductRoadmap = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { horizon = '12months' } = req.query;
        
        const dashboard = await TechnologyDashboard.findOne({
            organization: req.organization.id
        }).sort({ 'period.end': -1 });
        
        const roadmap = dashboard ? dashboard.productDevelopment.roadmap : [];
        
        // Filter by timeline
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() + parseInt(horizon));
        
        const filteredRoadmap = roadmap.filter(item => 
            new Date(item.plannedDate) <= cutoffDate
        );
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'product_roadmap',
            description: 'Viewed product roadmap',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: filteredRoadmap
        });
        
    } catch (error) {
        console.error('Get product roadmap error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product roadmap'
        });
    }
};

/**
 * @desc    Get system performance
 * @route   GET /api/executive/technology/performance
 * @access  Private (CTO, DevOps)
 */
const getSystemPerformance = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { system } = req.query;
        
        const dashboard = await TechnologyDashboard.findOne({
            organization: req.organization.id
        }).sort({ 'period.end': -1 });
        
        let performance = dashboard ? dashboard.systemPerformance : {};
        
        // Filter by system if specified
        if (system && performance.bySystem) {
            performance = performance.bySystem.find(s => s.name === system) || performance;
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'system_performance',
            description: 'Viewed system performance',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: performance
        });
        
    } catch (error) {
        console.error('Get system performance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system performance'
        });
    }
};

/**
 * @desc    Get architecture governance
 * @route   GET /api/executive/technology/architecture
 * @access  Private (CTO, Architects)
 */
const getArchitectureGovernance = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const dashboard = await TechnologyDashboard.findOne({
            organization: req.organization.id
        }).sort({ 'period.end': -1 });
        
        const architecture = dashboard ? dashboard.architecture : {};
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'architecture_governance',
            description: 'Viewed architecture governance',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: architecture
        });
        
    } catch (error) {
        console.error('Get architecture governance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch architecture governance'
        });
    }
};

/**
 * @desc    Get cloud infrastructure metrics
 * @route   GET /api/executive/technology/cloud
 * @access  Private (CTO, DevOps)
 */
const getCloudMetrics = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const dashboard = await TechnologyDashboard.findOne({
            organization: req.organization.id
        }).sort({ 'period.end': -1 });
        
        const cloud = dashboard ? dashboard.cloud : {};
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'cloud_metrics',
            description: 'Viewed cloud infrastructure metrics',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: cloud
        });
        
    } catch (error) {
        console.error('Get cloud metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cloud metrics'
        });
    }
};

/**
 * @desc    Get DevOps metrics
 * @route   GET /api/executive/technology/devops
 * @access  Private (CTO, DevOps)
 */
const getDevOpsMetrics = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const dashboard = await TechnologyDashboard.findOne({
            organization: req.organization.id
        }).sort({ 'period.end': -1 });
        
        const devops = dashboard ? dashboard.devops : {};
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'devops_metrics',
            description: 'Viewed DevOps metrics',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: devops
        });
        
    } catch (error) {
        console.error('Get DevOps metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch DevOps metrics'
        });
    }
};

/**
 * @desc    Acknowledge technology alert
 * @route   PUT /api/executive/technology/alerts/:alertId/acknowledge
 * @access  Private (CTO)
 */
const acknowledgeTechnologyAlert = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { alertId } = req.params;
        
        // FIX: Get the correct user ID
        const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
        
        const dateRange = calculateDateRange('daily');
        
        const dashboard = await TechnologyDashboard.findOne({
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
            targetType: 'technology_alert',
            targetId: alertId,
            description: `Acknowledged technology alert: ${alert.message}`,
            metadata: { responseTime: Date.now() - startTime }
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

// ==================== HELPER FUNCTIONS ====================

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

async function generateTechnologyDashboard(organizationId, dateRange, period, memberId) {
    const dashboard = new TechnologyDashboard({
        organization: organizationId,
        name: `Technology Dashboard - ${period}`,
        period: dateRange,
        strategy: {
            vision: "Lead through technological innovation",
            mission: "Build scalable, secure, and innovative solutions",
            strategicPillars: [
                { name: "Digital Transformation", progress: 65, status: "on_track" },
                { name: "Innovation Excellence", progress: 45, status: "at_risk" },
                { name: "Technical Excellence", progress: 70, status: "on_track" }
            ],
            objectives: [
                { name: "Increase R&D investment by 20%", progress: 60, deadline: new Date(2024, 11, 31) },
                { name: "Launch 3 new products", progress: 33, deadline: new Date(2024, 5, 30) }
            ],
            budget: {
                allocated: 5000000,
                spent: 3200000,
                variance: 1800000,
                roi: 15.5
            }
        },
        innovation: {
            ideas: {
                total: 45,
                submitted: 12,
                underReview: 8,
                approved: 15,
                implemented: 10,
                rejected: 5
            },
            byCategory: [
                { category: "Product", count: 20, value: 1500000 },
                { category: "Process", count: 15, value: 800000 },
                { category: "Technology", count: 10, value: 2000000 }
            ],
            metrics: {
                submissionRate: 8,
                approvalRate: 33,
                implementationRate: 22,
                averageTimeToApprove: 14,
                averageTimeToImplement: 90,
                innovationScore: 75
            }
        },
        rAndD: {
            projects: {
                total: 15,
                active: 8,
                completed: 4,
                onHold: 2,
                cancelled: 1
            },
            byStage: [
                { stage: "research", count: 3, value: 500000 },
                { stage: "development", count: 5, value: 2000000 },
                { stage: "testing", count: 2, value: 800000 }
            ],
            investment: {
                total: 3800000,
                byQuarter: [
                    { quarter: "Q1", amount: 900000 },
                    { quarter: "Q2", amount: 950000 },
                    { quarter: "Q3", amount: 1000000 },
                    { quarter: "Q4", amount: 950000 }
                ]
            },
            metrics: {
                timeToMarket: 12,
                successRate: 75,
                innovationIndex: 80,
                patentFilingRate: 5
            }
        },
        productDevelopment: {
            products: {
                total: 8,
                inDevelopment: 4,
                inTesting: 2,
                launched: 2,
                deprecated: 0
            },
            roadmap: [
                {
                    product: "Product A",
                    version: "2.0",
                    features: ["Feature 1", "Feature 2"],
                    plannedDate: new Date(2024, 5, 30),
                    status: "in_progress",
                    progress: 60
                },
                {
                    product: "Product B",
                    version: "1.0",
                    features: ["Feature A", "Feature B"],
                    plannedDate: new Date(2024, 8, 30),
                    status: "planned",
                    progress: 0
                }
            ],
            metrics: {
                velocity: 85,
                cycleTime: 14,
                deploymentFrequency: 10,
                changeFailureRate: 5,
                meanTimeToRecovery: 2
            }
        },
        technicalDebt: {
            total: {
                estimated: 5000,
                critical: 5,
                high: 10,
                medium: 20,
                low: 15
            },
            metrics: {
                debtRatio: 15,
                interestAccrued: 25000,
                remediationProgress: 25,
                timeToFix: 30
            }
        },
        architecture: {
            metrics: {
                standardizationRate: 75,
                complianceScore: 85,
                architectureQuality: 80,
                technicalFit: 85
            }
        },
        systemPerformance: {
            overall: {
                availability: 99.5,
                performance: 92,
                reliability: 95,
                scalability: 85
            }
        },
        security: {
            posture: {
                score: 85,
                level: "good"
            },
            vulnerabilities: {
                total: 15,
                critical: 1,
                high: 3,
                medium: 5,
                low: 6
            },
            incidents: {
                total: 3,
                resolved: 3,
                open: 0,
                meanTimeToDetect: 4,
                meanTimeToResolve: 24
            },
            compliance: {
                score: 90,
                gaps: ["Documentation", "Training"]
            }
        },
        cloud: {
            providers: [
                {
                    name: "AWS",
                    cost: {
                        monthly: 50000,
                        trend: "up",
                        forecast: 55000
                    }
                }
            ],
            cost: {
                total: 50000,
                byService: [
                    { service: "Compute", cost: 25000, trend: "up" },
                    { service: "Storage", cost: 15000, trend: "stable" },
                    { service: "Network", cost: 10000, trend: "down" }
                ]
            },
            resources: {
                total: 100,
                utilized: 75,
                idle: 15,
                efficiency: 75
            }
        },
        devops: {
            metrics: {
                deploymentFrequency: 10,
                leadTimeForChanges: 2,
                timeToRestore: 4,
                changeFailureRate: 5,
                availability: 99.5
            }
        },
        innovationMetrics: {
            ideaVelocity: 8,
            conceptToLaunch: 180,
            innovationROI: 150,
            patentCount: 5
        },
        createdBy: memberId
    });
    
    // Add sample alerts
    dashboard.alerts.push({
        type: 'debt',
        severity: 'warning',
        message: 'Critical technical debt detected in core system',
        metric: 'critical_debt',
        value: 5,
        threshold: 3,
        timestamp: new Date()
    });
    
    dashboard.alerts.push({
        type: 'performance',
        severity: 'info',
        message: 'API response time increased by 15%',
        metric: 'response_time',
        value: 250,
        threshold: 200,
        timestamp: new Date()
    });
    
    await dashboard.save();
    return dashboard;
}

async function checkTechnologyAlerts(organizationId, dashboard) {
    const alerts = [];
    
    // Check technical debt
    if (dashboard.technicalDebt?.total?.critical > 3) {
        alerts.push({
            type: 'debt',
            severity: 'critical',
            message: 'High number of critical technical debt items',
            metric: 'critical_debt',
            value: dashboard.technicalDebt.total.critical,
            threshold: 3
        });
    }
    
    // Check security vulnerabilities
    if (dashboard.security?.vulnerabilities?.critical > 0) {
        alerts.push({
            type: 'security',
            severity: 'critical',
            message: 'Critical security vulnerabilities exist',
            metric: 'vulnerabilities',
            value: dashboard.security.vulnerabilities.critical,
            threshold: 0
        });
    }
    
    // Check system performance
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
    
    // Check innovation pipeline
    if (dashboard.innovation?.metrics?.innovationScore < 70) {
        alerts.push({
            type: 'innovation',
            severity: 'warning',
            message: 'Innovation score declining',
            metric: 'innovation_score',
            value: dashboard.innovation.metrics.innovationScore,
            threshold: 70
        });
    }
    
    // Update dashboard with new alerts
    if (alerts.length > 0) {
        dashboard.alerts = [...alerts, ...(dashboard.alerts || [])].slice(0, 50);
        await dashboard.save();
    }
    
    return alerts;
}

module.exports = {
    getTechnologyDashboard,
    getInnovationPipeline,
    createInnovationIdea,
    updateInnovationIdea,
    reviewInnovationIdea,
    getTechnicalDebt,
    createTechnicalDebt,
    updateTechnicalDebt,
    resolveTechnicalDebt,
    getProductRoadmap,
    getSystemPerformance,
    getArchitectureGovernance,
    getCloudMetrics,
    getDevOpsMetrics,
    acknowledgeTechnologyAlert
};