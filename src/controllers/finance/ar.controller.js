// src/controllers/finance/ar.controller.js
const ARService = require('../../services/finance/ar.service');

/**
 * @desc    Create customer invoice
 * @route   POST /api/finance/ar/invoices
 * @access  Private (requires finance.ar_invoice_create)
 */
const createCustomerInvoice = async (req, res) => {
    try {
        const {
            customerId, customerName, customerEmail, customerPhone, customerAddress,
            date, dueDate, lineItems, notes, terms, discount, discountType, shipping,
            partyModel
        } = req.body;
        
        if (!customerId || !customerName || !date || !dueDate || !lineItems || lineItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'customerId, customerName, date, dueDate, and lineItems are required'
            });
        }
        
        const invoice = await ARService.createCustomerInvoice({
            partyId: customerId,
            partyModel: partyModel || 'OrganizationMember',
            partyName: customerName,
            partyEmail: customerEmail,
            partyPhone: customerPhone,
            partyAddress: customerAddress,
            date,
            dueDate,
            lineItems,
            notes,
            terms,
            discount,
            discountType,
            shipping
        }, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(201).json({
            success: true,
            message: 'Customer invoice created successfully',
            data: invoice
        });
        
    } catch (error) {
        console.error('Create customer invoice error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create customer invoice'
        });
    }
};

/**
 * @desc    Get customer invoices
 * @route   GET /api/finance/ar/invoices
 * @access  Private (requires finance.ar_invoice_view)
 */
const getCustomerInvoices = async (req, res) => {
    try {
        const {
            status, customerId, startDate, endDate, search,
            page = 1, limit = 50
        } = req.query;
        
        const result = await ARService.getCustomerInvoices({
            status,
            customerId,
            startDate,
            endDate,
            search
        }, req.user.organizationId, page, limit);
        
        res.status(200).json({
            success: true,
            count: result.invoices.length,
            total: result.total,
            page: result.page,
            pages: result.pages,
            data: result.invoices
        });
        
    } catch (error) {
        console.error('Get customer invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customer invoices'
        });
    }
};

/**
 * @desc    Get invoice by ID
 * @route   GET /api/finance/ar/invoices/:id
 * @access  Private (requires finance.ar_invoice_view)
 */
const getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const invoice = await ARService.getInvoiceById(id, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            data: invoice
        });
        
    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(404).json({
            success: false,
            message: error.message || 'Invoice not found'
        });
    }
};

/**
 * @desc    Approve customer invoice
 * @route   POST /api/finance/ar/invoices/:id/approve
 * @access  Private (requires finance.ar_invoice_approve)
 */
const approveInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        
        const invoice = await ARService.approveInvoice(id, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Invoice approved successfully',
            data: invoice
        });
        
    } catch (error) {
        console.error('Approve invoice error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to approve invoice'
        });
    }
};

/**
 * @desc    Create receipt for customer invoice
 * @route   POST /api/finance/ar/receipts
 * @access  Private (requires finance.receipt_create)
 */
const createReceipt = async (req, res) => {
    try {
        const {
            invoiceId, date, amount, paymentMethod, reference, bankAccountId, notes
        } = req.body;
        
        if (!invoiceId || !date || !amount || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'invoiceId, date, amount, and paymentMethod are required'
            });
        }
        
        const result = await ARService.createReceipt({
            invoiceId,
            date,
            amount,
            paymentMethod,
            reference,
            bankAccountId,
            notes
        }, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(201).json({
            success: true,
            message: 'Receipt created successfully',
            data: result
        });
        
    } catch (error) {
        console.error('Create receipt error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create receipt'
        });
    }
};

/**
 * @desc    Complete receipt
 * @route   POST /api/finance/ar/receipts/:id/complete
 * @access  Private (requires finance.receipt_create)
 */
const completeReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        
        const receipt = await ARService.completeReceipt(id, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Receipt completed successfully',
            data: receipt
        });
        
    } catch (error) {
        console.error('Complete receipt error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to complete receipt'
        });
    }
};

/**
 * @desc    Get receipts for an invoice
 * @route   GET /api/finance/ar/invoices/:id/receipts
 * @access  Private (requires finance.ar_invoice_view)
 */
const getInvoiceReceipts = async (req, res) => {
    try {
        const { id } = req.params;
        
        const receipts = await ARService.getInvoiceReceipts(id, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            count: receipts.length,
            data: receipts
        });
        
    } catch (error) {
        console.error('Get invoice receipts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch receipts'
        });
    }
};

/**
 * @desc    Get aging summary for AR
 * @route   GET /api/finance/ar/aging-summary
 * @access  Private (requires finance.ar_invoice_view)
 */
const getAgingSummary = async (req, res) => {
    try {
        const aging = await ARService.getAgingSummary(req.user.organizationId);
        
        res.status(200).json({
            success: true,
            data: aging
        });
        
    } catch (error) {
        console.error('Get aging summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch aging summary'
        });
    }
};

/**
 * @desc    Get customer summary
 * @route   GET /api/finance/ar/customer-summary
 * @access  Private (requires finance.ar_invoice_view)
 */
const getCustomerSummary = async (req, res) => {
    try {
        const { customerId } = req.query;
        
        const customers = await ARService.getCustomerSummary(req.user.organizationId, customerId);
        
        res.status(200).json({
            success: true,
            count: customers.length,
            data: customers
        });
        
    } catch (error) {
        console.error('Get customer summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customer summary'
        });
    }
};

module.exports = {
    createCustomerInvoice,
    getCustomerInvoices,
    getInvoiceById,
    approveInvoice,
    createReceipt,
    completeReceipt,
    getInvoiceReceipts,
    getAgingSummary,
    getCustomerSummary
};
