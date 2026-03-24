// src/routes/executive/itGovernance.routes.js
const express = require('express');
const router = express.Router();
const attachSettings = require('../../middleware/settings.middleware'); // ADD THIS
const {
    getITGovernanceDashboard,
    getITComplianceDashboard,
    getDigitalTransformation,
    createDigitalTransformation,
    updateDigitalTransformation,
    getSystemPerformance,
    getCybersecurityMetrics,
    getServiceDelivery,
    getDataGovernance,
    getITAuditManagement,
    getVendorRiskManagement,
    getTechnologyPortfolio,
    getITStrategyAlignment,
    acknowledgeITAlert
} = require('../../controllers/executive/itGovernance.controller');
const { requirePermission } = require('../../middleware/permission.middleware');
const { body } = require('express-validator');

// Apply settings middleware to all IT governance routes
router.use(attachSettings); // ADD THIS LINE

// Validation middleware
const validateDigitalTransformation = [
    body('name').notEmpty().withMessage('Initiative name is required'),
    body('category').isIn(['process_automation', 'cloud_migration', 'data_analytics', 'customer_experience', 'workplace_digitalization', 'ai_ml', 'iot', 'blockchain'])
        .withMessage('Invalid category'),
    body('timeline.startDate').isISO8601().withMessage('Valid start date is required'),
    body('timeline.plannedEndDate').isISO8601().withMessage('Valid end date is required'),
    (req, res, next) => {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    }
];

// ==================== DASHBOARD ROUTES ====================

// Get IT governance dashboard (CIO, CTO, CEO)
router.get('/dashboard',
    requirePermission('executive.it_governance'),
    getITGovernanceDashboard
);

// ==================== COMPLIANCE ROUTES ====================

// Get IT compliance dashboard (reads from System Compliance)
router.get('/compliance',
    requirePermission('executive.it_governance'),
    getITComplianceDashboard
);

// ==================== DIGITAL TRANSFORMATION ROUTES ====================

// Get digital transformation progress
router.get('/digital-transformation',
    requirePermission('executive.it_governance'),
    getDigitalTransformation
);

// Create digital transformation initiative
router.post('/digital-transformation',
    requirePermission('executive.it_governance'),
    validateDigitalTransformation,
    createDigitalTransformation
);

// Update digital transformation initiative
router.put('/digital-transformation/:id',
    requirePermission('executive.it_governance'),
    updateDigitalTransformation
);

// ==================== SYSTEM PERFORMANCE ROUTES ====================

// Get system performance metrics
router.get('/system-performance',
    requirePermission('executive.it_governance'),
    getSystemPerformance
);

// ==================== CYBERSECURITY ROUTES ====================

// Get cybersecurity metrics
router.get('/cybersecurity',
    requirePermission('executive.it_governance'),
    getCybersecurityMetrics
);

// ==================== SERVICE DELIVERY ROUTES ====================

// Get IT service delivery metrics
router.get('/service-delivery',
    requirePermission('executive.it_governance'),
    getServiceDelivery
);

// ==================== DATA GOVERNANCE ROUTES ====================

// Get data governance metrics
router.get('/data-governance',
    requirePermission('executive.it_governance'),
    getDataGovernance
);

// ==================== IT AUDIT ROUTES ====================

// Get IT audit management (reads from System Compliance audits)
router.get('/audit',
    requirePermission('executive.it_governance'),
    getITAuditManagement
);

// ==================== VENDOR RISK ROUTES ====================

// Get vendor risk management
router.get('/vendor-risk',
    requirePermission('executive.it_governance'),
    getVendorRiskManagement
);

// ==================== TECHNOLOGY PORTFOLIO ROUTES ====================

// Get technology portfolio
router.get('/technology-portfolio',
    requirePermission('executive.it_governance'),
    getTechnologyPortfolio
);

// ==================== STRATEGY ALIGNMENT ROUTES ====================

// Get IT strategy alignment
router.get('/strategy-alignment',
    requirePermission('executive.it_governance'),
    getITStrategyAlignment
);

// ==================== ALERT ROUTES ====================

// Acknowledge IT governance alert
router.put('/alerts/:alertId/acknowledge',
    requirePermission('executive.it_governance'),
    acknowledgeITAlert
);

module.exports = router;