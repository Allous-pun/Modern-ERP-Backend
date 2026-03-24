// src/routes/executive/analytics.routes.js
const express = require('express');
const router = express.Router();
const attachSettings = require('../../middleware/settings.middleware'); // ADD THIS
const {
    getExecutiveSummary,
    getBusinessPerformance,
    getCrossFunctionalMetrics,
    getForecastData,
    getTrendAnalysis,
    getKPIDashboard,
    updateKPIValue,
    getKPIHistory,
    createKPI
} = require('../../controllers/executive/analytics.controller');
const { requirePermission } = require('../../middleware/permission.middleware');
const { body } = require('express-validator');

// Apply settings middleware to all analytics routes
router.use(attachSettings); // ADD THIS LINE

// Validation middleware
const validateKPI = [
    body('name').notEmpty().withMessage('KPI name is required'),
    body('code').notEmpty().withMessage('KPI code is required'),
    body('category').isIn(['financial', 'operational', 'strategic', 'hr', 'technology', 'sales', 'marketing', 'customer', 'quality', 'compliance', 'risk', 'sustainability', 'innovation'])
        .withMessage('Invalid category'),
    body('unit').isIn(['number', 'currency', 'percentage', 'hours', 'days', 'rate', 'score', 'index', 'ratio', 'custom'])
        .withMessage('Invalid unit'),
    body('formula').isIn(['direct', 'percentage', 'ratio', 'average', 'sum', 'count', 'growth_rate', 'custom'])
        .withMessage('Invalid calculation method'),
    body('direction').isIn(['higher_is_better', 'lower_is_better', 'target_is_best'])
        .withMessage('Invalid direction'),
    body('frequency').isIn(['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'annual'])
        .withMessage('Invalid frequency'),
    (req, res, next) => {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    }
];

const validateKPIUpdate = [
    body('value').notEmpty().withMessage('Value is required'),
    (req, res, next) => {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    }
];

// ==================== EXECUTIVE SUMMARY ROUTES ====================

// Get executive summary (CEO, Strategy Director)
router.get('/summary',
    requirePermission('executive.full_analytics'),
    getExecutiveSummary
);

// ==================== BUSINESS PERFORMANCE ROUTES ====================

// Get business performance
router.get('/performance',
    requirePermission('executive.full_analytics'),
    getBusinessPerformance
);

// ==================== CROSS-FUNCTIONAL METRICS ====================

// Get cross-functional metrics
router.get('/cross-functional',
    requirePermission('executive.full_analytics'),
    getCrossFunctionalMetrics
);

// ==================== FORECAST ROUTES ====================

// Get forecast data
router.get('/forecast',
    requirePermission('executive.full_analytics'),
    getForecastData
);

// ==================== TREND ANALYSIS ====================

// Get trend analysis
router.get('/trends',
    requirePermission('executive.full_analytics'),
    getTrendAnalysis
);

// ==================== KPI MANAGEMENT ====================

// Get KPI dashboard
router.get('/kpis',
    requirePermission('executive.full_analytics'),
    getKPIDashboard
);

// Create new KPI
router.post('/kpis',
    requirePermission('executive.full_analytics'),
    validateKPI,
    createKPI
);

// Update KPI value
router.put('/kpis/:id/value',
    requirePermission('executive.full_analytics'),
    validateKPIUpdate,
    updateKPIValue
);

// Get KPI history
router.get('/kpis/:id/history',
    requirePermission('executive.full_analytics'),
    getKPIHistory
);

module.exports = router;