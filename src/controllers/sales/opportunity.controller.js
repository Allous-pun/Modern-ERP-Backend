// src/controllers/sales/opportunity.controller.js
const { Opportunity } = require('../../models/sales');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all opportunities
// @route   GET /api/sales/opportunities
// @access  Private (requires sales.opportunities_view)
const getOpportunities = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            stage,
            assignedTo,
            customerId,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = -1
        } = req.query;

        const filter = { organization: organizationId };
        
        if (stage) filter.stage = stage;
        if (assignedTo) filter.assignedTo = assignedTo;
        if (customerId) filter.customer = customerId;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const opportunities = await Opportunity.find(filter)
            .sort({ [sortBy]: parseInt(sortOrder) })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('customer', 'name email')
            .populate('contact', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email');

        const total = await Opportunity.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: opportunities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get opportunities error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch opportunities'
        });
    }
};

// @desc    Get single opportunity
// @route   GET /api/sales/opportunities/:id
// @access  Private (requires sales.opportunities_view)
const getOpportunity = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const opportunity = await Opportunity.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('customer', 'name email phone')
        .populate('contact', 'firstName lastName email phone')
        .populate('assignedTo', 'firstName lastName email')
        .populate('products.product', 'name code price');

        if (!opportunity) {
            return res.status(404).json({
                success: false,
                message: 'Opportunity not found'
            });
        }

        res.status(200).json({
            success: true,
            data: opportunity
        });
    } catch (error) {
        console.error('Get opportunity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch opportunity'
        });
    }
};

// @desc    Create opportunity
// @route   POST /api/sales/opportunities
// @access  Private (requires sales.opportunities_create)
const createOpportunity = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const opportunityData = {
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId
        };

        const opportunity = await Opportunity.create(opportunityData);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'opportunity_created',
            target: opportunity._id,
            details: {
                name: opportunity.name,
                customer: opportunity.customer,
                amount: opportunity.amount
            }
        });

        res.status(201).json({
            success: true,
            message: 'Opportunity created successfully',
            data: opportunity
        });
    } catch (error) {
        console.error('Create opportunity error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create opportunity'
        });
    }
};

// @desc    Update opportunity
// @route   PUT /api/sales/opportunities/:id
// @access  Private (requires sales.opportunities_update)
const updateOpportunity = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const opportunity = await Opportunity.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!opportunity) {
            return res.status(404).json({
                success: false,
                message: 'Opportunity not found'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'opportunity_updated',
            target: opportunity._id,
            details: {
                name: opportunity.name,
                stage: opportunity.stage,
                amount: opportunity.amount
            }
        });

        res.status(200).json({
            success: true,
            message: 'Opportunity updated successfully',
            data: opportunity
        });
    } catch (error) {
        console.error('Update opportunity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update opportunity'
        });
    }
};

// @desc    Delete opportunity
// @route   DELETE /api/sales/opportunities/:id
// @access  Private (requires sales.opportunities_delete)
const deleteOpportunity = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const opportunity = await Opportunity.findOneAndDelete({
            _id: req.params.id,
            organization: organizationId
        });

        if (!opportunity) {
            return res.status(404).json({
                success: false,
                message: 'Opportunity not found'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'opportunity_deleted',
            target: opportunity._id,
            details: {
                name: opportunity.name
            }
        });

        res.status(200).json({
            success: true,
            message: 'Opportunity deleted successfully'
        });
    } catch (error) {
        console.error('Delete opportunity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete opportunity'
        });
    }
};

// @desc    Update opportunity stage
// @route   PUT /api/sales/opportunities/:id/stage
// @access  Private (requires sales.opportunities_update)
const updateOpportunityStage = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { stage, probability, expectedCloseDate } = req.body;

        const opportunity = await Opportunity.findOne({ 
            _id: req.params.id,
            organization: organizationId
        });

        if (!opportunity) {
            return res.status(404).json({
                success: false,
                message: 'Opportunity not found'
            });
        }

        opportunity.stage = stage;
        if (probability) opportunity.probability = probability;
        if (expectedCloseDate) opportunity.expectedCloseDate = new Date(expectedCloseDate);
        
        // If stage is closed-won or closed-lost, update status
        if (stage === 'closed-won') {
            opportunity.status = 'won';
            opportunity.closedAt = new Date();
            opportunity.closedBy = req.user.userId;
        } else if (stage === 'closed-lost') {
            opportunity.status = 'lost';
            opportunity.closedAt = new Date();
            opportunity.closedBy = req.user.userId;
            opportunity.lostReason = req.body.lostReason;
        }

        await opportunity.save();

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'opportunity_stage_updated',
            target: opportunity._id,
            details: {
                name: opportunity.name,
                previousStage: opportunity.stage,
                newStage: stage
            }
        });

        res.status(200).json({
            success: true,
            message: 'Opportunity stage updated successfully',
            data: opportunity
        });
    } catch (error) {
        console.error('Update opportunity stage error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update opportunity stage'
        });
    }
};

module.exports = {
    getOpportunities,
    getOpportunity,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
    updateOpportunityStage
};