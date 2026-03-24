// src/controllers/finance/budget.controller.js
const BudgetService = require('../../services/finance/budget.service');

/**
 * @desc    Create budget
 * @route   POST /api/finance/budgets
 * @access  Private (requires finance.budget_create)
 */
const createBudget = async (req, res) => {
    try {
        const { name, description, fiscalYear, periodType, startDate, endDate, lineItems } = req.body;
        
        // Validate required fields
        if (!name || !fiscalYear || !periodType || !startDate || !endDate || !lineItems || lineItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'name, fiscalYear, periodType, startDate, endDate, and lineItems are required'
            });
        }
        
        // Validate each line item has account and amount
        for (const item of lineItems) {
            if (!item.account) {
                return res.status(400).json({
                    success: false,
                    message: 'Each line item must have an account'
                });
            }
            if (item.amount === undefined || item.amount < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Each line item must have a positive amount'
                });
            }
        }
        
        const budget = await BudgetService.createBudget({
            name,
            description,
            fiscalYear,
            periodType,
            startDate,
            endDate,
            lineItems
        }, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(201).json({
            success: true,
            message: 'Budget created successfully',
            data: budget
        });
        
    } catch (error) {
        console.error('Create budget error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create budget'
        });
    }
};

/**
 * @desc    Get budgets
 * @route   GET /api/finance/budgets
 * @access  Private (requires finance.budget_view)
 */
const getBudgets = async (req, res) => {
    try {
        const {
            fiscalYear,
            status,
            search,
            page = 1,
            limit = 50
        } = req.query;
        
        const result = await BudgetService.getBudgets({
            fiscalYear,
            status,
            search
        }, req.user.organizationId, page, limit);
        
        res.status(200).json({
            success: true,
            count: result.budgets.length,
            total: result.total,
            page: result.page,
            pages: result.pages,
            data: result.budgets
        });
        
    } catch (error) {
        console.error('Get budgets error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budgets'
        });
    }
};

/**
 * @desc    Get budget by ID
 * @route   GET /api/finance/budgets/:id
 * @access  Private (requires finance.budget_view)
 */
const getBudgetById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const budget = await BudgetService.getBudgetById(id, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            data: budget
        });
        
    } catch (error) {
        console.error('Get budget error:', error);
        res.status(404).json({
            success: false,
            message: error.message || 'Budget not found'
        });
    }
};

/**
 * @desc    Update budget
 * @route   PUT /api/finance/budgets/:id
 * @access  Private (requires finance.budget_update)
 */
const updateBudget = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const budget = await BudgetService.updateBudget(id, updateData, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Budget updated successfully',
            data: budget
        });
        
    } catch (error) {
        console.error('Update budget error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update budget'
        });
    }
};

/**
 * @desc    Submit budget for review
 * @route   POST /api/finance/budgets/:id/submit
 * @access  Private (requires finance.budget_update)
 */
const submitBudgetForReview = async (req, res) => {
    try {
        const { id } = req.params;
        
        const budget = await BudgetService.submitForReview(id, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Budget submitted for review successfully',
            data: budget
        });
        
    } catch (error) {
        console.error('Submit budget error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to submit budget'
        });
    }
};

/**
 * @desc    Approve budget
 * @route   POST /api/finance/budgets/:id/approve
 * @access  Private (requires finance.budget_approve)
 */
const approveBudget = async (req, res) => {
    try {
        const { id } = req.params;
        
        const budget = await BudgetService.approveBudget(id, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Budget approved successfully',
            data: budget
        });
        
    } catch (error) {
        console.error('Approve budget error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to approve budget'
        });
    }
};

/**
 * @desc    Activate budget
 * @route   POST /api/finance/budgets/:id/activate
 * @access  Private (requires finance.budget_approve)
 */
const activateBudget = async (req, res) => {
    try {
        const { id } = req.params;
        
        const budget = await BudgetService.activateBudget(id, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Budget activated successfully',
            data: budget
        });
        
    } catch (error) {
        console.error('Activate budget error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to activate budget'
        });
    }
};

/**
 * @desc    Update actual amounts from journal entries
 * @route   POST /api/finance/budgets/:id/update-actuals
 * @access  Private (requires finance.budget_view)
 */
const updateActualAmounts = async (req, res) => {
    try {
        const { id } = req.params;
        
        const budget = await BudgetService.updateActualAmounts(id, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Actual amounts updated successfully',
            data: budget
        });
        
    } catch (error) {
        console.error('Update actuals error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update actual amounts'
        });
    }
};

/**
 * @desc    Get budget summary by fiscal year
 * @route   GET /api/finance/budgets/summary/:fiscalYear
 * @access  Private (requires finance.budget_view)
 */
const getBudgetSummary = async (req, res) => {
    try {
        const { fiscalYear } = req.params;
        
        const summary = await BudgetService.getBudgetSummary(req.user.organizationId, parseInt(fiscalYear));
        
        res.status(200).json({
            success: true,
            data: summary
        });
        
    } catch (error) {
        console.error('Get budget summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budget summary'
        });
    }
};

/**
 * @desc    Get budgets by fiscal year
 * @route   GET /api/finance/budgets/year/:fiscalYear
 * @access  Private (requires finance.budget_view)
 */
const getBudgetsByFiscalYear = async (req, res) => {
    try {
        const { fiscalYear } = req.params;
        const { status } = req.query;
        
        const budgets = await BudgetService.getBudgetsByFiscalYear(req.user.organizationId, parseInt(fiscalYear), status);
        
        res.status(200).json({
            success: true,
            count: budgets.length,
            data: budgets
        });
        
    } catch (error) {
        console.error('Get budgets by year error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budgets'
        });
    }
};

module.exports = {
    createBudget,
    getBudgets,
    getBudgetById,
    updateBudget,
    submitBudgetForReview,
    approveBudget,
    activateBudget,
    updateActualAmounts,
    getBudgetSummary,
    getBudgetsByFiscalYear
};
