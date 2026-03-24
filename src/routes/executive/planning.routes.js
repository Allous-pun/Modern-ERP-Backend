// src/routes/executive/planning.routes.js
const express = require('express');
const router = express.Router();
const attachSettings = require('../../middleware/settings.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');
const { body } = require('express-validator');

const {
    // Strategic Plans
    getCurrentStrategicPlan,
    getStrategicPlanById,
    createStrategicPlan,
    updateStrategicPlan,
    setCurrentPlan,
    
    // Strategic Objectives
    getStrategicObjectives,
    createStrategicObjective,
    updateStrategicObjective,
    updateKeyResult,
    
    // Strategic Initiatives
    getStrategicInitiatives,
    createStrategicInitiative,
    updateStrategicInitiative,
    addInitiativeUpdate,
    
    // Market Intelligence
    getMarketIntelligence,
    updateMarketIntelligence,
    
    // Scenario Planning
    runScenarioAnalysis,
    
    // OKRs
    getOKRDashboard,
    createOKR,
    addKeyResult,
    updateKeyResultValue
} = require('../../controllers/executive/strategicPlanning.controller');

// Apply settings middleware to all planning routes
router.use(attachSettings);

// Helper function to handle validation errors
const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = require('express-validator').validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }
        
        res.status(400).json({
            success: false,
            errors: errors.array()
        });
    };
};

// ==================== VALIDATION MIDDLEWARE ====================

const validateStrategicPlan = [
    body('name').notEmpty().withMessage('Plan name is required'),
    body('period.startYear').isInt({ min: 2000 }).withMessage('Valid start year is required'),
    body('period.endYear').isInt({ min: 2000 }).withMessage('Valid end year is required'),
];

const validateObjective = [
    body('name').notEmpty().withMessage('Objective name is required'),
    body('category').isIn(['growth', 'profitability', 'innovation', 'customer', 'operational', 'talent', 'sustainability'])
        .withMessage('Invalid category'),
    body('owner').isMongoId().withMessage('Valid owner ID is required'),
];

const validateInitiative = [
    body('name').notEmpty().withMessage('Initiative name is required'),
    body('category').isIn(['growth', 'innovation', 'efficiency', 'transformation', 'compliance', 'culture'])
        .withMessage('Invalid category'),
    body('timeline.startDate').isISO8601().withMessage('Valid start date is required'),
    body('timeline.plannedEndDate').isISO8601().withMessage('Valid end date is required'),
];

const validateKeyResult = [
    body('value').isNumeric().withMessage('Value must be a number'),
    body('note').optional().isString().withMessage('Note must be a string'),
];

const validateScenario = [
    body('name').notEmpty().withMessage('Scenario name is required'),
    body('type').isIn(['optimistic', 'pessimistic', 'most_likely', 'what_if'])
        .withMessage('Invalid scenario type'),
];

const validateCreateOKR = [
    body('objective').notEmpty().withMessage('Objective is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('owner').optional().isString().withMessage('Owner must be a string'),
    body('quarter').optional().isInt({ min: 1, max: 4 }).withMessage('Quarter must be between 1 and 4'),
    body('year').optional().isInt({ min: 2020, max: 2030 }).withMessage('Year must be between 2020 and 2030'),
    body('keyResults').optional().isArray().withMessage('Key results must be an array'),
];

const validateAddKeyResult = [
    body('description').notEmpty().withMessage('Key result description is required'),
    body('baseline').optional().isNumeric().withMessage('Baseline must be a number'),
    body('target').isNumeric().withMessage('Target must be a number'),
    body('unit').optional().isString().withMessage('Unit must be a string'),
];

const validateUpdateKeyResult = [
    body('value').isNumeric().withMessage('Value must be a number'),
    body('note').optional().isString().withMessage('Note must be a string'),
];

// ==================== STRATEGIC PLAN ROUTES ====================

// Get current strategic plan (Strategy Director, CEO, Board)
router.get('/current-plan',
    requirePermission('executive.strategic_planning'),
    getCurrentStrategicPlan
);

// Get strategic plan by ID
router.get('/plans/:id',
    requirePermission('executive.strategic_planning'),
    getStrategicPlanById
);

// Create strategic plan
router.post('/plans',
    requirePermission('executive.strategic_planning'),
    validate(validateStrategicPlan),
    createStrategicPlan
);

// Update strategic plan
router.put('/plans/:id',
    requirePermission('executive.strategic_planning'),
    updateStrategicPlan
);

// Set plan as current
router.post('/plans/:id/set-current',
    requirePermission('executive.strategic_planning'),
    setCurrentPlan
);

// ==================== STRATEGIC OBJECTIVES ROUTES ====================

// Get strategic objectives
router.get('/objectives',
    requirePermission('executive.strategic_planning'),
    getStrategicObjectives
);

// Create strategic objective
router.post('/objectives',
    requirePermission('executive.strategic_planning'),
    validate(validateObjective),
    createStrategicObjective
);

// Update strategic objective
router.put('/objectives/:id',
    requirePermission('executive.strategic_planning'),
    updateStrategicObjective
);

// Update key result
router.put('/objectives/:objectiveId/key-results/:keyResultId',
    requirePermission('executive.strategic_planning'),
    validate(validateKeyResult),
    updateKeyResult
);

// ==================== STRATEGIC INITIATIVES ROUTES ====================

// Get strategic initiatives
router.get('/initiatives',
    requirePermission('executive.strategic_planning'),
    getStrategicInitiatives
);

// Create strategic initiative
router.post('/initiatives',
    requirePermission('executive.strategic_planning'),
    validate(validateInitiative),
    createStrategicInitiative
);

// Update strategic initiative
router.put('/initiatives/:id',
    requirePermission('executive.strategic_planning'),
    updateStrategicInitiative
);

// Add initiative update
router.post('/initiatives/:id/updates',
    requirePermission('executive.strategic_planning'),
    addInitiativeUpdate
);

// ==================== MARKET INTELLIGENCE ROUTES ====================

// Get market intelligence
router.get('/market-intelligence',
    requirePermission('executive.strategic_planning'),
    getMarketIntelligence
);

// Update market intelligence
router.put('/market-intelligence',
    requirePermission('executive.strategic_planning'),
    updateMarketIntelligence
);

// ==================== SCENARIO PLANNING ROUTES ====================

// Run scenario analysis
router.post('/scenarios',
    requirePermission('executive.strategic_planning'),
    validate(validateScenario),
    runScenarioAnalysis
);

// ==================== OKR ROUTES ====================

// Get OKR dashboard
router.get('/okrs',
    requirePermission('executive.strategic_planning'),
    getOKRDashboard
);

// Create OKR
router.post('/okrs',
    requirePermission('executive.strategic_planning'),
    validate(validateCreateOKR),
    createOKR
);

// Add key result to OKR
router.post('/okrs/:okrId/key-results',
    requirePermission('executive.strategic_planning'),
    validate(validateAddKeyResult),
    addKeyResult
);

// Update key result value
router.put('/okrs/:okrId/key-results/:keyResultId',
    requirePermission('executive.strategic_planning'),
    validate(validateUpdateKeyResult),
    updateKeyResultValue
);

module.exports = router;