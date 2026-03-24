// src/controllers/finance/invoice.controller.js
const { Invoice, Payment } = require('../../models/finance');
const { generateInvoiceNumber } = require('../../utils/finance/generators');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all invoices
// @route   GET /api/finance/invoices
// @access  Private (requires finance.invoice_view)
const getInvoices = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            status, 
            type, 
            customerId, 
            startDate, 
            endDate,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = -1
        } = req.query;

        // Build filter
        const filter = { 
            organization: organizationId,
            isDeleted: { $ne: true }
        };
        
        if (status) filter.status = status;
        if (type) filter.invoiceType = type;
        if (customerId) filter.customer = customerId;
        if (startDate || endDate) {
            filter.issueDate = {};
            if (startDate) filter.issueDate.$gte = new Date(startDate);
            if (endDate) filter.issueDate.$lte = new Date(endDate);
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Execute query
        const invoices = await Invoice.find(filter)
            .sort({ [sortBy]: parseInt(sortOrder) })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('customer', 'name email')
            .populate('createdBy', 'firstName lastName');

        // Get total count
        const total = await Invoice.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: invoices,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoices'
        });
    }
};

// @desc    Get single invoice
// @route   GET /api/finance/invoices/:id
// @access  Private (requires finance.invoice_view)
const getInvoice = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const invoice = await Invoice.findOne({ 
            _id: req.params.id,
            organization: organizationId,
            isDeleted: { $ne: true }
        })
        .populate('customer', 'name email phone address')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .populate('payments.receivedBy', 'firstName lastName');

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        res.status(200).json({
            success: true,
            data: invoice
        });
    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoice'
        });
    }
};

// @desc    Create invoice
// @route   POST /api/finance/invoices
// @access  Private (requires finance.invoice_create)
const createInvoice = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const invoiceData = {
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId,
            invoiceNumber: await generateInvoiceNumber(organizationId, req.body.invoiceType || 'sales')
        };

        const invoice = await Invoice.create(invoiceData);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'invoice_created',
            target: invoice._id,
            details: {
                invoiceNumber: invoice.invoiceNumber,
                type: invoice.invoiceType,
                amount: invoice.totalAmount
            }
        });

        res.status(201).json({
            success: true,
            message: 'Invoice created successfully',
            data: invoice
        });
    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create invoice'
        });
    }
};

// @desc    Update invoice
// @route   PUT /api/finance/invoices/:id
// @access  Private (requires finance.invoice_update)
const updateInvoice = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const invoice = await Invoice.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: { $in: ['draft', 'sent'] } // Only allow updates on draft or sent
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found or cannot be updated (already approved/paid)'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'invoice_updated',
            target: invoice._id,
            details: { invoiceNumber: invoice.invoiceNumber }
        });

        res.status(200).json({
            success: true,
            message: 'Invoice updated successfully',
            data: invoice
        });
    } catch (error) {
        console.error('Update invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update invoice'
        });
    }
};

// @desc    Delete invoice (soft delete)
// @route   DELETE /api/finance/invoices/:id
// @access  Private (requires finance.invoice_delete)
const deleteInvoice = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const invoice = await Invoice.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: { $in: ['draft', 'sent'] } // Only allow delete on draft or sent
            },
            { 
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: req.user.userId
            },
            { new: true }
        );

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found or cannot be deleted'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'invoice_deleted',
            target: invoice._id,
            details: { invoiceNumber: invoice.invoiceNumber }
        });

        res.status(200).json({
            success: true,
            message: 'Invoice deleted successfully'
        });
    } catch (error) {
        console.error('Delete invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete invoice'
        });
    }
};

// @desc    Approve invoice
// @route   POST /api/finance/invoices/:id/approve
// @access  Private (requires finance.invoice_approve)
const approveInvoice = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const invoice = await Invoice.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: { $in: ['draft', 'sent'] }
            },
            { 
                status: 'approved',
                approvedBy: req.user.userId,
                approvedAt: new Date()
            },
            { new: true }
        );

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found or already approved'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'invoice_approved',
            target: invoice._id,
            details: { invoiceNumber: invoice.invoiceNumber }
        });

        res.status(200).json({
            success: true,
            message: 'Invoice approved successfully',
            data: invoice
        });
    } catch (error) {
        console.error('Approve invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve invoice'
        });
    }
};

// @desc    Void invoice
// @route   POST /api/finance/invoices/:id/void
// @access  Private (requires finance.invoice_manage)
const voidInvoice = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { reason } = req.body;
        
        const invoice = await Invoice.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: { $nin: ['paid', 'void'] }
            },
            { 
                status: 'cancelled',
                notes: `VOIDED: ${reason || 'No reason provided'}`
            },
            { new: true }
        );

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found or cannot be voided'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'invoice_voided',
            target: invoice._id,
            details: { invoiceNumber: invoice.invoiceNumber, reason }
        });

        res.status(200).json({
            success: true,
            message: 'Invoice voided successfully',
            data: invoice
        });
    } catch (error) {
        console.error('Void invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to void invoice'
        });
    }
};

// @desc    Send invoice via email
// @route   POST /api/finance/invoices/:id/send
// @access  Private (requires finance.invoice_manage)
const sendInvoice = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { email, message } = req.body;
        
        const invoice = await Invoice.findOne({ 
            _id: req.params.id,
            organization: organizationId
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        // TODO: Implement email sending logic
        // This would integrate with your email service

        // Update invoice status
        invoice.status = 'sent';
        await invoice.save();

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'invoice_sent',
            target: invoice._id,
            details: { 
                invoiceNumber: invoice.invoiceNumber,
                email: email || invoice.customerEmail 
            }
        });

        res.status(200).json({
            success: true,
            message: 'Invoice sent successfully'
        });
    } catch (error) {
        console.error('Send invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send invoice'
        });
    }
};

module.exports = {
    getInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    approveInvoice,
    voidInvoice,
    sendInvoice
};