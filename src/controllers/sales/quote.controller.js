// src/controllers/sales/quote.controller.js
const { Quote, Opportunity } = require('../../models/sales');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all quotes
// @route   GET /api/sales/quotes
// @access  Private (requires sales.quotes_view)
const getQuotes = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            status,
            customerId,
            opportunityId,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { organization: organizationId };
        
        if (status) filter.status = status;
        if (customerId) filter.customer = customerId;
        if (opportunityId) filter.opportunity = opportunityId;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const quotes = await Quote.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('customer', 'name email')
            .populate('opportunity', 'name')
            .populate('createdBy', 'firstName lastName');

        const total = await Quote.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: quotes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get quotes error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quotes'
        });
    }
};

// @desc    Get single quote
// @route   GET /api/sales/quotes/:id
// @access  Private (requires sales.quotes_view)
const getQuote = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const quote = await Quote.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('customer', 'name email phone address')
        .populate('opportunity', 'name amount stage')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .populate('items.product', 'name code');

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found'
            });
        }

        res.status(200).json({
            success: true,
            data: quote
        });
    } catch (error) {
        console.error('Get quote error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quote'
        });
    }
};

// @desc    Create quote
// @route   POST /api/sales/quotes
// @access  Private (requires sales.quotes_create)
const createQuote = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        // Generate quote number
        const quoteCount = await Quote.countDocuments({ organization: organizationId });
        const quoteNumber = `Q-${new Date().getFullYear()}-${String(quoteCount + 1).padStart(5, '0')}`;

        const quoteData = {
            ...req.body,
            quoteNumber,
            organization: organizationId,
            createdBy: req.user.userId,
            status: 'draft'
        };

        const quote = await Quote.create(quoteData);

        // If this quote is linked to an opportunity, update opportunity
        if (req.body.opportunity) {
            await Opportunity.findByIdAndUpdate(req.body.opportunity, {
                $push: { quotes: quote._id }
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'quote_created',
            target: quote._id,
            details: {
                quoteNumber: quote.quoteNumber,
                customer: quote.customer,
                total: quote.total
            }
        });

        res.status(201).json({
            success: true,
            message: 'Quote created successfully',
            data: quote
        });
    } catch (error) {
        console.error('Create quote error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create quote'
        });
    }
};

// @desc    Update quote
// @route   PUT /api/sales/quotes/:id
// @access  Private (requires sales.quotes_update)
const updateQuote = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const quote = await Quote.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: { $in: ['draft', 'sent'] }
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found or cannot be updated'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Quote updated successfully',
            data: quote
        });
    } catch (error) {
        console.error('Update quote error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update quote'
        });
    }
};

// @desc    Delete quote
// @route   DELETE /api/sales/quotes/:id
// @access  Private (requires sales.quotes_delete)
const deleteQuote = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const quote = await Quote.findOneAndDelete({
            _id: req.params.id,
            organization: organizationId,
            status: { $in: ['draft', 'rejected'] }
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found or cannot be deleted'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Quote deleted successfully'
        });
    } catch (error) {
        console.error('Delete quote error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete quote'
        });
    }
};

// @desc    Approve quote
// @route   POST /api/sales/quotes/:id/approve
// @access  Private (requires sales.quotes_approve)
const approveQuote = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const quote = await Quote.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: { $in: ['draft', 'sent'] }
            },
            {
                status: 'approved',
                approvedBy: req.user.userId,
                approvedAt: new Date(),
                approvalComments: req.body.comments
            },
            { new: true }
        );

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found or cannot be approved'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'quote_approved',
            target: quote._id,
            details: {
                quoteNumber: quote.quoteNumber,
                total: quote.total
            }
        });

        res.status(200).json({
            success: true,
            message: 'Quote approved successfully',
            data: quote
        });
    } catch (error) {
        console.error('Approve quote error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve quote'
        });
    }
};

// @desc    Reject quote
// @route   POST /api/sales/quotes/:id/reject
// @access  Private (requires sales.quotes_approve)
const rejectQuote = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const quote = await Quote.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: { $in: ['draft', 'sent'] }
            },
            {
                status: 'rejected',
                rejectedBy: req.user.userId,
                rejectedAt: new Date(),
                rejectionReason: reason
            },
            { new: true }
        );

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found or cannot be rejected'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Quote rejected successfully',
            data: quote
        });
    } catch (error) {
        console.error('Reject quote error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject quote'
        });
    }
};

// @desc    Convert quote to order
// @route   POST /api/sales/quotes/:id/convert-to-order
// @access  Private (requires sales.quotes_convert)
const convertQuoteToOrder = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const quote = await Quote.findOne({ 
            _id: req.params.id,
            organization: organizationId,
            status: 'approved'
        });

        if (!quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found or not approved'
            });
        }

        // Create order from quote (will be implemented when order controller is ready)
        // For now, just update quote status
        quote.status = 'converted';
        await quote.save();

        res.status(200).json({
            success: true,
            message: 'Quote converted to order successfully',
            data: quote
        });
    } catch (error) {
        console.error('Convert quote to order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to convert quote to order'
        });
    }
};

module.exports = {
    getQuotes,
    getQuote,
    createQuote,
    updateQuote,
    deleteQuote,
    approveQuote,
    rejectQuote,
    convertQuoteToOrder
};