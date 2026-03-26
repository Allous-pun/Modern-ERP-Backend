// src/routes/finance/asset.routes.js
const express = require('express');
const router = express.Router();
const assetController = require('../../controllers/finance/asset.controller');
const { protect } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/auth.middleware');
const { setOrganizationContext } = require('../../middleware/organization.middleware');
const attachSettings = require('../../middleware/settings.middleware');

// Apply authentication and organization context
router.use(protect);
router.use(setOrganizationContext);
router.use(attachSettings);

// Asset summary
router.get('/summary',
    hasPermission('finance.asset_view'),
    assetController.getAssetSummary
);

// Depreciation schedules
router.get('/depreciation/schedules',
    hasPermission('finance.asset_view'),
    assetController.getDepreciationSchedules
);

router.post('/depreciation/:scheduleId/post',
    hasPermission('finance.asset_update'),
    assetController.postDepreciation
);

router.post('/:id/generate-depreciation',
    hasPermission('finance.asset_update'),
    assetController.generateDepreciationSchedule
);

router.post('/:id/post-depreciation',
    hasPermission('finance.asset_update'),
    assetController.postPeriodDepreciation
);

// Asset CRUD
router.route('/')
    .post(
        hasPermission('finance.asset_create'),
        assetController.createAsset
    )
    .get(
        hasPermission('finance.asset_view'),
        assetController.getAssets
    );

router.route('/:id')
    .get(
        hasPermission('finance.asset_view'),
        assetController.getAssetById
    )
    .put(
        hasPermission('finance.asset_update'),
        assetController.updateAsset
    );

router.post('/:id/dispose',
    hasPermission('finance.asset_update'),
    assetController.disposeAsset
);

module.exports = router;
