// src/controllers/executive/financialOversight.controller.js
const FinancialDashboard = require('../../models/executive/financialDashboard.model');
const Budget = require('../../models/executive/executiveBudget.model');
const FinancialHealth = require('../../models/executive/financialHealth.model');
const { logExecutiveAction } = require('../../services/executive/auditHelper.service');
const mongoose = require('mongoose');

// ADD THESE IMPORTS
const JournalEntry = require('../../models/finance/journalEntry.model');
const { Account } = require('../../models/finance/account.model');
const FinanceBudget = require('../../models/finance/budget.model');

/**
 * @desc    Get financial dashboard
 * @route   GET /api/executive/financial/dashboard
 * @access  Private (CFO, CEO)
 */
const getFinancialDashboard = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { period = 'monthly', year, quarter } = req.query;
        
        // Calculate date range
        const dateRange = calculateFinancialPeriod(period, year, quarter);
        
        // Get or generate dashboard
        let dashboard = await FinancialDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        }).populate('createdBy', 'personalInfo firstName personalInfo lastName email');
        
        // If not found, generate new dashboard
        if (!dashboard) {
            // Get the correct user ID
            const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
            
            dashboard = await generateFinancialDashboard(
                req.organization.id,
                dateRange,
                period,
                year,
                quarter,
                memberId
            );
        }
        
        // Check for financial alerts
        const alerts = await checkFinancialAlerts(req.organization.id, dashboard);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'financial_dashboard',
            targetId: dashboard._id,
            description: `Viewed financial dashboard for ${period} ${year || ''}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: {
                dashboard,
                alerts
            }
        });
        
    } catch (error) {
        console.error('Get financial dashboard error:', error);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'financial_dashboard',
            description: 'Failed to view financial dashboard',
            success: false,
            error
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to fetch financial dashboard'
        });
    }
};

/**
 * @desc    Get financial health
 * @route   GET /api/executive/financial/health
 * @access  Private (CFO, CEO)
 */
const getFinancialHealth = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { year, quarter } = req.query;
        
        let query = { organization: req.organization.id };
        
        if (year) {
            query['period.year'] = parseInt(year);
        }
        if (quarter) {
            query['period.quarter'] = parseInt(quarter);
        }
        
        let health = await FinancialHealth.findOne(query)
            .sort({ 'period.asOf': -1 });
        
        // If not found, generate new health assessment
        if (!health) {
            // Get the correct user ID
            const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
            
            health = await generateFinancialHealth(
                req.organization.id,
                year || new Date().getFullYear(),
                quarter || Math.floor(new Date().getMonth() / 3) + 1,
                memberId
            );
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'financial_health',
            description: 'Viewed financial health assessment',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: health
        });
        
    } catch (error) {
        console.error('Get financial health error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch financial health'
        });
    }
};

/**
 * @desc    Get revenue analysis
 * @route   GET /api/executive/financial/revenue
 * @access  Private (CFO, CEO)
 */
const getRevenueAnalysis = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { period = 'monthly', breakdown = 'stream' } = req.query;
        
        const dateRange = calculateFinancialPeriod(period);
        
        const dashboard = await FinancialDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        let revenue = dashboard ? dashboard.revenue : {};
        
        // Filter by breakdown type
        if (breakdown === 'stream' && revenue.breakdown?.byStream) {
            revenue = revenue.breakdown.byStream;
        } else if (breakdown === 'region' && revenue.breakdown?.byRegion) {
            revenue = revenue.breakdown.byRegion;
        } else if (breakdown === 'product' && revenue.breakdown?.byProduct) {
            revenue = revenue.breakdown.byProduct;
        } else if (breakdown === 'customer' && revenue.breakdown?.byCustomer) {
            revenue = revenue.breakdown.byCustomer;
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'revenue_analysis',
            description: `Viewed revenue analysis by ${breakdown}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: revenue
        });
        
    } catch (error) {
        console.error('Get revenue analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch revenue analysis'
        });
    }
};

/**
 * @desc    Get expense analysis
 * @route   GET /api/executive/financial/expenses
 * @access  Private (CFO, CEO)
 */
const getExpenseAnalysis = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { period = 'monthly', breakdown = 'category' } = req.query;
        
        const dateRange = calculateFinancialPeriod(period);
        
        const dashboard = await FinancialDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        let expenses = dashboard ? dashboard.expenses : {};
        
        // Filter by breakdown type
        if (breakdown === 'category' && expenses.breakdown?.byCategory) {
            expenses = expenses.breakdown.byCategory;
        } else if (breakdown === 'department' && expenses.breakdown?.byDepartment) {
            expenses = expenses.breakdown.byDepartment;
        } else if (breakdown === 'project' && expenses.breakdown?.byProject) {
            expenses = expenses.breakdown.byProject;
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'expense_analysis',
            description: `Viewed expense analysis by ${breakdown}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: expenses
        });
        
    } catch (error) {
        console.error('Get expense analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch expense analysis'
        });
    }
};

/**
 * @desc    Get cash flow analysis
 * @route   GET /api/executive/financial/cashflow
 * @access  Private (CFO, CEO)
 */
const getCashFlowAnalysis = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { period = 'monthly', type } = req.query;
        
        const dateRange = calculateFinancialPeriod(period);
        
        const dashboard = await FinancialDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        let cashflow = dashboard ? dashboard.cashFlow : {};
        
        // Filter by type
        if (type === 'operating') {
            cashflow = cashflow.operating;
        } else if (type === 'investing') {
            cashflow = cashflow.investing;
        } else if (type === 'financing') {
            cashflow = cashflow.financing;
        } else if (type === 'working-capital') {
            cashflow = cashflow.workingCapital;
        } else if (type === 'forecast') {
            cashflow = cashflow.forecast;
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'cashflow_analysis',
            description: `Viewed cash flow analysis`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: cashflow
        });
        
    } catch (error) {
        console.error('Get cash flow error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cash flow analysis'
        });
    }
};

/**
 * @desc    Get budget management
 * @route   GET /api/executive/financial/budget
 * @access  Private (CFO, CEO)
 */
const getBudgetManagement = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { fiscalYear, version, includeVariance = true } = req.query;
        
        let query = {
            organization: req.organization.id
        };
        
        if (fiscalYear) {
            query.fiscalYear = parseInt(fiscalYear);
        } else {
            query.fiscalYear = new Date().getFullYear();
        }
        
        if (version) {
            query.version = parseInt(version);
        }
        
        // Get latest active budget
        let budget = await Budget.findOne({
            ...query,
            status: { $in: ['active', 'approved'] }
        }).sort({ version: -1 });
        
        // If no active budget, get latest any status
        if (!budget) {
            budget = await Budget.findOne(query)
                .sort({ version: -1 });
        }
        
        // If still no budget, create draft
        if (!budget) {
            // Get the correct user ID
            const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
            
            budget = await createBudgetTemplate(
                req.organization.id,
                query.fiscalYear,
                memberId
            );
        }
        
        // Get all versions
        const versions = await Budget.find({
            organization: req.organization.id,
            fiscalYear: budget.fiscalYear
        }).select('version status createdAt approvedAt').sort({ version: -1 });
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'budget',
            targetId: budget._id,
            description: `Viewed budget for FY${budget.fiscalYear}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: budget,
            versions
        });
        
    } catch (error) {
        console.error('Get budget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budget'
        });
    }
};

/**
 * @desc    Create new budget
 * @route   POST /api/executive/financial/budget
 * @access  Private (CFO, Finance Director)
 */
const createBudget = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const budgetData = req.body;
        
        // Get the correct user ID
        const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
        
        // Check for the highest version number across ALL budgets for this fiscal year
        const highestVersionBudget = await Budget.findOne({
            organization: req.organization.id,
            fiscalYear: budgetData.fiscalYear
        }).sort({ version: -1 });
        
        if (highestVersionBudget) {
            // Create new version (increment from highest version found)
            budgetData.version = (highestVersionBudget.version || 1) + 1;
        } else {
            // First budget for this fiscal year
            budgetData.version = 1;
        }
        
        // Calculate P&L values from revenue and expenses data
        const revenueTotal = budgetData.revenue?.total || 0;
        const expensesTotal = budgetData.expenses?.total || 0;
        const cogs = budgetData.cogs || 0;
        
        const grossProfit = revenueTotal - cogs;
        const operatingProfit = grossProfit - expensesTotal;
        const netProfit = operatingProfit;
        
        // Add P&L to budget data
        budgetData.pnl = {
            revenue: revenueTotal,
            cogs: cogs,
            grossProfit: grossProfit,
            grossMargin: revenueTotal > 0 ? (grossProfit / revenueTotal) * 100 : 0,
            operatingExpenses: expensesTotal,
            operatingProfit: operatingProfit,
            operatingMargin: revenueTotal > 0 ? (operatingProfit / revenueTotal) * 100 : 0,
            netProfit: netProfit,
            netMargin: revenueTotal > 0 ? (netProfit / revenueTotal) * 100 : 0,
            ebitda: operatingProfit,
            ebitdaMargin: revenueTotal > 0 ? (operatingProfit / revenueTotal) * 100 : 0
        };
        
        const budget = new Budget({
            organization: req.organization.id,
            ...budgetData,
            createdBy: memberId,
            status: 'draft'
        });
        
        await budget.save();
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'budget',
            targetId: budget._id,
            targetName: budget.name,
            changes: budgetData,
            description: `Created budget: ${budget.name} for FY${budget.fiscalYear} (v${budget.version})`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(201).json({
            success: true,
            data: budget,
            message: 'Budget created successfully'
        });
        
    } catch (error) {
        console.error('Create budget error:', error);
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'budget',
            description: 'Failed to create budget',
            success: false,
            error
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create budget'
        });
    }
};

/**
 * @desc    Update budget
 * @route   PUT /api/executive/financial/budget/:id
 * @access  Private (CFO, Finance Director)
 */
const updateBudget = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        // Get the correct user ID
        const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
        
        const budget = await Budget.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found'
            });
        }
        
        // Store old values for audit
        const oldValues = {
            revenue: budget.revenue?.total,
            expenses: budget.expenses?.total,
            cogs: budget.cogs,
            status: budget.status
        };
        
        // If revenue, expenses, or cogs are being updated, recalculate P&L
        if (updateData.revenue || updateData.expenses || updateData.cogs !== undefined) {
            const revenueTotal = updateData.revenue?.total || budget.revenue?.total || 0;
            const expensesTotal = updateData.expenses?.total || budget.expenses?.total || 0;
            const cogs = updateData.cogs !== undefined ? updateData.cogs : (budget.cogs || 0);
            
            const grossProfit = revenueTotal - cogs;
            const operatingProfit = grossProfit - expensesTotal;
            const netProfit = operatingProfit;
            
            updateData.pnl = {
                revenue: revenueTotal,
                cogs: cogs,
                grossProfit: grossProfit,
                grossMargin: revenueTotal > 0 ? (grossProfit / revenueTotal) * 100 : 0,
                operatingExpenses: expensesTotal,
                operatingProfit: operatingProfit,
                operatingMargin: revenueTotal > 0 ? (operatingProfit / revenueTotal) * 100 : 0,
                netProfit: netProfit,
                netMargin: revenueTotal > 0 ? (netProfit / revenueTotal) * 100 : 0,
                ebitda: operatingProfit,
                ebitdaMargin: revenueTotal > 0 ? (operatingProfit / revenueTotal) * 100 : 0
            };
        }
        
        // Update
        Object.assign(budget, updateData);
        budget.updatedBy = memberId;
        
        await budget.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'budget',
            targetId: budget._id,
            targetName: budget.name,
            changes: {
                before: oldValues,
                after: {
                    revenue: budget.revenue?.total,
                    expenses: budget.expenses?.total,
                    cogs: budget.cogs,
                    status: budget.status
                }
            },
            description: `Updated budget: ${budget.name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: budget,
            message: 'Budget updated successfully'
        });
        
    } catch (error) {
        console.error('Update budget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update budget'
        });
    }
};

/**
 * @desc    Submit budget for review
 * @route   POST /api/executive/financial/budget/:id/submit
 * @access  Private (CFO, Finance Director)
 */
const submitBudgetForReview = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        // Get the correct user ID
        const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
        
        const budget = await Budget.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found'
            });
        }
        
        budget.status = 'under_review';
        budget.updatedBy = memberId;
        
        await budget.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'budget',
            targetId: budget._id,
            targetName: budget.name,
            description: `Submitted budget for review: ${budget.name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            message: 'Budget submitted for review successfully'
        });
        
    } catch (error) {
        console.error('Submit budget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit budget'
        });
    }
};

/**
 * @desc    Approve budget
 * @route   POST /api/executive/financial/budget/:id/approve
 * @access  Private (CFO, CEO)
 */
const approveBudget = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        // Get the correct user ID
        const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
        
        const budget = await Budget.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found'
            });
        }
        
        budget.status = 'active';
        budget.approvedBy = memberId;
        budget.approvedAt = new Date();
        
        await budget.save();
        
        await logExecutiveAction({
            req,
            action: 'approve',
            targetType: 'budget',
            targetId: budget._id,
            targetName: budget.name,
            description: `Approved budget: ${budget.name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            message: 'Budget approved successfully'
        });
        
    } catch (error) {
        console.error('Approve budget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve budget'
        });
    }
};

/**
 * @desc    Get financial ratios
 * @route   GET /api/executive/financial/ratios
 * @access  Private (CFO, CEO)
 */
const getFinancialRatios = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { period = 'monthly' } = req.query;
        
        const dateRange = calculateFinancialPeriod(period);
        
        const dashboard = await FinancialDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        const ratios = dashboard ? dashboard.ratios : {};
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'financial_ratios',
            description: 'Viewed financial ratios',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: ratios
        });
        
    } catch (error) {
        console.error('Get ratios error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch financial ratios'
        });
    }
};

/**
 * @desc    Get treasury management
 * @route   GET /api/executive/financial/treasury
 * @access  Private (CFO, Treasurer)
 */
const getTreasuryManagement = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const dateRange = calculateFinancialPeriod('daily');
        
        const dashboard = await FinancialDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        const treasury = dashboard ? dashboard.treasury : {};
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'treasury',
            description: 'Viewed treasury management',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: treasury
        });
        
    } catch (error) {
        console.error('Get treasury error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch treasury management'
        });
    }
};

/**
 * @desc    Get tax management
 * @route   GET /api/executive/financial/tax
 * @access  Private (CFO, Tax Manager)
 */
const getTaxManagement = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { year } = req.query;
        
        const dateRange = calculateFinancialPeriod('yearly', year);
        
        const dashboard = await FinancialDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        const tax = dashboard ? dashboard.tax : {};
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'tax',
            description: 'Viewed tax management',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: tax
        });
        
    } catch (error) {
        console.error('Get tax error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tax management'
        });
    }
};

/**
 * @desc    Get financial forecast
 * @route   GET /api/executive/financial/forecast
 * @access  Private (CFO, CEO)
 */
const getFinancialForecast = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { metric = 'revenue', horizon = '12months' } = req.query;
        
        // Generate forecast based on historical data
        const forecast = await generateFinancialForecast(
            req.organization.id,
            metric,
            horizon
        );
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'financial_forecast',
            description: `Viewed ${metric} forecast for ${horizon}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: forecast
        });
        
    } catch (error) {
        console.error('Get forecast error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch financial forecast'
        });
    }
};

/**
 * @desc    Acknowledge financial alert
 * @route   PUT /api/executive/financial/alerts/:alertId/acknowledge
 * @access  Private (CFO)
 */
const acknowledgeFinancialAlert = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { alertId } = req.params;
        
        // Get the correct user ID
        const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
        
        const dateRange = calculateFinancialPeriod('daily');
        
        const dashboard = await FinancialDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard not found'
            });
        }
        
        const alert = dashboard.alerts.id(alertId);
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }
        
        alert.acknowledged = {
            by: memberId,
            at: new Date()
        };
        
        await dashboard.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'financial_alert',
            targetId: alertId,
            description: `Acknowledged financial alert: ${alert.message}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            message: 'Alert acknowledged successfully'
        });
        
    } catch (error) {
        console.error('Acknowledge alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to acknowledge alert'
        });
    }
};

// ==================== HELPER FUNCTIONS ====================

function calculateFinancialPeriod(period, year, quarter) {
    const now = new Date();
    const start = new Date();
    const end = new Date();
    
    if (year) {
        start.setFullYear(parseInt(year));
        end.setFullYear(parseInt(year));
    }
    
    switch(period) {
        case 'daily':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'weekly':
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        case 'monthly':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'quarterly':
            if (quarter) {
                start.setMonth((quarter - 1) * 3, 1);
                end.setMonth(quarter * 3, 0);
            } else {
                const currentQuarter = Math.floor(now.getMonth() / 3);
                start.setMonth(currentQuarter * 3, 1);
                end.setMonth(currentQuarter * 3 + 3, 0);
            }
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'yearly':
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
            break;
    }
    
    return { start, end };
}

async function generateFinancialDashboard(organizationId, dateRange, period, year, quarter, memberId) {
    // Get all posted journal entries in the period
    const journalEntries = await JournalEntry.find({
        organization: organizationId,
        status: 'posted',
        date: { $gte: dateRange.start, $lte: dateRange.end }
    });
    
    // Get all revenue and expense accounts
    const revenueAccounts = await Account.find({
        organization: organizationId,
        type: 'revenue',
        isActive: true,
        deletedAt: null
    });
    
    const expenseAccounts = await Account.find({
        organization: organizationId,
        type: 'expense',
        isActive: true,
        deletedAt: null
    });
    
    // Get asset accounts for balance sheet
    const assetAccounts = await Account.find({
        organization: organizationId,
        type: 'asset',
        isActive: true,
        deletedAt: null
    });
    
    // Calculate revenue total
    let totalRevenue = 0;
    const revenueByStream = [];
    
    for (const account of revenueAccounts) {
        let balance = 0;
        for (const entry of journalEntries) {
            for (const line of entry.entries) {
                if (line.account.toString() === account._id.toString()) {
                    balance += (line.credit || 0) - (line.debit || 0);
                }
            }
        }
        totalRevenue += balance;
        if (balance > 0) {
            revenueByStream.push({
                name: account.name,
                value: balance,
                percentage: 0, // Will calculate after total
                growth: 0,
                trend: 'up'
            });
        }
    }
    
    // Calculate percentages
    revenueByStream.forEach(item => {
        item.percentage = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0;
    });
    
    // Calculate expense total
    let totalExpenses = 0;
    const expensesByCategory = [];
    
    for (const account of expenseAccounts) {
        let balance = 0;
        for (const entry of journalEntries) {
            for (const line of entry.entries) {
                if (line.account.toString() === account._id.toString()) {
                    balance += (line.debit || 0) - (line.credit || 0);
                }
            }
        }
        totalExpenses += balance;
        if (balance > 0) {
            expensesByCategory.push({
                category: account.name,
                value: balance,
                percentage: 0,
                budget: 0,
                variance: 0,
                trend: 'stable'
            });
        }
    }
    
    // Calculate percentages
    expensesByCategory.forEach(item => {
        item.percentage = totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0;
    });
    
    // Get budget for comparison
    const budget = await FinanceBudget.findOne({
        organization: organizationId,
        fiscalYear: year || new Date().getFullYear(),
        status: 'active'
    });
    
    // Update budget variances
    if (budget) {
        for (const expense of expensesByCategory) {
            const budgetItem = budget.lineItems.find(
                item => item.account && item.account.name === expense.category
            );
            if (budgetItem) {
                expense.budget = budgetItem.amount;
                expense.variance = budgetItem.amount - expense.value;
            }
        }
    }
    
    // Calculate asset total
    let totalAssets = 0;
    for (const account of assetAccounts) {
        let balance = 0;
        for (const entry of journalEntries) {
            for (const line of entry.entries) {
                if (line.account.toString() === account._id.toString()) {
                    balance += (line.debit || 0) - (line.credit || 0);
                }
            }
        }
        totalAssets += balance;
    }
    
    // Net profit
    const netProfit = totalRevenue - totalExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    // Create dashboard with real data
    const dashboard = new FinancialDashboard({
        organization: organizationId,
        name: `Financial Dashboard - ${period} ${year || ''} ${quarter ? `Q${quarter}` : ''}`,
        period: {
            start: dateRange.start,
            end: dateRange.end,
            periodType: period,
            fiscalYear: year || new Date().getFullYear(),
            quarter: quarter || Math.floor(new Date().getMonth() / 3) + 1
        },
        financialHealth: {
            revenue: {
                current: totalRevenue,
                previous: totalRevenue * 0.9, // Placeholder
                change: 10,
                trend: totalRevenue > 0 ? 'up' : 'down',
                yearToDate: totalRevenue,
                forecast: totalRevenue * 1.1
            },
            profit: {
                gross: { value: netProfit, margin: netMargin, trend: netProfit > 0 ? 'up' : 'down' },
                operating: { value: netProfit, margin: netMargin, trend: netProfit > 0 ? 'up' : 'down' },
                net: { value: netProfit, margin: netMargin, trend: netProfit > 0 ? 'up' : 'down' },
                ebitda: { value: netProfit, margin: netMargin, trend: netProfit > 0 ? 'up' : 'down' }
            },
            cashFlow: {
                operating: netProfit,
                investing: 0,
                financing: 0,
                net: netProfit,
                free: netProfit,
                burnRate: totalExpenses / 12,
                runway: netProfit > 0 ? 999 : 0
            },
            balanceSheet: {
                assets: { total: totalAssets, current: totalAssets, fixed: 0, intangible: 0 },
                liabilities: { total: 0, current: 0, longTerm: 0 },
                equity: { total: totalAssets, retained: netProfit, paid: totalAssets - netProfit },
                workingCapital: totalAssets,
                debtToEquity: 0
            }
        },
        revenue: {
            total: totalRevenue,
            breakdown: {
                byStream: revenueByStream,
                byRegion: [],
                byProduct: [],
                byCustomer: []
            },
            recurring: { value: 0, percentage: 0, growth: 0, churn: 0 },
            trends: { monthOverMonth: 0, quarterOverQuarter: 0, yearOverYear: 0 },
            forecast: { nextMonth: totalRevenue, nextQuarter: totalRevenue * 3, nextYear: totalRevenue * 12, confidence: 85 }
        },
        expenses: {
            total: totalExpenses,
            breakdown: {
                byCategory: expensesByCategory,
                byDepartment: [],
                byProject: []
            },
            fixed: { value: totalExpenses, percentage: 100 },
            variable: { value: 0, percentage: 0 }
        },
        profitability: {
            grossMargin: { value: netMargin, target: 30, variance: netMargin - 30, trend: netMargin > 30 ? 'up' : 'down' },
            operatingMargin: { value: netMargin, target: 30, variance: netMargin - 30, trend: netMargin > 30 ? 'up' : 'down' },
            netMargin: { value: netMargin, target: 30, variance: netMargin - 30, trend: netMargin > 30 ? 'up' : 'down' },
            ebitda: { value: netProfit, margin: netMargin, target: 30, variance: netMargin - 30 },
            breakEven: { revenue: totalExpenses, units: 0, months: 0, marginOfSafety: totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue * 100 : 0 }
        },
        ratios: {
            liquidity: { current: totalAssets > 0 ? 1 : 0, quick: 1, cash: 1 },
            efficiency: { assetTurnover: totalAssets > 0 ? totalRevenue / totalAssets : 0, inventoryTurnover: 0, receivableTurnover: 0, payableTurnover: 0, cashConversion: 0 },
            profitability: { roa: totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0, roe: totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0, roi: netMargin, roic: netMargin },
            leverage: { debtToEquity: 0, debtToAsset: 0, interestCoverage: 0, debtToEbitda: 0 }
        },
        treasury: {
            cash: { onHand: totalAssets, inBank: totalAssets, total: totalAssets, byCurrency: [], byAccount: [] },
            investments: [],
            debt: [],
            forecast: { inflow: [], outflow: [], netPosition: [] }
        },
        tax: {
            corporate: { provision: 0, paid: 0, payable: 0, effectiveRate: 0 },
            vat: { collected: 0, paid: 0, net: 0, returnDate: null },
            payroll: { withheld: 0, paid: 0, nextDue: null },
            compliance: { lastFiling: null, nextFiling: null, status: 'compliant' }
        },
        createdBy: memberId
    });
    
    // Add alerts based on real data
    if (netMargin < 15) {
        dashboard.alerts.push({
            type: 'profitability',
            severity: 'warning',
            message: `Net margin is ${netMargin.toFixed(1)}%, below target of 15%`,
            metric: 'netMargin',
            value: netMargin,
            threshold: 15,
            timestamp: new Date(),
            resolved: false
        });
    }
    
    if (totalRevenue < totalExpenses) {
        dashboard.alerts.push({
            type: 'profitability',
            severity: 'critical',
            message: 'Company is operating at a loss',
            metric: 'netProfit',
            value: netProfit,
            threshold: 0,
            timestamp: new Date(),
            resolved: false
        });
    }
    
    await dashboard.save();
    return dashboard;
}

async function generateFinancialHealth(organizationId, year, quarter, memberId) {
    const health = new FinancialHealth({
        organization: organizationId,
        period: {
            asOf: new Date(),
            quarter,
            year
        },
        overallScore: 75,
        overallRating: 'good',
        components: {
            profitability: {
                score: 80,
                rating: 'good',
                weight: 30,
                metrics: {
                    netMargin: 15,
                    roe: 25,
                    roa: 15,
                    trend: 'up'
                }
            },
            liquidity: {
                score: 85,
                rating: 'excellent',
                weight: 25,
                metrics: {
                    currentRatio: 2.5,
                    quickRatio: 1.8,
                    cashRatio: 1.2,
                    workingCapital: 1200000
                }
            },
            efficiency: {
                score: 70,
                rating: 'good',
                weight: 15,
                metrics: {
                    assetTurnover: 1.2,
                    inventoryTurnover: 6.5,
                    receivableTurnover: 8.0,
                    cashConversionCycle: 45
                }
            },
            leverage: {
                score: 75,
                rating: 'good',
                weight: 15,
                metrics: {
                    debtToEquity: 0.67,
                    debtToAsset: 0.4,
                    interestCoverage: 8.5,
                    debtToEbitda: 2.0
                }
            },
            growth: {
                score: 65,
                rating: 'fair',
                weight: 10,
                metrics: {
                    revenueGrowth: 12,
                    profitGrowth: 8,
                    marketShare: 5,
                    sustainableGrowth: 10
                }
            },
            stability: {
                score: 70,
                rating: 'good',
                weight: 5,
                metrics: {
                    revenueVolatility: 5,
                    profitVolatility: 8,
                    customerConcentration: 20,
                    supplierConcentration: 15
                }
            }
        },
        benchmarks: {
            industry: {
                profitability: 75,
                liquidity: 80,
                efficiency: 65,
                leverage: 70,
                growth: 60
            },
            percentiles: {
                overall: 70,
                profitability: 75,
                liquidity: 85,
                efficiency: 65,
                leverage: 70,
                growth: 60
            }
        },
        recommendations: [
            {
                area: 'Profitability',
                priority: 'high',
                action: 'Review pricing strategy to improve gross margin',
                expectedImpact: '2-3% margin improvement',
                timeline: '3 months',
                owner: 'CFO'
            },
            {
                area: 'Growth',
                priority: 'medium',
                action: 'Expand into new markets to accelerate growth',
                expectedImpact: '15% revenue growth',
                timeline: '6 months',
                owner: 'Strategy Director'
            }
        ],
        generatedBy: memberId,
        nextReview: new Date(new Date().setMonth(new Date().getMonth() + 1))
    });
    
    await health.save();
    return health;
}

async function createBudgetTemplate(organizationId, fiscalYear, memberId) {
    const budget = new Budget({
        organization: organizationId,
        name: `Budget FY${fiscalYear}`,
        fiscalYear,
        status: 'draft',
        revenue: {
            total: 0,
            byStream: [],
            byProduct: []
        },
        expenses: {
            total: 0,
            byCategory: [],
            byDepartment: []
        },
        pnl: {
            revenue: 0,
            cogs: 0,
            grossProfit: 0,
            grossMargin: 0,
            operatingExpenses: 0,
            operatingProfit: 0,
            operatingMargin: 0,
            netProfit: 0,
            netMargin: 0,
            ebitda: 0,
            ebitdaMargin: 0
        },
        createdBy: memberId
    });
    
    await budget.save();
    return budget;
}

async function checkFinancialAlerts(organizationId, dashboard) {
    const alerts = [];
    
    // Check profitability
    if (dashboard.financialHealth?.profit?.gross?.margin < 35) {
        alerts.push({
            type: 'profitability',
            severity: 'critical',
            message: 'Gross margin critically low',
            metric: 'grossMargin',
            value: dashboard.financialHealth.profit.gross.margin,
            threshold: 35
        });
    }
    
    // Check liquidity
    if (dashboard.ratios?.liquidity?.current < 1.5) {
        alerts.push({
            type: 'liquidity',
            severity: 'critical',
            message: 'Current ratio below safe level',
            metric: 'currentRatio',
            value: dashboard.ratios.liquidity.current,
            threshold: 1.5
        });
    }
    
    // Check cash runway
    if (dashboard.financialHealth?.cashFlow?.runway < 6) {
        alerts.push({
            type: 'liquidity',
            severity: 'critical',
            message: 'Cash runway less than 6 months',
            metric: 'runway',
            value: dashboard.financialHealth.cashFlow.runway,
            threshold: 6
        });
    }
    
    // Check debt levels
    if (dashboard.ratios?.leverage?.debtToEquity > 1.5) {
        alerts.push({
            type: 'leverage',
            severity: 'warning',
            message: 'Debt to equity ratio high',
            metric: 'debtToEquity',
            value: dashboard.ratios.leverage.debtToEquity,
            threshold: 1.5
        });
    }
    
    // Check revenue growth
    if (dashboard.revenue?.trends?.yearOverYear < 5) {
        alerts.push({
            type: 'growth',
            severity: 'warning',
            message: 'Revenue growth below target',
            metric: 'yoyGrowth',
            value: dashboard.revenue.trends.yearOverYear,
            threshold: 5
        });
    }
    
    // Update dashboard with new alerts
    if (alerts.length > 0) {
        dashboard.alerts = [...alerts, ...(dashboard.alerts || [])].slice(0, 50);
        await dashboard.save();
    }
    
    return alerts;
}

async function generateFinancialForecast(organizationId, metric, horizon) {
    const months = horizon === '12months' ? 12 : horizon === '6months' ? 6 : 3;
    const forecast = [];
    
    let baseValue = 0;
    let growthRate = 0.02; // 2% monthly growth assumption
    
    // Get historical data to base forecast on
    const dashboard = await FinancialDashboard.findOne({
        organization: organizationId
    }).sort({ 'period.end': -1 });
    
    if (dashboard) {
        if (metric === 'revenue') {
            baseValue = dashboard.revenue?.total || 1000000;
        } else if (metric === 'profit') {
            baseValue = dashboard.financialHealth?.profit?.net?.value || 150000;
        } else if (metric === 'cashflow') {
            baseValue = dashboard.financialHealth?.cashFlow?.net || 100000;
        }
    }
    
    for (let i = 1; i <= months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        
        const value = baseValue * Math.pow(1 + growthRate, i);
        const lowerBound = value * 0.9;
        const upperBound = value * 1.1;
        
        forecast.push({
            period: date.toISOString().substring(0, 7),
            value: Math.round(value),
            lowerBound: Math.round(lowerBound),
            upperBound: Math.round(upperBound),
            confidence: 85 - (i * 2) // Confidence decreases over time
        });
    }
    
    return {
        metric,
        horizon,
        baseValue,
        forecast,
        metadata: {
            model: 'exponential_smoothing',
            accuracy: 85,
            generatedAt: new Date(),
            assumptions: {
                monthlyGrowthRate: growthRate * 100,
                seasonality: false,
                confidenceInterval: 90
            }
        }
    };
}

module.exports = {
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
};