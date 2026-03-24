// src/controllers/sales/campaign.controller.js
const { Campaign } = require('../../models/sales');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all campaigns
// @route   GET /api/sales/campaigns
// @access  Private (requires sales.campaigns_view)
const getCampaigns = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            status,
            type,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { organization: organizationId };
        
        if (status) filter.status = status;
        if (type) filter.type = type;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const campaigns = await Campaign.find(filter)
            .sort({ startDate: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('createdBy', 'firstName lastName');

        const total = await Campaign.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: campaigns,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get campaigns error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch campaigns'
        });
    }
};

// @desc    Get single campaign
// @route   GET /api/sales/campaigns/:id
// @access  Private (requires sales.campaigns_view)
const getCampaign = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const campaign = await Campaign.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('createdBy', 'firstName lastName');

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }

        res.status(200).json({
            success: true,
            data: campaign
        });
    } catch (error) {
        console.error('Get campaign error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch campaign'
        });
    }
};

// @desc    Create campaign
// @route   POST /api/sales/campaigns
// @access  Private (requires sales.campaigns_create)
const createCampaign = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const campaignData = {
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId,
            status: 'draft'
        };

        const campaign = await Campaign.create(campaignData);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'campaign_created',
            target: campaign._id,
            details: {
                name: campaign.name,
                type: campaign.type,
                budget: campaign.budget
            }
        });

        res.status(201).json({
            success: true,
            message: 'Campaign created successfully',
            data: campaign
        });
    } catch (error) {
        console.error('Create campaign error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create campaign'
        });
    }
};

// @desc    Update campaign
// @route   PUT /api/sales/campaigns/:id
// @access  Private (requires sales.campaigns_update)
const updateCampaign = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const campaign = await Campaign.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Campaign updated successfully',
            data: campaign
        });
    } catch (error) {
        console.error('Update campaign error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update campaign'
        });
    }
};

// @desc    Delete campaign
// @route   DELETE /api/sales/campaigns/:id
// @access  Private (requires sales.campaigns_delete)
const deleteCampaign = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const campaign = await Campaign.findOneAndDelete({
            _id: req.params.id,
            organization: organizationId
        });

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Campaign deleted successfully'
        });
    } catch (error) {
        console.error('Delete campaign error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete campaign'
        });
    }
};

module.exports = {
    getCampaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign
};