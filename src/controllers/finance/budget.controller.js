// src/controllers/finance/budget.controller.js
const { Budget, Account } = require('../../models/finance');
const AuditLog = require('../../models/auditLog.model');
const mongoose = require('mongoose');

// @desc    Get all budgets
// @route   GET /api/finance/budgets
// @access  Private (requires finance.budget_view)
const getBudgets = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            fiscalYear,
            status,
            department,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { organization: organizationId };
        
        if (fiscalYear) filter.fiscalYear = parseInt(fiscalYear);
        if (status) filter.status = status;
        if (department) filter.department = department;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const budgets = await Budget.find(filter)
            .sort({ fiscalYear: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('createdBy', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName')
            .populate('categories.account', 'code name');

        const total = await Budget.countDocuments(filter);

        // Get budget vs actual for each budget
        const budgetsWithActual = await Promise.all(
            budgets.map(async (budget) => {
                const actuals = await budget.getActualVsBudget();
                return {
                    ...budget.toObject(),
                    actuals
                };
            })
        );

        res.status(200).json({
            success: true,
            data: budgetsWithActual,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get budgets error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budgets'
        });
    }
};

// @desc    Get single budget
// @route   GET /api/finance/budgets/:id
// @access  Private (requires finance.budget_view)
const getBudget = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const budget = await Budget.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .populate('categories.account', 'code name type')
        .populate('categories.parent', 'code name');

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found'
            });
        }

        // Get actual vs budget comparison
        const actuals = await budget.getActualVsBudget();

        // Get monthly breakdown
        const monthlyBreakdown = await budget.getMonthlyBreakdown();

        res.status(200).json({
            success: true,
            data: {
                ...budget.toObject(),
                actuals,
                monthlyBreakdown
            }
        });
    } catch (error) {
        console.error('Get budget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budget'
        });
    }
};

// @desc    Create budget
// @route   POST /api/finance/budgets
// @access  Private (requires finance.budget_create)
const createBudget = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        // Validate accounts exist
        const accountIds = req.body.categories.map(c => c.account);
        const accounts = await Account.find({
            _id: { $in: accountIds },
            organization: organizationId
        });

        if (accounts.length !== accountIds.length) {
            return res.status(400).json({
                success: false,
                message: 'One or more account IDs are invalid'
            });
        }

        // Check if budget already exists for this fiscal year
        const existingBudget = await Budget.findOne({
            organization: organizationId,
            fiscalYear: req.body.fiscalYear,
            type: req.body.type,
            department: req.body.department
        });

        if (existingBudget) {
            return res.status(400).json({
                success: false,
                message: `Budget already exists for fiscal year ${req.body.fiscalYear}`
            });
        }

        const budgetData = {
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId,
            status: 'draft'
        };

        const budget = await Budget.create(budgetData);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'budget_created',
            target: budget._id,
            details: {
                name: budget.name,
                fiscalYear: budget.fiscalYear,
                totalAmount: budget.totalAmount
            }
        });

        res.status(201).json({
            success: true,
            message: 'Budget created successfully',
            data: budget
        });
    } catch (error) {
        console.error('Create budget error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create budget'
        });
    }
};

// @desc    Update budget
// @route   PUT /api/finance/budgets/:id
// @access  Private (requires finance.budget_update)
const updateBudget = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const budget = await Budget.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: { $in: ['draft', 'rejected'] } // Only allow updates on draft or rejected
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found or cannot be updated (already approved)'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'budget_updated',
            target: budget._id,
            details: {
                name: budget.name,
                fiscalYear: budget.fiscalYear
            }
        });

        res.status(200).json({
            success: true,
            message: 'Budget updated successfully',
            data: budget
        });
    } catch (error) {
        console.error('Update budget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update budget'
        });
    }
};

// @desc    Delete budget
// @route   DELETE /api/finance/budgets/:id
// @access  Private (requires finance.budget_delete)
const deleteBudget = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const budget = await Budget.findOneAndDelete({
            _id: req.params.id,
            organization: organizationId,
            status: { $in: ['draft', 'rejected'] } // Only allow delete on draft or rejected
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found or cannot be deleted (already approved)'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'budget_deleted',
            target: budget._id,
            details: {
                name: budget.name,
                fiscalYear: budget.fiscalYear
            }
        });

        res.status(200).json({
            success: true,
            message: 'Budget deleted successfully'
        });
    } catch (error) {
        console.error('Delete budget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete budget'
        });
    }
};

// @desc    Submit budget for approval
// @route   POST /api/finance/budgets/:id/submit
// @access  Private (requires finance.budget_manage)
const submitBudget = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const budget = await Budget.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: 'draft'
            },
            { 
                status: 'pending',
                submittedAt: new Date(),
                submittedBy: req.user.userId
            },
            { new: true }
        );

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found or already submitted'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'budget_submitted',
            target: budget._id,
            details: {
                name: budget.name,
                fiscalYear: budget.fiscalYear
            }
        });

        res.status(200).json({
            success: true,
            message: 'Budget submitted for approval',
            data: budget
        });
    } catch (error) {
        console.error('Submit budget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit budget'
        });
    }
};

// @desc    Approve budget
// @route   POST /api/finance/budgets/:id/approve
// @access  Private (requires finance.budget_approve)
const approveBudget = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { comments } = req.body;
        
        const budget = await Budget.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: 'pending'
            },
            { 
                status: 'approved',
                approvedBy: req.user.userId,
                approvedAt: new Date(),
                approvalComments: comments
            },
            { new: true }
        );

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found or already processed'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'budget_approved',
            target: budget._id,
            details: {
                name: budget.name,
                fiscalYear: budget.fiscalYear
            }
        });

        res.status(200).json({
            success: true,
            message: 'Budget approved successfully',
            data: budget
        });
    } catch (error) {
        console.error('Approve budget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve budget'
        });
    }
};

// @desc    Reject budget
// @route   POST /api/finance/budgets/:id/reject
// @access  Private (requires finance.budget_approve)
const rejectBudget = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const budget = await Budget.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: 'pending'
            },
            { 
                status: 'rejected',
                rejectionReason: reason,
                rejectedBy: req.user.userId,
                rejectedAt: new Date()
            },
            { new: true }
        );

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found or already processed'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'budget_rejected',
            target: budget._id,
            details: {
                name: budget.name,
                fiscalYear: budget.fiscalYear,
                reason
            }
        });

        res.status(200).json({
            success: true,
            message: 'Budget rejected',
            data: budget
        });
    } catch (error) {
        console.error('Reject budget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject budget'
        });
    }
};

// @desc    Get budget vs actual comparison
// @route   GET /api/finance/budgets/:id/vs-actual
// @access  Private (requires finance.budget_view)
const getBudgetVsActual = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const budget = await Budget.findOne({ 
            _id: req.params.id,
            organization: organizationId
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found'
            });
        }

        const comparison = await budget.getActualVsBudget();

        res.status(200).json({
            success: true,
            data: comparison
        });
    } catch (error) {
        console.error('Get budget vs actual error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budget comparison'
        });
    }
};

// @desc    Get budget summary by fiscal year
// @route   GET /api/finance/budgets/summary/:year
// @access  Private (requires finance.budget_view)
const getBudgetSummary = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const year = parseInt(req.params.year);

        const budgets = await Budget.find({
            organization: organizationId,
            fiscalYear: year,
            status: 'approved'
        });

        const summary = {
            fiscalYear: year,
            totalBudget: 0,
            totalActual: 0,
            variance: 0,
            byDepartment: {},
            byCategory: {}
        };

        for (const budget of budgets) {
            const actuals = await budget.getActualVsBudget();
            
            summary.totalBudget += budget.totalAmount;
            summary.totalActual += actuals.actual;

            // Group by department
            if (!summary.byDepartment[budget.department]) {
                summary.byDepartment[budget.department] = {
                    budget: 0,
                    actual: 0,
                    variance: 0
                };
            }
            summary.byDepartment[budget.department].budget += budget.totalAmount;
            summary.byDepartment[budget.department].actual += actuals.actual;

            // Group by category
            for (const category of budget.categories) {
                const categoryActual = actuals.byCategory.find(c => 
                    c.account.toString() === category.account.toString()
                );
                
                if (!summary.byCategory[category.name]) {
                    summary.byCategory[category.name] = {
                        budget: 0,
                        actual: 0,
                        variance: 0
                    };
                }
                summary.byCategory[category.name].budget += category.amount;
                summary.byCategory[category.name].actual += categoryActual?.actual || 0;
            }
        }

        // Calculate variances
        summary.variance = summary.totalActual - summary.totalBudget;
        
        Object.keys(summary.byDepartment).forEach(dept => {
            summary.byDepartment[dept].variance = 
                summary.byDepartment[dept].actual - summary.byDepartment[dept].budget;
        });

        Object.keys(summary.byCategory).forEach(cat => {
            summary.byCategory[cat].variance = 
                summary.byCategory[cat].actual - summary.byCategory[cat].budget;
        });

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

module.exports = {
    getBudgets,
    getBudget,
    createBudget,
    updateBudget,
    deleteBudget,
    submitBudget,
    approveBudget,
    rejectBudget,
    getBudgetVsActual,
    getBudgetSummary
};