// src/routes/finance/ap.routes.js
const express = require('express');
const router = express.Router();
const apController = require('../../controllers/finance/ap.controller');
const { protect } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/auth.middleware');
const { setOrganizationContext } = require('../../middleware/organization.middleware');
const attachSettings = require('../../middleware/settings.middleware');

// Apply authentication and organization context
router.use(protect);
router.use(setOrganizationContext);
router.use(attachSettings);

// Aging and Vendor summaries
router.get('/aging-summary',
    hasPermission('finance.ap_invoice_view'),
    apController.getAgingSummary
);

router.get('/vendor-summary',
    hasPermission('finance.ap_invoice_view'),
    apController.getVendorSummary
);

// Invoice routes
router.route('/invoices')
    .post(
        hasPermission('finance.ap_invoice_create'),
        apController.createSupplierInvoice
    )
    .get(
        hasPermission('finance.ap_invoice_view'),
        apController.getSupplierInvoices
    );

router.route('/invoices/:id')
    .get(
        hasPermission('finance.ap_invoice_view'),
        apController.getInvoiceById
    );

router.post('/invoices/:id/approve',
    hasPermission('finance.ap_invoice_approve'),
    apController.approveInvoice
);

// Payment routes
router.route('/payments')
    .post(
        hasPermission('finance.payment_create'),
        apController.createPayment
    );

router.post('/payments/:id/complete',
    hasPermission('finance.payment_create'),
    apController.completePayment
);

// Get payments for specific invoice
router.get('/invoices/:id/payments',
    hasPermission('finance.ap_invoice_view'),
    apController.getInvoicePayments
);

module.exports = router;
