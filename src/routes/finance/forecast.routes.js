// src/routes/finance/forecast.routes.js
const express = require('express');
const router = express.Router();
const forecastController = require('../../controllers/finance/forecast.controller');
const { protect } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/auth.middleware');
const { setOrganizationContext } = require('../../middleware/organization.middleware');
const attachSettings = require('../../middleware/settings.middleware');

// Apply authentication and organization context
router.use(protect);
router.use(setOrganizationContext);
router.use(attachSettings);

// Generate forecast
router.post('/generate',
    hasPermission('finance.asset_view'),
    forecastController.generateForecast
);

// Get all forecasts
router.get('/',
    hasPermission('finance.asset_view'),
    forecastController.getForecasts
);

// Get forecast by ID
router.get('/:id',
    hasPermission('finance.asset_view'),
    forecastController.getForecastById
);

module.exports = router;
