// src/routes/finance/ar.routes.js
const express = require('express');
const router = express.Router();
const arController = require('../../controllers/finance/ar.controller');
const { protect } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/auth.middleware');
const { setOrganizationContext } = require('../../middleware/organization.middleware');
const attachSettings = require('../../middleware/settings.middleware');

// Apply authentication and organization context
router.use(protect);
router.use(setOrganizationContext);
router.use(attachSettings);

// Aging and Customer summaries
router.get('/aging-summary',
    hasPermission('finance.ar_invoice_view'),
    arController.getAgingSummary
);

router.get('/customer-summary',
    hasPermission('finance.ar_invoice_view'),
    arController.getCustomerSummary
);

// Invoice routes
router.route('/invoices')
    .post(
        hasPermission('finance.ar_invoice_create'),
        arController.createCustomerInvoice
    )
    .get(
        hasPermission('finance.ar_invoice_view'),
        arController.getCustomerInvoices
    );

router.route('/invoices/:id')
    .get(
        hasPermission('finance.ar_invoice_view'),
        arController.getInvoiceById
    );

router.post('/invoices/:id/approve',
    hasPermission('finance.ar_invoice_approve'),
    arController.approveInvoice
);

// Receipt routes
router.route('/receipts')
    .post(
        hasPermission('finance.receipt_create'),
        arController.createReceipt
    );

router.post('/receipts/:id/complete',
    hasPermission('finance.receipt_create'),
    arController.completeReceipt
);

// Get receipts for specific invoice
router.get('/invoices/:id/receipts',
    hasPermission('finance.ar_invoice_view'),
    arController.getInvoiceReceipts
);

module.exports = router;
