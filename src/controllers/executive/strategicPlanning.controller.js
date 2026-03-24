// src/controllers/executive/strategicPlanning.controller.js
const StrategicPlan = require('../../models/executive/strategicPlan.model');
const StrategicObjective = require('../../models/executive/strategicObjective.model');
const StrategicInitiative = require('../../models/executive/strategicInitiative.model');
const MarketIntelligence = require('../../models/executive/marketIntelligence.model');
const { logExecutiveAction } = require('../../services/executive/auditHelper.service');
const mongoose = require('mongoose');

/**
 * @desc    Get current strategic plan
 * @route   GET /api/executive/planning/current-plan
 * @access  Private (Strategy Director, CEO, Board)
 */
const getCurrentStrategicPlan = async (req, res) => {
    const startTime = Date.now();
    
    try {
        let plan = await StrategicPlan.findOne({
            organization: req.organization.id,
            'period.isCurrent': true,
            isActive: true
        })
        .populate('createdBy', 'personalInfo firstName personalInfo lastName email')
        .populate('objectives')
        .populate('initiatives')
        .populate('okrs.owner', 'personalInfo firstName personalInfo lastName email')
        .populate('kpis.owner', 'personalInfo firstName personalInfo lastName email');
        
        // If no current plan, get the most recent
        if (!plan) {
            plan = await StrategicPlan.findOne({
                organization: req.organization.id,
                isActive: true
            })
            .sort({ 'period.startYear': -1 })
            .populate('createdBy', 'personalInfo firstName personalInfo lastName email')
            .populate('objectives')
            .populate('initiatives')
            .populate('okrs.owner', 'personalInfo firstName personalInfo lastName email')
            .populate('kpis.owner', 'personalInfo firstName personalInfo lastName email');
        }
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'No strategic plan found'
            });
        }
        
        // Calculate overall progress
        await plan.calculateOverallProgress();
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'strategic_plan',
            targetId: plan._id,
            targetName: plan.name,
            description: `Viewed current strategic plan: ${plan.name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: plan
        });
        
    } catch (error) {
        console.error('Get current strategic plan error:', error);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'strategic_plan',
            description: 'Failed to view current strategic plan',
            success: false,
            error
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to fetch current strategic plan'
        });
    }
};

/**
 * @desc    Get strategic plan by ID
 * @route   GET /api/executive/planning/plans/:id
 * @access  Private (Strategy Director, CEO)
 */
const getStrategicPlanById = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        const plan = await StrategicPlan.findOne({
            _id: id,
            organization: req.organization.id,
            isActive: true
        })
        .populate('createdBy', 'personalInfo firstName personalInfo lastName email')
        .populate('objectives')
        .populate('initiatives')
        .populate('okrs.owner', 'personalInfo firstName personalInfo lastName email')
        .populate('kpis.owner', 'personalInfo firstName personalInfo lastName email');
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Strategic plan not found'
            });
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'strategic_plan',
            targetId: plan._id,
            targetName: plan.name,
            description: `Viewed strategic plan: ${plan.name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: plan
        });
        
    } catch (error) {
        console.error('Get strategic plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch strategic plan'
        });
    }
};

/**
 * @desc    Create new strategic plan
 * @route   POST /api/executive/planning/plans
 * @access  Private (Strategy Director, CEO)
 */
const createStrategicPlan = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const planData = req.body;
        
        // FIX: Get user ID properly (same pattern as dashboard controller)
        let userId = req.member?._id || req.user?.memberId || req.user?._id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Unable to determine user ID. Please ensure you are logged in.'
            });
        }
        
        // Check if plan with same period exists
        const existingPlan = await StrategicPlan.findOne({
            organization: req.organization.id,
            'period.startYear': planData.period.startYear,
            'period.endYear': planData.period.endYear
        });
        
        if (existingPlan) {
            return res.status(400).json({
                success: false,
                message: 'A plan for this period already exists'
            });
        }
        
        const plan = new StrategicPlan({
            organization: req.organization.id,
            ...planData,
            createdBy: userId,  // Use userId instead of req.member._id
            'review.status': 'draft'
        });
        
        await plan.save();
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'strategic_plan',
            targetId: plan._id,
            targetName: plan.name,
            changes: planData,
            description: `Created strategic plan: ${plan.name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(201).json({
            success: true,
            data: plan,
            message: 'Strategic plan created successfully'
        });
        
    } catch (error) {
        console.error('Create strategic plan error:', error);
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'strategic_plan',
            description: 'Failed to create strategic plan',
            success: false,
            error
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create strategic plan',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Update strategic plan
 * @route   PUT /api/executive/planning/plans/:id
 * @access  Private (Strategy Director, CEO)
 */
const updateStrategicPlan = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        const plan = await StrategicPlan.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Strategic plan not found'
            });
        }
        
        // FIX: Get user ID properly
        let userId = req.member?._id || req.user?.memberId || req.user?._id;
        
        // Store old values for audit
        const oldValues = {
            name: plan.name,
            status: plan.review.status,
            isCurrent: plan.period.isCurrent
        };
        
        // Update
        Object.assign(plan, req.body);
        if (userId) plan.updatedBy = userId;
        
        await plan.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'strategic_plan',
            targetId: plan._id,
            targetName: plan.name,
            changes: {
                before: oldValues,
                after: {
                    name: plan.name,
                    status: plan.review.status,
                    isCurrent: plan.period.isCurrent
                }
            },
            description: `Updated strategic plan: ${plan.name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: plan,
            message: 'Strategic plan updated successfully'
        });
        
    } catch (error) {
        console.error('Update strategic plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update strategic plan'
        });
    }
};

/**
 * @desc    Set plan as current
 * @route   POST /api/executive/planning/plans/:id/set-current
 * @access  Private (Strategy Director, CEO, Board)
 */
const setCurrentPlan = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        const plan = await StrategicPlan.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Strategic plan not found'
            });
        }
        
        await plan.setCurrent();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'strategic_plan',
            targetId: plan._id,
            targetName: plan.name,
            description: `Set ${plan.name} as current strategic plan`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            message: 'Plan set as current successfully'
        });
        
    } catch (error) {
        console.error('Set current plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set plan as current'
        });
    }
};

/**
 * @desc    Get strategic objectives
 * @route   GET /api/executive/planning/objectives
 * @access  Private (Strategy Director, CEO)
 */
const getStrategicObjectives = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { status, category, owner, planId, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        
        const query = { organization: req.organization.id, isActive: true };
        
        if (status) query.status = status;
        if (category) query.category = category;
        if (owner) query.owner = owner;
        if (planId) query.strategicPlan = planId;
        
        const objectives = await StrategicObjective.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('owner', 'personalInfo firstName personalInfo lastName email')
            .populate('strategicPlan', 'name period')
            .populate('keyResults.owner', 'personalInfo firstName personalInfo lastName email');
        
        const total = await StrategicObjective.countDocuments(query);
        
        // FIX: Use 'new' keyword with ObjectId
        const stats = await StrategicObjective.aggregate([
            { $match: { organization: new mongoose.Types.ObjectId(req.organization.id), isActive: true } },
            { $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                atRisk: { $sum: { $cond: [{ $eq: ['$status', 'at_risk'] }, 1, 0] } },
                behind: { $sum: { $cond: [{ $eq: ['$status', 'behind'] }, 1, 0] } },
                avgProgress: { $avg: '$progress.overall' }
            }}
        ]);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'strategic_objectives',
            description: 'Viewed strategic objectives',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            count: objectives.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            stats: stats[0] || {},
            data: objectives
        });
        
    } catch (error) {
        console.error('Get strategic objectives error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch strategic objectives'
        });
    }
};

/**
 * @desc    Create strategic objective
 * @route   POST /api/executive/planning/objectives
 * @access  Private (Strategy Director)
 */
const createStrategicObjective = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const objectiveData = req.body;
        
        // FIX: Get user ID properly
        let userId = req.member?._id || req.user?.memberId || req.user?._id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Unable to determine user ID'
            });
        }
        
        const objective = new StrategicObjective({
            organization: req.organization.id,
            ...objectiveData,
            createdBy: userId,  // Use userId instead of req.member._id
            status: 'draft'
        });
        
        await objective.save();
        
        // Link to strategic plan if provided
        if (objectiveData.strategicPlan) {
            await StrategicPlan.findByIdAndUpdate(
                objectiveData.strategicPlan,
                { $push: { objectives: objective._id } }
            );
        }
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'strategic_objective',
            targetId: objective._id,
            targetName: objective.name,
            changes: objectiveData,
            description: `Created strategic objective: ${objective.name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(201).json({
            success: true,
            data: objective,
            message: 'Strategic objective created successfully'
        });
        
    } catch (error) {
        console.error('Create strategic objective error:', error);
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'strategic_objective',
            description: 'Failed to create strategic objective',
            success: false,
            error
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create strategic objective'
        });
    }
};

/**
 * @desc    Update strategic objective
 * @route   PUT /api/executive/planning/objectives/:id
 * @access  Private (Strategy Director)
 */
const updateStrategicObjective = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        const objective = await StrategicObjective.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!objective) {
            return res.status(404).json({
                success: false,
                message: 'Strategic objective not found'
            });
        }
        
        // FIX: Get user ID properly
        let userId = req.member?._id || req.user?.memberId || req.user?._id;
        
        // Store old values
        const oldValues = {
            name: objective.name,
            status: objective.status,
            progress: objective.progress.overall
        };
        
        // Update
        Object.assign(objective, req.body);
        if (userId) objective.updatedBy = userId;
        
        // Recalculate progress if key results were updated
        await objective.calculateProgress();
        
        await objective.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'strategic_objective',
            targetId: objective._id,
            targetName: objective.name,
            changes: {
                before: oldValues,
                after: {
                    name: objective.name,
                    status: objective.status,
                    progress: objective.progress.overall
                }
            },
            description: `Updated strategic objective: ${objective.name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: objective,
            message: 'Strategic objective updated successfully'
        });
        
    } catch (error) {
        console.error('Update strategic objective error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update strategic objective'
        });
    }
};

/**
 * @desc    Update key result
 * @route   PUT /api/executive/planning/objectives/:objectiveId/key-results/:keyResultId
 * @access  Private (Strategy Director, Objective Owner)
 */
const updateKeyResult = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { objectiveId, keyResultId } = req.params;
        const { value, note } = req.body;
        
        const objective = await StrategicObjective.findOne({
            _id: objectiveId,
            organization: req.organization.id
        });
        
        if (!objective) {
            return res.status(404).json({
                success: false,
                message: 'Strategic objective not found'
            });
        }
        
        // FIX: Get user ID properly
        let userId = req.member?._id || req.user?.memberId || req.user?._id;
        
        await objective.updateKeyResult(keyResultId, value, note, userId);
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'key_result',
            targetId: keyResultId,
            description: `Updated key result for objective: ${objective.name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: objective,
            message: 'Key result updated successfully'
        });
        
    } catch (error) {
        console.error('Update key result error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update key result'
        });
    }
};

/**
 * @desc    Get strategic initiatives
 * @route   GET /api/executive/planning/initiatives
 * @access  Private (Strategy Director, CEO)
 */
const getStrategicInitiatives = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { status, priority, objectiveId, planId, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        
        const query = { organization: req.organization.id, isActive: true };
        
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (objectiveId) query.objective = objectiveId;
        if (planId) query.strategicPlan = planId;
        
        const initiatives = await StrategicInitiative.find(query)
            .sort({ priority: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('stakeholders.sponsor', 'personalInfo firstName personalInfo lastName email')
            .populate('stakeholders.programManager', 'personalInfo firstName personalInfo lastName email')
            .populate('stakeholders.projectManager', 'personalInfo firstName personalInfo lastName email')
            .populate('objective', 'name')
            .populate('strategicPlan', 'name');
        
        const total = await StrategicInitiative.countDocuments(query);
        
        // Get summary statistics
        const stats = await StrategicInitiative.aggregate([
            { $match: { organization: new mongoose.Types.ObjectId(req.organization.id), isActive: true } },
            { $group: {
                _id: null,
                total: { $sum: 1 },
                totalBudget: { $sum: '$budget.allocated.total' },
                totalSpent: { $sum: '$budget.spent.total' },
                inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                atRisk: { $sum: { $cond: [{ $eq: ['$health.overall', 'red'] }, 1, 0] } }
            }}
        ]);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'strategic_initiatives',
            description: 'Viewed strategic initiatives',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            count: initiatives.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            stats: stats[0] || {},
            data: initiatives
        });
        
    } catch (error) {
        console.error('Get strategic initiatives error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch strategic initiatives'
        });
    }
};

/**
 * @desc    Create strategic initiative
 * @route   POST /api/executive/planning/initiatives
 * @access  Private (Strategy Director)
 */
const createStrategicInitiative = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const initiativeData = req.body;
        
        // FIX: Get user ID properly
        let userId = req.member?._id || req.user?.memberId || req.user?._id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Unable to determine user ID'
            });
        }
        
        const initiative = new StrategicInitiative({
            organization: req.organization.id,
            ...initiativeData,
            createdBy: userId,  // Use userId instead of req.member._id
            status: 'proposed',
            health: {
                overall: 'green',
                schedule: 'green',
                budget: 'green',
                scope: 'green',
                risks: 'green'
            }
        });
        
        await initiative.save();
        
        // Link to strategic plan and objective
        if (initiativeData.strategicPlan) {
            await StrategicPlan.findByIdAndUpdate(
                initiativeData.strategicPlan,
                { $push: { initiatives: initiative._id } }
            );
        }
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'strategic_initiative',
            targetId: initiative._id,
            targetName: initiative.name,
            changes: initiativeData,
            description: `Created strategic initiative: ${initiative.name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(201).json({
            success: true,
            data: initiative,
            message: 'Strategic initiative created successfully'
        });
        
    } catch (error) {
        console.error('Create strategic initiative error:', error);
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'strategic_initiative',
            description: 'Failed to create strategic initiative',
            success: false,
            error
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create strategic initiative'
        });
    }
};

/**
 * @desc    Update strategic initiative
 * @route   PUT /api/executive/planning/initiatives/:id
 * @access  Private (Strategy Director)
 */
const updateStrategicInitiative = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        const initiative = await StrategicInitiative.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!initiative) {
            return res.status(404).json({
                success: false,
                message: 'Strategic initiative not found'
            });
        }
        
        // FIX: Get user ID properly
        let userId = req.member?._id || req.user?.memberId || req.user?._id;
        
        // Store old values for audit
        const oldValues = {
            name: initiative.name,
            status: initiative.status,
            progress: initiative.progress.overall
        };
        
        // Update fields that are provided
        if (req.body.name) initiative.name = req.body.name;
        if (req.body.description) initiative.description = req.body.description;
        if (req.body.category) initiative.category = req.body.category;
        if (req.body.priority) initiative.priority = req.body.priority;
        if (req.body.status) initiative.status = req.body.status;
        
        // Update progress if provided
        if (req.body.progress && req.body.progress.overall !== undefined) {
            initiative.progress.overall = req.body.progress.overall;
        }
        
        // Update health if provided
        if (req.body.health) {
            initiative.health = {
                ...initiative.health,
                ...req.body.health
            };
        }
        
        // Update timeline if provided
        if (req.body.timeline) {
            initiative.timeline = {
                ...initiative.timeline,
                ...req.body.timeline
            };
        }
        
        // Update budget if provided
        if (req.body.budget) {
            initiative.budget = {
                ...initiative.budget,
                ...req.body.budget
            };
        }
        
        if (userId) initiative.updatedBy = userId;
        
        // Recalculate progress
        await initiative.calculateProgress();
        
        await initiative.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'strategic_initiative',
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
            description: `Updated strategic initiative: ${initiative.name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: initiative,
            message: 'Strategic initiative updated successfully'
        });
        
    } catch (error) {
        console.error('Update strategic initiative error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update strategic initiative',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Add initiative update
 * @route   POST /api/executive/planning/initiatives/:id/updates
 * @access  Private (Initiative Team)
 */
const addInitiativeUpdate = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const initiative = await StrategicInitiative.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!initiative) {
            return res.status(404).json({
                success: false,
                message: 'Strategic initiative not found'
            });
        }
        
        // FIX: Get user ID properly
        let userId = req.member?._id || req.user?.memberId || req.user?._id;
        
        await initiative.addUpdate(updateData, userId);
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'initiative_update',
            targetId: initiative._id,
            targetName: initiative.name,
            description: `Added update to initiative: ${initiative.name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: initiative,
            message: 'Initiative update added successfully'
        });
        
    } catch (error) {
        console.error('Add initiative update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add initiative update'
        });
    }
};

/**
 * @desc    Get market intelligence
 * @route   GET /api/executive/planning/market-intelligence
 * @access  Private (Strategy Director, CEO)
 */
const getMarketIntelligence = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { sector, region } = req.query;
        
        const query = { organization: req.organization.id, isActive: true };
        
        if (sector) query['market.sector'] = sector;
        if (region) query['market.region'] = region;
        
        let intelligence = await MarketIntelligence.findOne(query)
            .sort({ updatedAt: -1 });
        
        if (!intelligence) {
            // FIX: Get user ID properly
            let userId = req.member?._id || req.user?.memberId || req.user?._id;
            
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Unable to determine user ID'
                });
            }
            
            // Create default market intelligence
            intelligence = await createDefaultMarketIntelligence(req.organization.id, userId);
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'market_intelligence',
            targetId: intelligence._id,
            description: 'Viewed market intelligence',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: intelligence
        });
        
    } catch (error) {
        console.error('Get market intelligence error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch market intelligence'
        });
    }
};

/**
 * @desc    Update market intelligence
 * @route   PUT /api/executive/planning/market-intelligence
 * @access  Private (Strategy Director)
 */
const updateMarketIntelligence = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const intelligenceData = req.body;
        
        // FIX: Get user ID properly
        let userId = req.member?._id || req.user?.memberId || req.user?._id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Unable to determine user ID'
            });
        }
        
        let intelligence = await MarketIntelligence.findOne({
            organization: req.organization.id
        });
        
        if (intelligence) {
            // Update existing
            Object.assign(intelligence, intelligenceData);
            intelligence.updatedBy = userId;
            intelligence.lastUpdated = new Date();
        } else {
            // Create new
            intelligence = new MarketIntelligence({
                organization: req.organization.id,
                ...intelligenceData,
                createdBy: userId,
                updatedBy: userId,
                lastUpdated: new Date()
            });
        }
        
        await intelligence.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'market_intelligence',
            targetId: intelligence._id,
            description: 'Updated market intelligence',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: intelligence,
            message: 'Market intelligence updated successfully'
        });
        
    } catch (error) {
        console.error('Update market intelligence error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update market intelligence'
        });
    }
};

/**
 * @desc    Run scenario analysis
 * @route   POST /api/executive/planning/scenarios
 * @access  Private (Strategy Director, CEO)
 */
const runScenarioAnalysis = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { name, description, type, assumptions } = req.body;
        
        // FIX: Get user ID properly
        let userId = req.member?._id || req.user?.memberId || req.user?._id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Unable to determine user ID'
            });
        }
        
        // Get current strategic plan
        const plan = await StrategicPlan.findOne({
            organization: req.organization.id,
            'period.isCurrent': true
        });
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'No current strategic plan found'
            });
        }
        
        // Run scenario calculations
        const scenario = await calculateScenario(plan, assumptions);
        
        // Add scenario to plan
        plan.scenarios.push({
            name,
            description,
            type,
            assumptions,
            financialImpact: scenario.financialImpact,
            operationalImpact: scenario.operationalImpact,
            marketImpact: scenario.marketImpact,
            risks: scenario.risks,
            probability: scenario.probability,
            createdAt: new Date(),
            createdBy: userId  // Use userId instead of req.member._id
        });
        
        await plan.save();
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'scenario_analysis',
            targetId: plan._id,
            description: `Ran scenario analysis: ${name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(201).json({
            success: true,
            data: scenario,
            message: 'Scenario analysis completed successfully'
        });
        
    } catch (error) {
        console.error('Run scenario analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to run scenario analysis'
        });
    }
};

/**
 * @desc    Get OKR dashboard
 * @route   GET /api/executive/planning/okrs
 * @access  Private (Strategy Director, CEO, All Executives)
 */
const getOKRDashboard = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { quarter, year, status } = req.query;
        
        // Get current strategic plan
        const plan = await StrategicPlan.findOne({
            organization: req.organization.id,
            'period.isCurrent': true,
            isActive: true
        });
        
        if (!plan) {
            return res.status(200).json({
                success: true,
                data: {
                    stats: {
                        total: 0,
                        onTrack: 0,
                        atRisk: 0,
                        behind: 0,
                        completed: 0,
                        averageProgress: 0
                    },
                    okrs: []
                }
            });
        }
        
        // Filter OKRs by quarter and year if provided
        let okrs = plan.okrs || [];
        
        console.log('Filtering OKRs - Original count:', okrs.length);
        console.log('Filters - quarter:', quarter, 'year:', year);
        
        // Apply year filter
        if (year !== undefined && year !== null && year !== '') {
            const yearNum = parseInt(year);
            if (!isNaN(yearNum)) {
                okrs = okrs.filter(okr => okr.year === yearNum);
                console.log('After year filter:', okrs.length);
            }
        }
        
        // Apply quarter filter
        if (quarter !== undefined && quarter !== null && quarter !== '') {
            const quarterNum = parseInt(quarter);
            if (!isNaN(quarterNum)) {
                okrs = okrs.filter(okr => okr.quarter === quarterNum);
                console.log('After quarter filter:', okrs.length);
            }
        }
        
        // Apply status filter
        if (status) {
            okrs = okrs.filter(okr => okr.status === status);
            console.log('After status filter:', okrs.length);
        }
        
        // Calculate stats
        const okrStats = {
            total: okrs.length,
            onTrack: okrs.filter(o => o.status === 'on_track').length,
            atRisk: okrs.filter(o => o.status === 'at_risk').length,
            behind: okrs.filter(o => o.status === 'behind').length,
            completed: okrs.filter(o => o.status === 'completed').length,
            averageProgress: 0
        };
        
        if (okrs.length > 0) {
            const totalProgress = okrs.reduce((sum, okr) => sum + (okr.progress || 0), 0);
            okrStats.averageProgress = Math.round(totalProgress / okrs.length);
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'okr_dashboard',
            description: 'Viewed OKR dashboard',
            metadata: { 
                responseTime: Date.now() - startTime,
                filters: { quarter, year, status },
                count: okrs.length
            }
        });
        
        res.status(200).json({
            success: true,
            data: {
                stats: okrStats,
                okrs
            }
        });
        
    } catch (error) {
        console.error('Get OKR dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch OKR dashboard'
        });
    }
};

/**
 * @desc    Create a new OKR
 * @route   POST /api/executive/planning/okrs
 * @access  Private (Strategy Director, CEO)
 */
const createOKR = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { objective, description, owner, quarter, year, keyResults } = req.body;
        
        let userId = req.member?._id || req.user?.memberId || req.user?._id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Unable to determine user ID'
            });
        }
        
        const plan = await StrategicPlan.findOne({
            organization: req.organization.id,
            'period.isCurrent': true,
            isActive: true
        });
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'No active strategic plan found. Please create a strategic plan first.'
            });
        }
        
        // Convert keyResults to proper format (numbers, not objects)
        const formattedKeyResults = (keyResults || []).map(kr => ({
            description: kr.description,
            baseline: kr.baseline || 0,           // Direct number
            target: kr.target,                     // Direct number
            current: kr.baseline || 0,             // Direct number
            unit: kr.unit || '%',
            confidence: 50,
            trend: 'stable',
            status: 'on_track',
            history: []
        }));
        
        const currentQuarter = Math.floor((new Date().getMonth()) / 3) + 1;
        
        const newOKR = {
            objective,
            description: description || '',
            owner: owner || userId,
            keyResults: formattedKeyResults,
            progress: 0,
            quarter: quarter || currentQuarter,
            year: year || new Date().getFullYear(),
            status: 'active'
        };
        
        plan.okrs.push(newOKR);
        await plan.save();
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'okr',
            targetId: plan._id,
            targetName: objective,
            changes: { objective, quarter, year },
            description: `Created new OKR: ${objective}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(201).json({
            success: true,
            data: newOKR,
            message: 'OKR created successfully'
        });
        
    } catch (error) {
        console.error('Create OKR error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create OKR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Add key result to an OKR
 * @route   POST /api/executive/planning/okrs/:okrId/key-results
 * @access  Private (Strategy Director, CEO)
 */
const addKeyResult = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { okrId } = req.params;  // This is now the OKR's _id
        const { description, baseline, target, unit } = req.body;
        
        let userId = req.member?._id || req.user?.memberId || req.user?._id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Unable to determine user ID'
            });
        }
        
        // Get current strategic plan
        const plan = await StrategicPlan.findOne({
            organization: req.organization.id,
            'period.isCurrent': true,
            isActive: true
        });
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'No active strategic plan found'
            });
        }
        
        // Find the OKR by _id (NOT by index)
        let okrIndex = -1;
        for (let i = 0; i < plan.okrs.length; i++) {
            if (plan.okrs[i]._id.toString() === okrId) {
                okrIndex = i;
                break;
            }
        }
        
        if (okrIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'OKR not found'
            });
        }
        
        // Create new key result
        const newKeyResult = {
            description: description,
            baseline: baseline || 0,
            target: target,
            current: baseline || 0,
            unit: unit || '%',
            confidence: 50,
            trend: 'stable',
            status: 'on_track',
            history: []
        };
        
        plan.okrs[okrIndex].keyResults.push(newKeyResult);
        
        // Recalculate OKR progress
        const keyResults = plan.okrs[okrIndex].keyResults;
        let totalProgress = 0;
        for (const kr of keyResults) {
            if (kr.target && kr.target > 0) {
                const progress = (kr.current / kr.target) * 100;
                kr.progress = Math.min(Math.round(progress), 100);
                totalProgress += kr.progress;
            }
        }
        plan.okrs[okrIndex].progress = keyResults.length > 0 ? Math.round(totalProgress / keyResults.length) : 0;
        
        // Update OKR status based on progress
        if (plan.okrs[okrIndex].progress >= 100) {
            plan.okrs[okrIndex].status = 'completed';
        } else {
            plan.okrs[okrIndex].status = 'active';
        }
        
        await plan.save();
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'key_result',
            targetId: plan._id,
            targetName: description,
            description: `Added key result to OKR: ${description}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(201).json({
            success: true,
            data: newKeyResult,
            message: 'Key result added successfully'
        });
        
    } catch (error) {
        console.error('Add key result error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add key result',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Update key result value
 * @route   PUT /api/executive/planning/okrs/:okrId/key-results/:keyResultId
 * @access  Private (Strategy Director, CEO)
 */
const updateKeyResultValue = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { okrId, keyResultId } = req.params;  // okrId is now the OKR's _id
        const { value, note } = req.body;
        
        let userId = req.member?._id || req.user?.memberId || req.user?._id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Unable to determine user ID'
            });
        }
        
        // Get current strategic plan
        const plan = await StrategicPlan.findOne({
            organization: req.organization.id,
            'period.isCurrent': true,
            isActive: true
        });
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'No active strategic plan found'
            });
        }
        
        // Find the OKR by _id
        let okrIndex = -1;
        for (let i = 0; i < plan.okrs.length; i++) {
            if (plan.okrs[i]._id.toString() === okrId) {
                okrIndex = i;
                break;
            }
        }
        
        if (okrIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'OKR not found'
            });
        }
        
        const keyResultIndex = parseInt(keyResultId);
        if (isNaN(keyResultIndex) || keyResultIndex >= plan.okrs[okrIndex].keyResults.length) {
            return res.status(404).json({
                success: false,
                message: 'Key result not found'
            });
        }
        
        const keyResult = plan.okrs[okrIndex].keyResults[keyResultIndex];
        
        // Save current value to history
        keyResult.history = keyResult.history || [];
        keyResult.history.push({
            date: new Date(),
            value: keyResult.current,
            note: note
        });
        
        // Update current value
        keyResult.current = value;
        
        // Recalculate progress for this key result
        if (keyResult.target && keyResult.target > 0) {
            const progress = (value / keyResult.target) * 100;
            keyResult.progress = Math.min(Math.round(progress), 100);
            
            // Update status based on progress
            if (keyResult.progress >= 100) {
                keyResult.status = 'completed';
            } else if (keyResult.progress >= 75) {
                keyResult.status = 'on_track';
            } else if (keyResult.progress >= 50) {
                keyResult.status = 'at_risk';
            } else {
                keyResult.status = 'behind';
            }
            
            // Calculate trend
            if (keyResult.history.length > 1) {
                const previous = keyResult.history[keyResult.history.length - 2].value;
                const change = ((value - previous) / previous) * 100;
                keyResult.trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
            }
        }
        
        // Recalculate overall OKR progress
        const keyResults = plan.okrs[okrIndex].keyResults;
        let totalProgress = 0;
        for (const kr of keyResults) {
            totalProgress += kr.progress || 0;
        }
        plan.okrs[okrIndex].progress = keyResults.length > 0 ? Math.round(totalProgress / keyResults.length) : 0;
        
        // Update OKR status based on progress
        if (plan.okrs[okrIndex].progress >= 100) {
            plan.okrs[okrIndex].status = 'completed';
        } else {
            plan.okrs[okrIndex].status = 'active';
        }
        
        await plan.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'key_result',
            targetId: keyResultId,
            description: `Updated key result value to ${value}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: {
                value,
                progress: keyResult.progress,
                status: keyResult.status
            },
            message: 'Key result updated successfully'
        });
        
    } catch (error) {
        console.error('Update key result error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update key result',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ==================== HELPER FUNCTIONS ====================

async function createDefaultMarketIntelligence(organizationId, memberId) {
    const intelligence = new MarketIntelligence({
        organization: organizationId,
        market: {
            name: "Global Market",
            sector: "Technology",
            industry: "Software",
            size: {
                current: 1000000000,
                projected: [
                    { year: new Date().getFullYear() + 1, value: 1100000000, growth: 10 },
                    { year: new Date().getFullYear() + 2, value: 1210000000, growth: 10 },
                    { year: new Date().getFullYear() + 3, value: 1331000000, growth: 10 }
                ]
            },
            growth: {
                rate: 10,
                drivers: ["Digital transformation", "Cloud adoption", "AI integration"],
                constraints: ["Economic uncertainty", "Regulatory changes"]
            },
            trends: [
                {
                    trend: "Cloud Computing",
                    description: "Shift to cloud-based solutions",
                    impact: "High",
                    timeframe: "2-3 years",
                    confidence: "high"
                },
                {
                    trend: "AI Integration",
                    description: "AI becoming ubiquitous",
                    impact: "High",
                    timeframe: "3-5 years",
                    confidence: "medium"
                }
            ]
        },
        competitors: [],
        swot: {
            strengths: [],
            weaknesses: [],
            opportunities: [],
            threats: []
        },
        createdBy: memberId,
        updatedBy: memberId,
        lastUpdated: new Date()
    });
    
    await intelligence.save();
    return intelligence;
}

async function calculateScenario(plan, assumptions) {
    // This would run complex calculations based on assumptions
    // For now, return sample data
    
    const baseRevenue = plan.financialPlan?.revenue?.target[0]?.amount || 1000000;
    const growthRate = assumptions.find(a => a.factor === 'growth_rate')?.value || 10;
    
    const revenue = baseRevenue * (1 + (growthRate / 100));
    const profit = revenue * 0.15; // Assume 15% margin
    const cashflow = profit * 0.8; // Assume 80% conversion to cash
    
    return {
        financialImpact: {
            revenue,
            profit,
            cashflow,
            roi: 15 + (growthRate - 10) * 2 // Simple ROI calculation
        },
        operationalImpact: {
            capacity: 80 + (growthRate - 10) * 2,
            efficiency: 75 + (growthRate - 10),
            headcount: Math.round(100 * (1 + growthRate / 100))
        },
        marketImpact: {
            share: 15 + (growthRate - 10) * 0.5,
            penetration: 20 + (growthRate - 10),
            growth: growthRate
        },
        risks: [
            {
                description: "Market adoption slower than expected",
                probability: "medium",
                impact: "medium"
            },
            {
                description: "Increased competition",
                probability: "high",
                impact: "medium"
            }
        ],
        probability: 75 - Math.abs(growthRate - 10) * 2
    };
}

module.exports = {
    // Strategic Plans
    getCurrentStrategicPlan,
    getStrategicPlanById,
    createStrategicPlan,
    updateStrategicPlan,
    setCurrentPlan,
    
    // Strategic Objectives
    getStrategicObjectives,
    createStrategicObjective,
    updateStrategicObjective,
    updateKeyResult,
    
    // Strategic Initiatives
    getStrategicInitiatives,
    createStrategicInitiative,
    updateStrategicInitiative,
    addInitiativeUpdate,
    
    // Market Intelligence
    getMarketIntelligence,
    updateMarketIntelligence,
    
    // Scenario Planning
    runScenarioAnalysis,
    
    // OKRs
    getOKRDashboard,
    createOKR,
    addKeyResult,
    updateKeyResultValue
};