// src/routes/finance/budget.routes.js
const express = require('express');
const router = express.Router();
const budgetController = require('../../controllers/finance/budget.controller');
const { protect } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/auth.middleware');
const { setOrganizationContext } = require('../../middleware/organization.middleware');
const attachSettings = require('../../middleware/settings.middleware');

// Apply authentication and organization context
router.use(protect);
router.use(setOrganizationContext);
router.use(attachSettings);

// Budget summary by fiscal year
router.get('/summary/:fiscalYear',
    hasPermission('finance.budget_view'),
    budgetController.getBudgetSummary
);

// Get budgets by fiscal year
router.get('/year/:fiscalYear',
    hasPermission('finance.budget_view'),
    budgetController.getBudgetsByFiscalYear
);

// Update actual amounts
router.post('/:id/update-actuals',
    hasPermission('finance.budget_view'),
    budgetController.updateActualAmounts
);

// Budget CRUD operations
router.route('/')
    .post(
        hasPermission('finance.budget_create'),
        budgetController.createBudget
    )
    .get(
        hasPermission('finance.budget_view'),
        budgetController.getBudgets
    );

router.route('/:id')
    .get(
        hasPermission('finance.budget_view'),
        budgetController.getBudgetById
    )
    .put(
        hasPermission('finance.budget_update'),
        budgetController.updateBudget
    );

// Workflow actions
router.post('/:id/submit',
    hasPermission('finance.budget_update'),
    budgetController.submitBudgetForReview
);

router.post('/:id/approve',
    hasPermission('finance.budget_approve'),
    budgetController.approveBudget
);

router.post('/:id/activate',
    hasPermission('finance.budget_approve'),
    budgetController.activateBudget
);

module.exports = router;
