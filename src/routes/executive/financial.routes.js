// src/routes/executive/financial.routes.js
const express = require('express');
const router = express.Router();
const attachSettings = require('../../middleware/settings.middleware'); // ADD THIS
const {
    getFinancialDashboard,
    getFinancialHealth,
    getRevenueAnalysis,
    getExpenseAnalysis,
    getCashFlowAnalysis,
    getBudgetManagement,
    createBudget,
    updateBudget,
    submitBudgetForReview,
    approveBudget,
    getFinancialRatios,
    getTreasuryManagement,
    getTaxManagement,
    getFinancialForecast,
    acknowledgeFinancialAlert
} = require('../../controllers/executive/financialOversight.controller');
const { requirePermission } = require('../../middleware/permission.middleware');
const { body } = require('express-validator');

// Apply settings middleware to all financial routes
router.use(attachSettings); // ADD THIS LINE

// Validation middleware
const validateBudget = [
    body('name').notEmpty().withMessage('Budget name is required'),
    body('fiscalYear').isInt({ min: 2000 }).withMessage('Valid fiscal year is required'),
    (req, res, next) => {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    }
];

// ==================== DASHBOARD ROUTES ====================

// Get financial dashboard (CFO, CEO)
router.get('/dashboard',
    requirePermission('executive.financial_oversight'),
    getFinancialDashboard
);

// Get financial health
router.get('/health',
    requirePermission('executive.financial_oversight'),
    getFinancialHealth
);

// ==================== ANALYSIS ROUTES ====================

// Get revenue analysis
router.get('/revenue',
    requirePermission('executive.financial_oversight'),
    getRevenueAnalysis
);

// Get expense analysis
router.get('/expenses',
    requirePermission('executive.financial_oversight'),
    getExpenseAnalysis
);

// Get cash flow analysis
router.get('/cashflow',
    requirePermission('executive.financial_oversight'),
    getCashFlowAnalysis
);

// ==================== BUDGET ROUTES ====================

// Get budget management
router.get('/budget',
    requirePermission('executive.financial_oversight'),
    getBudgetManagement
);

// Create budget
router.post('/budget',
    requirePermission('executive.financial_oversight'),
    validateBudget,
    createBudget
);

// Update budget
router.put('/budget/:id',
    requirePermission('executive.financial_oversight'),
    updateBudget
);

// Submit budget for review
router.post('/budget/:id/submit',
    requirePermission('executive.financial_oversight'),
    submitBudgetForReview
);

// Approve budget
router.post('/budget/:id/approve',
    requirePermission('executive.financial_oversight'),
    approveBudget
);

// ==================== RATIOS ROUTES ====================

// Get financial ratios
router.get('/ratios',
    requirePermission('executive.financial_oversight'),
    getFinancialRatios
);

// ==================== TREASURY ROUTES ====================

// Get treasury management
router.get('/treasury',
    requirePermission('executive.financial_oversight'),
    getTreasuryManagement
);

// ==================== TAX ROUTES ====================

// Get tax management
router.get('/tax',
    requirePermission('executive.financial_oversight'),
    getTaxManagement
);

// ==================== FORECAST ROUTES ====================

// Get financial forecast
router.get('/forecast',
    requirePermission('executive.financial_oversight'),
    getFinancialForecast
);

// ==================== ALERT ROUTES ====================

// Acknowledge financial alert
router.put('/alerts/:alertId/acknowledge',
    requirePermission('executive.financial_oversight'),
    acknowledgeFinancialAlert
);

module.exports = router;