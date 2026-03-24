// src/routes/finance/reports.routes.js
const express = require('express');
const router = express.Router();
const reportsController = require('../../controllers/finance/financialReports.controller');
const { protect } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/auth.middleware');
const { setOrganizationContext } = require('../../middleware/organization.middleware');
const attachSettings = require('../../middleware/settings.middleware');

// Apply authentication and organization context
router.use(protect);
router.use(setOrganizationContext);
router.use(attachSettings);

// Financial reports
router.get('/income-statement',
    hasPermission('finance.reports_view'),
    reportsController.getIncomeStatement
);

router.get('/balance-sheet',
    hasPermission('finance.reports_view'),
    reportsController.getBalanceSheet
);

router.get('/cash-flow',
    hasPermission('finance.reports_view'),
    reportsController.getCashFlowStatement
);

module.exports = router;
