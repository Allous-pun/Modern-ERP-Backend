// src/routes/executive/technology.routes.js
const express = require('express');
const router = express.Router();
const attachSettings = require('../../middleware/settings.middleware'); // ADD THIS
const {
    getTechnologyDashboard,
    getInnovationPipeline,
    createInnovationIdea,
    updateInnovationIdea,
    reviewInnovationIdea,
    getTechnicalDebt,
    createTechnicalDebt,
    updateTechnicalDebt,
    resolveTechnicalDebt,
    getProductRoadmap,
    getSystemPerformance,
    getArchitectureGovernance,
    getCloudMetrics,
    getDevOpsMetrics,
    acknowledgeTechnologyAlert
} = require('../../controllers/executive/technology.controller');
const { requirePermission } = require('../../middleware/permission.middleware');
const { body } = require('express-validator');

// Apply settings middleware to all technology routes
router.use(attachSettings); // ADD THIS LINE

// Validation middleware
const validateInnovation = [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').isIn(['product', 'process', 'service', 'business_model', 'technology', 'customer_experience'])
        .withMessage('Invalid category'),
    (req, res, next) => {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    }
];

const validateTechnicalDebt = [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('system').notEmpty().withMessage('System is required'),
    body('severity').isIn(['critical', 'high', 'medium', 'low']).withMessage('Invalid severity'),
    body('category').isIn(['code_quality', 'architecture', 'test_coverage', 'documentation', 'dependency', 'infrastructure', 'security'])
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

// Get technology dashboard (CTO, CEO)
router.get('/dashboard',
    requirePermission('executive.technology_oversight'),
    getTechnologyDashboard
);

// ==================== INNOVATION ROUTES ====================

// Get innovation pipeline
router.get('/innovation',
    requirePermission('executive.technology_oversight'),
    getInnovationPipeline
);

// Create innovation idea
router.post('/innovation',
    requirePermission('executive.technology_oversight'),
    validateInnovation,
    createInnovationIdea
);

// Update innovation idea
router.put('/innovation/:id',
    requirePermission('executive.technology_oversight'),
    updateInnovationIdea
);

// Review innovation idea
router.post('/innovation/:id/review',
    requirePermission('executive.technology_oversight'),
    reviewInnovationIdea
);

// ==================== TECHNICAL DEBT ROUTES ====================

// Get technical debt
router.get('/technical-debt',
    requirePermission('executive.technology_oversight'),
    getTechnicalDebt
);

// Create technical debt
router.post('/technical-debt',
    requirePermission('executive.technology_oversight'),
    validateTechnicalDebt,
    createTechnicalDebt
);

// Update technical debt
router.put('/technical-debt/:id',
    requirePermission('executive.technology_oversight'),
    updateTechnicalDebt
);

// Resolve technical debt
router.post('/technical-debt/:id/resolve',
    requirePermission('executive.technology_oversight'),
    resolveTechnicalDebt
);

// ==================== PRODUCT ROADMAP ====================

// Get product roadmap
router.get('/roadmap',
    requirePermission('executive.technology_oversight'),
    getProductRoadmap
);

// ==================== SYSTEM PERFORMANCE ====================

// Get system performance
router.get('/performance',
    requirePermission('executive.technology_oversight'),
    getSystemPerformance
);

// ==================== ARCHITECTURE GOVERNANCE ====================

// Get architecture governance
router.get('/architecture',
    requirePermission('executive.technology_oversight'),
    getArchitectureGovernance
);

// ==================== CLOUD METRICS ====================

// Get cloud metrics
router.get('/cloud',
    requirePermission('executive.technology_oversight'),
    getCloudMetrics
);

// ==================== DEVOPS METRICS ====================

// Get DevOps metrics
router.get('/devops',
    requirePermission('executive.technology_oversight'),
    getDevOpsMetrics
);

// ==================== ALERT ROUTES ====================

// Acknowledge technology alert
router.put('/alerts/:alertId/acknowledge',
    requirePermission('executive.technology_oversight'),
    acknowledgeTechnologyAlert
);

module.exports = router;