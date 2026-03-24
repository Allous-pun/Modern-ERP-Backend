// src/routes/executive/operations.routes.js
const express = require('express');
const router = express.Router();
const attachSettings = require('../../middleware/settings.middleware'); // ADD THIS
const {
    getOperationsDashboard,
    getOperationalKPIs,
    getProcessEfficiency,
    getSupplyChainMetrics,
    getProductionMetrics,
    getQualityMetrics,
    getResourceUtilization,
    getOperationalCosts,
    getOperationalAlerts,
    acknowledgeAlert,
    createProcessEfficiency,
    updateProcessEfficiency
} = require('../../controllers/executive/operationsDashboard.controller');
const { requirePermission } = require('../../middleware/permission.middleware');
const { body } = require('express-validator');

// Apply settings middleware to all operations routes
router.use(attachSettings); // ADD THIS LINE

// Validation middleware
const validateProcess = [
    body('processName').notEmpty().withMessage('Process name is required'),
    body('category').isIn(['manufacturing', 'service', 'administrative', 'logistics', 'quality'])
        .withMessage('Invalid category'),
    (req, res, next) => {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    }
];

// ==================== DASHBOARD ROUTES ====================

// Get operations dashboard (COO, CEO)
router.get('/dashboard',
    requirePermission('executive.operations_dashboard'),
    getOperationsDashboard
);

// Get operational KPIs
router.get('/kpis',
    requirePermission('executive.operations_dashboard'),
    getOperationalKPIs
);

// ==================== PROCESS EFFICIENCY ROUTES ====================

// Get process efficiency metrics
router.get('/process-efficiency',
    requirePermission('executive.operations_dashboard'),
    getProcessEfficiency
);

// Create process efficiency record
router.post('/process-efficiency',
    requirePermission('executive.operations_dashboard'),
    validateProcess,
    createProcessEfficiency
);

// Update process efficiency
router.put('/process-efficiency/:id',
    requirePermission('executive.operations_dashboard'),
    updateProcessEfficiency
);

// ==================== SUPPLY CHAIN ROUTES ====================

// Get supply chain metrics
router.get('/supply-chain',
    requirePermission('executive.operations_dashboard'),
    getSupplyChainMetrics
);

// ==================== PRODUCTION ROUTES ====================

// Get production metrics
router.get('/production',
    requirePermission('executive.operations_dashboard'),
    getProductionMetrics
);

// ==================== QUALITY ROUTES ====================

// Get quality metrics
router.get('/quality',
    requirePermission('executive.operations_dashboard'),
    getQualityMetrics
);

// ==================== RESOURCE ROUTES ====================

// Get resource utilization
router.get('/resources',
    requirePermission('executive.operations_dashboard'),
    getResourceUtilization
);

// ==================== COST ROUTES ====================

// Get operational costs
router.get('/costs',
    requirePermission('executive.operations_dashboard'),
    getOperationalCosts
);

// ==================== ALERT ROUTES ====================

// Get operational alerts
router.get('/alerts',
    requirePermission('executive.operations_dashboard'),
    getOperationalAlerts
);

// Acknowledge alert
router.put('/alerts/:alertId/acknowledge',
    requirePermission('executive.operations_dashboard'),
    acknowledgeAlert
);

module.exports = router;