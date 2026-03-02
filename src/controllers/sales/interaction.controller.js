// src/controllers/sales/interaction.controller.js
const { Interaction } = require('../../models/sales');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all interactions
// @route   GET /api/sales/interactions
// @access  Private (requires sales.interactions_view)
const getInteractions = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            customerId,
            contactId,
            type,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { organization: organizationId };
        
        if (customerId) filter.customer = customerId;
        if (contactId) filter.contact = contactId;
        if (type) filter.type = type;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const interactions = await Interaction.find(filter)
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('customer', 'name')
            .populate('contact', 'firstName lastName')
            .populate('createdBy', 'firstName lastName');

        const total = await Interaction.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: interactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get interactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch interactions'
        });
    }
};

// @desc    Get single interaction
// @route   GET /api/sales/interactions/:id
// @access  Private (requires sales.interactions_view)
const getInteraction = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const interaction = await Interaction.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('customer', 'name')
        .populate('contact', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName');

        if (!interaction) {
            return res.status(404).json({
                success: false,
                message: 'Interaction not found'
            });
        }

        res.status(200).json({
            success: true,
            data: interaction
        });
    } catch (error) {
        console.error('Get interaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch interaction'
        });
    }
};

// @desc    Create interaction
// @route   POST /api/sales/interactions
// @access  Private (requires sales.interactions_create)
const createInteraction = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const interactionData = {
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId
        };

        const interaction = await Interaction.create(interactionData);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'interaction_created',
            target: interaction._id,
            details: {
                type: interaction.type,
                customer: interaction.customer,
                date: interaction.date
            }
        });

        res.status(201).json({
            success: true,
            message: 'Interaction recorded successfully',
            data: interaction
        });
    } catch (error) {
        console.error('Create interaction error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to record interaction'
        });
    }
};

// @desc    Update interaction
// @route   PUT /api/sales/interactions/:id
// @access  Private (requires sales.interactions_update)
const updateInteraction = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const interaction = await Interaction.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!interaction) {
            return res.status(404).json({
                success: false,
                message: 'Interaction not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Interaction updated successfully',
            data: interaction
        });
    } catch (error) {
        console.error('Update interaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update interaction'
        });
    }
};

// @desc    Delete interaction
// @route   DELETE /api/sales/interactions/:id
// @access  Private (requires sales.interactions_delete)
const deleteInteraction = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const interaction = await Interaction.findOneAndDelete({
            _id: req.params.id,
            organization: organizationId
        });

        if (!interaction) {
            return res.status(404).json({
                success: false,
                message: 'Interaction not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Interaction deleted successfully'
        });
    } catch (error) {
        console.error('Delete interaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete interaction'
        });
    }
};

module.exports = {
    getInteractions,
    getInteraction,
    createInteraction,
    updateInteraction,
    deleteInteraction
};