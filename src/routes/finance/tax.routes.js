// src/routes/finance/tax.routes.js
const express = require('express');
const router = express.Router();
const taxController = require('../../controllers/finance/tax.controller');
const { protect } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/auth.middleware');
const { setOrganizationContext } = require('../../middleware/organization.middleware');
const attachSettings = require('../../middleware/settings.middleware');

// Apply authentication and organization context
router.use(protect);
router.use(setOrganizationContext);
router.use(attachSettings);

// Tax calculation
router.post('/calculate',
    hasPermission('finance.tax_view'),
    taxController.calculateTax
);

// Tax summary
router.get('/summary',
    hasPermission('finance.tax_view'),
    taxController.getTaxSummary
);

// Active tax rates (for dropdowns)
router.get('/active',
    hasPermission('finance.tax_view'),
    taxController.getActiveTaxRates
);

// Tax rate CRUD
router.route('/rates')
    .post(
        hasPermission('finance.tax_create'),
        taxController.createTaxRate
    )
    .get(
        hasPermission('finance.tax_view'),
        taxController.getTaxRates
    );

router.route('/rates/:id')
    .get(
        hasPermission('finance.tax_view'),
        taxController.getTaxRateById
    )
    .put(
        hasPermission('finance.tax_update'),
        taxController.updateTaxRate
    )
    .delete(
        hasPermission('finance.tax_update'),
        taxController.deleteTaxRate
    );

// Tax returns
router.route('/returns')
    .post(
        hasPermission('finance.tax_create'),
        taxController.createTaxReturn
    )
    .get(
        hasPermission('finance.tax_view'),
        taxController.getTaxReturns
    );

router.post('/returns/:id/file',
    hasPermission('finance.tax_approve'),
    taxController.fileTaxReturn
);

module.exports = router;
