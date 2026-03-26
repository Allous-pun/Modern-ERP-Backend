// src/routes/finance/cost.routes.js
const express = require('express');
const router = express.Router();
const costController = require('../../controllers/finance/cost.controller');
const { protect } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/auth.middleware');
const { setOrganizationContext } = require('../../middleware/organization.middleware');
const attachSettings = require('../../middleware/settings.middleware');

// Apply authentication and organization context
router.use(protect);
router.use(setOrganizationContext);
router.use(attachSettings);

// Organization cost summary
router.get('/summary',
    hasPermission('finance.cost_view'),
    costController.getOrganizationCostSummary
);

// Cost center summary
router.get('/centers/:id/summary',
    hasPermission('finance.cost_view'),
    costController.getCostCenterSummary
);

// Cost center CRUD
router.route('/centers')
    .post(
        hasPermission('finance.cost_create'),
        costController.createCostCenter
    )
    .get(
        hasPermission('finance.cost_view'),
        costController.getCostCenters
    );

router.route('/centers/:id')
    .get(
        hasPermission('finance.cost_view'),
        costController.getCostCenterById
    )
    .put(
        hasPermission('finance.cost_update'),
        costController.updateCostCenter
    )
    .delete(
        hasPermission('finance.cost_update'),
        costController.deleteCostCenter
    );

// Cost allocations
router.route('/allocations')
    .post(
        hasPermission('finance.cost_create'),
        costController.createCostAllocation
    )
    .get(
        hasPermission('finance.cost_view'),
        costController.getCostAllocations
    );

module.exports = router;
