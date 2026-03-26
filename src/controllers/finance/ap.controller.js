// src/controllers/finance/ap.controller.js
const APService = require('../../services/finance/ap.service');

/**
 * @desc    Create supplier invoice
 * @route   POST /api/finance/ap/invoices
 * @access  Private (requires finance.ap_invoice_create)
 */
const createSupplierInvoice = async (req, res) => {
    try {
        const {
            vendorId, vendorName, vendorEmail, vendorPhone, vendorAddress,
            date, dueDate, lineItems, notes, terms, discount, discountType, shipping,
            partyModel
        } = req.body;
        
        if (!vendorId || !vendorName || !date || !dueDate || !lineItems || lineItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'vendorId, vendorName, date, dueDate, and lineItems are required'
            });
        }
        
        const invoice = await APService.createSupplierInvoice({
            partyId: vendorId,
            partyModel: partyModel || 'OrganizationMember',
            partyName: vendorName,
            partyEmail: vendorEmail,
            partyPhone: vendorPhone,
            partyAddress: vendorAddress,
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
            message: 'Supplier invoice created successfully',
            data: invoice
        });
        
    } catch (error) {
        console.error('Create supplier invoice error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create supplier invoice'
        });
    }
};

/**
 * @desc    Get supplier invoices
 * @route   GET /api/finance/ap/invoices
 * @access  Private (requires finance.ap_invoice_view)
 */
const getSupplierInvoices = async (req, res) => {
    try {
        const {
            status, vendorId, startDate, endDate, search,
            page = 1, limit = 50
        } = req.query;
        
        const result = await APService.getSupplierInvoices({
            status,
            vendorId,
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
        console.error('Get supplier invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch supplier invoices'
        });
    }
};

/**
 * @desc    Get invoice by ID
 * @route   GET /api/finance/ap/invoices/:id
 * @access  Private (requires finance.ap_invoice_view)
 */
const getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const invoice = await APService.getInvoiceById(id, req.user.organizationId);
        
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
 * @desc    Approve supplier invoice
 * @route   POST /api/finance/ap/invoices/:id/approve
 * @access  Private (requires finance.ap_invoice_approve)
 */
const approveInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        
        const invoice = await APService.approveInvoice(id, {
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
 * @desc    Create payment for supplier invoice
 * @route   POST /api/finance/ap/payments
 * @access  Private (requires finance.payment_create)
 */
const createPayment = async (req, res) => {
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
        
        const result = await APService.createPayment({
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
            message: 'Payment created successfully',
            data: result
        });
        
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create payment'
        });
    }
};

/**
 * @desc    Complete payment
 * @route   POST /api/finance/ap/payments/:id/complete
 * @access  Private (requires finance.payment_create)
 */
const completePayment = async (req, res) => {
    try {
        const { id } = req.params;
        
        const payment = await APService.completePayment(id, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Payment completed successfully',
            data: payment
        });
        
    } catch (error) {
        console.error('Complete payment error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to complete payment'
        });
    }
};

/**
 * @desc    Get payments for an invoice
 * @route   GET /api/finance/ap/invoices/:id/payments
 * @access  Private (requires finance.ap_invoice_view)
 */
const getInvoicePayments = async (req, res) => {
    try {
        const { id } = req.params;
        
        const payments = await APService.getInvoicePayments(id, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            count: payments.length,
            data: payments
        });
        
    } catch (error) {
        console.error('Get invoice payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments'
        });
    }
};

/**
 * @desc    Get aging summary
 * @route   GET /api/finance/ap/aging-summary
 * @access  Private (requires finance.ap_invoice_view)
 */
const getAgingSummary = async (req, res) => {
    try {
        const aging = await APService.getAgingSummary(req.user.organizationId);
        
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
 * @desc    Get vendor summary
 * @route   GET /api/finance/ap/vendor-summary
 * @access  Private (requires finance.ap_invoice_view)
 */
const getVendorSummary = async (req, res) => {
    try {
        const { vendorId } = req.query;
        
        const vendors = await APService.getVendorSummary(req.user.organizationId, vendorId);
        
        res.status(200).json({
            success: true,
            count: vendors.length,
            data: vendors
        });
        
    } catch (error) {
        console.error('Get vendor summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendor summary'
        });
    }
};

module.exports = {
    createSupplierInvoice,
    getSupplierInvoices,
    getInvoiceById,
    approveInvoice,
    createPayment,
    completePayment,
    getInvoicePayments,
    getAgingSummary,
    getVendorSummary
};
