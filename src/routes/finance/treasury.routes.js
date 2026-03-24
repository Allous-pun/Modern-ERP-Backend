// src/routes/finance/treasury.routes.js
const express = require('express');
const router = express.Router();
const treasuryController = require('../../controllers/finance/treasury.controller');
const { protect } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/auth.middleware');
const { setOrganizationContext } = require('../../middleware/organization.middleware');
const attachSettings = require('../../middleware/settings.middleware');

// Apply authentication and organization context
router.use(protect);
router.use(setOrganizationContext);
router.use(attachSettings);

// ==================== BANK ACCOUNTS ====================

// Cash position (summary)
router.get('/cash-position',
    hasPermission('finance.bank_view'),
    treasuryController.getCashPosition
);

// Bank account CRUD
router.route('/bank-accounts')
    .post(
        hasPermission('finance.bank_create'),
        treasuryController.createBankAccount
    )
    .get(
        hasPermission('finance.bank_view'),
        treasuryController.getBankAccounts
    );

router.route('/bank-accounts/:id')
    .get(
        hasPermission('finance.bank_view'),
        treasuryController.getBankAccountById
    )
    .put(
        hasPermission('finance.bank_update'),
        treasuryController.updateBankAccount
    )
    .delete(
        hasPermission('finance.bank_update'),
        treasuryController.deleteBankAccount
    );

// ==================== RECONCILIATIONS ====================

router.route('/reconciliations')
    .post(
        hasPermission('finance.bank_reconcile'),
        treasuryController.createReconciliation
    )
    .get(
        hasPermission('finance.bank_view'),
        treasuryController.getReconciliations
    );

router.post('/reconciliations/:id/post',
    hasPermission('finance.bank_reconcile'),
    treasuryController.postReconciliation
);

// ==================== CASH FLOW FORECASTS ====================

router.route('/cash-flow-forecasts')
    .post(
        hasPermission('finance.bank_create'),
        treasuryController.createCashFlowForecast
    )
    .get(
        hasPermission('finance.bank_view'),
        treasuryController.getCashFlowForecasts
    );

module.exports = router;
