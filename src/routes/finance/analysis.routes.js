// src/routes/finance/analysis.routes.js
const express = require('express');
const router = express.Router();
const analysisController = require('../../controllers/finance/analysis.controller');
const { protect } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/auth.middleware');
const { setOrganizationContext } = require('../../middleware/organization.middleware');
const attachSettings = require('../../middleware/settings.middleware');

// Apply authentication and organization context
router.use(protect);
router.use(setOrganizationContext);
router.use(attachSettings);

// Ratio analysis
router.post('/ratio',
    hasPermission('finance.asset_view'),
    analysisController.generateRatioAnalysis
);

// Trend analysis
router.post('/trend',
    hasPermission('finance.asset_view'),
    analysisController.generateTrendAnalysis
);

// Variance analysis
router.post('/variance',
    hasPermission('finance.asset_view'),
    analysisController.generateVarianceAnalysis
);

// Get all analyses
router.get('/',
    hasPermission('finance.asset_view'),
    analysisController.getAnalyses
);

// Get analysis by ID
router.get('/:id',
    hasPermission('finance.asset_view'),
    analysisController.getAnalysisById
);

module.exports = router;
