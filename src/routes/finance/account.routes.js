// src/routes/finance/account.routes.js
const express = require('express');
const router = express.Router();
const accountController = require('../../controllers/finance/account.controller');
const { protect } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/auth.middleware');
const { setOrganizationContext, requireOrganizationRole } = require('../../middleware/organization.middleware');
const attachSettings = require('../../middleware/settings.middleware');

// Apply authentication and organization context to all routes
router.use(protect);
router.use(setOrganizationContext);

// Apply settings middleware to all account routes
router.use(attachSettings);

// Metadata endpoint (no specific permission required)
router.get('/metadata', accountController.getAccountMetadata);

// Chart of accounts (hierarchical)
router.get('/chart', 
    hasPermission('finance.account_read'),
    accountController.getChartOfAccounts
);

// Get accounts by type
router.get('/type/:type', 
    hasPermission('finance.account_read'),
    accountController.getAccountsByType
);

// Account CRUD operations
router.route('/')
    .post(
        hasPermission('finance.account_create'),
        accountController.createAccount
    )
    .get(
        hasPermission('finance.account_read'),
        accountController.getAccounts
    );

router.route('/:id')
    .get(
        hasPermission('finance.account_read'),
        accountController.getAccountById
    )
    .put(
        hasPermission('finance.account_update'),
        accountController.updateAccount
    )
    .delete(
        hasPermission('finance.account_delete'),
        accountController.deleteAccount
    );

// Account status management
router.post('/:id/activate', 
    hasPermission('finance.account_update'),
    accountController.activateAccount
);

router.post('/:id/deactivate', 
    hasPermission('finance.account_update'),
    accountController.deactivateAccount
);

module.exports = router;