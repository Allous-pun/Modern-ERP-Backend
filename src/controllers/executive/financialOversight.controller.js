// src/controllers/executive/financialOversight.controller.js
const FinancialDashboard = require('../../models/executive/financialDashboard.model');
const Budget = require('../../models/executive/executiveBudget.model');
const FinancialHealth = require('../../models/executive/financialHealth.model');
const { logExecutiveAction } = require('../../services/executive/auditHelper.service');
const mongoose = require('mongoose');

// Finance module imports
const JournalEntry = require('../../models/finance/journalEntry.model');
const { Account } = require('../../models/finance/account.model');
const FinanceBudget = require('../../models/finance/budget.model');
const { BankAccount } = require('../../models/finance/treasury.model');

/**
 * @desc    Get financial dashboard
 * @route   GET /api/executive/financial/dashboard
 * @access  Private (CFO, CEO)
 */
const getFinancialDashboard = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { period = 'monthly', year, quarter } = req.query;
        const dateRange = calculateFinancialPeriod(period, year, quarter);
        const organizationId = req.organization.id;
        
        // Try to find existing dashboard
        let dashboard = await FinancialDashboard.findOne({
            organization: organizationId,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        }).populate('createdBy', 'personalInfo.firstName personalInfo.lastName email');
        
        // Generate new dashboard if not found
        if (!dashboard) {
            const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
            dashboard = await generateFinancialDashboard(
                organizationId,
                dateRange,
                period,
                year,
                quarter,
                memberId
            );
        }
        
        const alerts = await checkFinancialAlerts(organizationId, dashboard);
        
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
            data: { dashboard, alerts }
        });
        
    } catch (error) {
        console.error('Get financial dashboard error:', error);
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
    try {
        const { year, quarter } = req.query;
        const organizationId = req.organization.id;
        
        let health = await FinancialHealth.findOne({ organization: organizationId })
            .sort({ 'period.asOf': -1 });
        
        if (!health) {
            const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
            health = await generateFinancialHealth(
                organizationId,
                year || new Date().getFullYear(),
                quarter || Math.floor(new Date().getMonth() / 3) + 1,
                memberId
            );
        }
        
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
    try {
        const { period = 'monthly' } = req.query;
        const dateRange = calculateFinancialPeriod(period);
        
        const dashboard = await FinancialDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        res.status(200).json({
            success: true,
            data: dashboard?.revenue || { total: 0, breakdown: { byStream: [] } }
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
    try {
        const { period = 'monthly' } = req.query;
        const dateRange = calculateFinancialPeriod(period);
        
        const dashboard = await FinancialDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        res.status(200).json({
            success: true,
            data: dashboard?.expenses || { total: 0, breakdown: { byCategory: [] } }
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
    try {
        const { period = 'monthly' } = req.query;
        const dateRange = calculateFinancialPeriod(period);
        
        const dashboard = await FinancialDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        res.status(200).json({
            success: true,
            data: dashboard?.cashFlow || {}
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
    try {
        const { fiscalYear } = req.query;
        const organizationId = req.organization.id;
        const targetYear = fiscalYear ? parseInt(fiscalYear) : new Date().getFullYear();
        
        let budget = await Budget.findOne({
            organization: organizationId,
            fiscalYear: targetYear,
            status: { $in: ['active', 'approved'] }
        }).sort({ version: -1 });
        
        if (!budget) {
            budget = await Budget.findOne({
                organization: organizationId,
                fiscalYear: targetYear
            }).sort({ version: -1 });
        }
        
        if (!budget) {
            const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
            budget = await createBudgetTemplate(organizationId, targetYear, memberId);
        }
        
        const versions = await Budget.find({
            organization: organizationId,
            fiscalYear: targetYear
        }).select('version status createdAt approvedAt').sort({ version: -1 });
        
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
    try {
        const budgetData = req.body;
        const memberId = req.user?.isSupreme ? req.user?.userId : req.user?.memberId;
        
        const highestVersionBudget = await Budget.findOne({
            organization: req.organization.id,
            fiscalYear: budgetData.fiscalYear
        }).sort({ version: -1 });
        
        budgetData.version = highestVersionBudget ? (highestVersionBudget.version || 1) + 1 : 1;
        
        const revenueTotal = budgetData.revenue?.total || 0;
        const expensesTotal = budgetData.expenses?.total || 0;
        const cogs = budgetData.cogs || 0;
        const grossProfit = revenueTotal - cogs;
        const operatingProfit = grossProfit - expensesTotal;
        
        budgetData.pnl = {
            revenue: revenueTotal,
            cogs,
            grossProfit,
            grossMargin: revenueTotal > 0 ? (grossProfit / revenueTotal) * 100 : 0,
            operatingExpenses: expensesTotal,
            operatingProfit,
            operatingMargin: revenueTotal > 0 ? (operatingProfit / revenueTotal) * 100 : 0,
            netProfit: operatingProfit,
            netMargin: revenueTotal > 0 ? (operatingProfit / revenueTotal) * 100 : 0,
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
        
        res.status(201).json({
            success: true,
            data: budget,
            message: 'Budget created successfully'
        });
        
    } catch (error) {
        console.error('Create budget error:', error);
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
    try {
        const { id } = req.params;
        const updateData = req.body;
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
        
        Object.assign(budget, updateData);
        budget.updatedBy = memberId;
        await budget.save();
        
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
    try {
        const { id } = req.params;
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
    try {
        const { id } = req.params;
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
    try {
        const { period = 'monthly' } = req.query;
        const dateRange = calculateFinancialPeriod(period);
        
        const dashboard = await FinancialDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        res.status(200).json({
            success: true,
            data: dashboard?.ratios || {}
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
    try {
        const dateRange = calculateFinancialPeriod('daily');
        
        const dashboard = await FinancialDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        res.status(200).json({
            success: true,
            data: dashboard?.treasury || {}
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
    try {
        const { year } = req.query;
        const dateRange = calculateFinancialPeriod('yearly', year);
        
        const dashboard = await FinancialDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        res.status(200).json({
            success: true,
            data: dashboard?.tax || {}
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
    try {
        const { metric = 'revenue', horizon = '12months' } = req.query;
        const forecast = await generateFinancialForecast(req.organization.id, metric, horizon);
        
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
    try {
        const { alertId } = req.params;
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
        
        alert.acknowledged = { by: memberId, at: new Date() };
        await dashboard.save();
        
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
    // Get posted journal entries
    const journalEntries = await JournalEntry.find({
        organization: organizationId,
        status: 'posted',
        date: { $gte: dateRange.start, $lte: dateRange.end }
    });
    
    // Get accounts by type
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
    
    const assetAccounts = await Account.find({
        organization: organizationId,
        type: 'asset',
        isActive: true,
        deletedAt: null
    });
    
    // Calculate revenue
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
                percentage: 0,
                growth: 0,
                trend: 'up'
            });
        }
    }
    
    // Calculate percentages
    revenueByStream.forEach(item => {
        item.percentage = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0;
    });
    
    // Calculate expenses
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
    
    // Calculate assets
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
    
    const netProfit = totalRevenue - totalExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    // Get budget data from finance module
    const budgetData = await getBudgetDataForExecutive(organizationId, year || new Date().getFullYear());
    
    // ==================== GET REAL TREASURY DATA ====================
    // Get bank accounts from treasury module
    const BankAccount = require('../../models/finance/treasury.model').BankAccount;
    const bankAccounts = await BankAccount.find({
        organization: organizationId,
        isActive: true
    }).lean();
    
    // Calculate total cash from bank accounts
    let totalCash = 0;
    const cashByCurrency = [];
    const cashByAccount = [];
    
    for (const account of bankAccounts) {
        totalCash += account.currentBalance;
        
        // Group by currency
        const existingCurrency = cashByCurrency.find(c => c.currency === account.currency);
        if (existingCurrency) {
            existingCurrency.amount += account.currentBalance;
        } else {
            cashByCurrency.push({
                currency: account.currency,
                amount: account.currentBalance
            });
        }
        
        // Add to byAccount list
        cashByAccount.push({
            bank: account.bankName,
            account: account.accountName,
            balance: account.currentBalance,
            lastReconciled: account.lastReconciledAt
        });
    }
    
    // Get investments (if any)
    const investments = [];
    
    // Get debt (if any)
    const debt = [];
    
    // Update expense breakdown with budget info
    if (budgetData && budgetData.byDepartment) {
        for (const expense of expensesByCategory) {
            const budgetItem = budgetData.byDepartment.find(d => 
                d.department.toLowerCase() === expense.category.toLowerCase()
            );
            if (budgetItem) {
                expense.budget = budgetItem.budget;
                expense.variance = budgetItem.variance;
            }
        }
    }
    
    // Create dashboard with real treasury data
    const dashboard = new FinancialDashboard({
        organization: organizationId,
        name: `Financial Dashboard - ${period} ${year || ''}`,
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
                previous: totalRevenue * 0.9,
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
            breakdown: { byStream: revenueByStream, byRegion: [], byProduct: [], byCustomer: [] },
            recurring: { value: 0, percentage: 0, growth: 0, churn: 0 },
            trends: { monthOverMonth: 0, quarterOverQuarter: 0, yearOverYear: 0 },
            forecast: { nextMonth: totalRevenue, nextQuarter: totalRevenue * 3, nextYear: totalRevenue * 12, confidence: 85 }
        },
        expenses: {
            total: totalExpenses,
            breakdown: { byCategory: expensesByCategory, byDepartment: [], byProject: [] },
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
            liquidity: { 
                current: totalAssets > 0 ? 1 : 0, 
                quick: 1, 
                cash: totalCash > 0 ? totalCash / (totalExpenses / 12) : 0 
            },
            efficiency: { 
                assetTurnover: totalAssets > 0 ? totalRevenue / totalAssets : 0, 
                inventoryTurnover: 0, 
                receivableTurnover: 0, 
                payableTurnover: 0, 
                cashConversion: 0 
            },
            profitability: { 
                roa: totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0, 
                roe: totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0, 
                roi: netMargin, 
                roic: netMargin 
            },
            leverage: { 
                debtToEquity: 0, 
                debtToAsset: 0, 
                interestCoverage: 0, 
                debtToEbitda: 0 
            }
        },
        treasury: {
            cash: { 
                onHand: totalCash, 
                inBank: totalCash, 
                total: totalCash, 
                byCurrency: cashByCurrency,
                byAccount: cashByAccount
            },
            investments: investments,
            debt: debt,
            forecast: { inflow: [], outflow: [], netPosition: [] }
        },
        tax: {
            corporate: { provision: 0, paid: 0, payable: 0, effectiveRate: 0 },
            vat: { collected: 0, paid: 0, net: 0, returnDate: null },
            payroll: { withheld: 0, paid: 0, nextDue: null },
            compliance: { lastFiling: null, nextFiling: null, status: 'compliant' }
        },
        budget: budgetData || {
            current: { revenue: 0, expenses: 0, profit: 0, capex: 0 },
            actual: { revenue: 0, expenses: 0, profit: 0, capex: 0 },
            variance: {
                revenue: { value: 0, percentage: 0, reasons: [] },
                expenses: { value: 0, percentage: 0, reasons: [] },
                profit: { value: 0, percentage: 0, reasons: [] }
            },
            byDepartment: [],
            byProject: [],
            forecast: { revenue: 0, expenses: 0, profit: 0, confidence: 85 }
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
    
    // Add cash alert if cash is low
    if (totalCash < totalExpenses) {
        dashboard.alerts.push({
            type: 'liquidity',
            severity: 'critical',
            message: `Cash balance (${totalCash}) is less than monthly expenses (${totalExpenses})`,
            metric: 'cashCoverage',
            value: totalCash / totalExpenses,
            threshold: 1,
            timestamp: new Date(),
            resolved: false
        });
    }
    
    await dashboard.save();
    return dashboard;
}

async function getBudgetDataForExecutive(organizationId, fiscalYear) {
    try {
        console.log(`Looking for budget for fiscal year ${fiscalYear}`);
        
        const financeBudget = await FinanceBudget.findOne({
            organization: organizationId,
            fiscalYear: fiscalYear,
            status: { $in: ['active', 'approved'] }
        }).populate('lineItems.account');
        
        if (!financeBudget) {
            console.log(`No active/approved budget found for fiscal year ${fiscalYear}`);
            return null;
        }
        
        console.log(`Found budget: ${financeBudget.budgetNumber}, status: ${financeBudget.status}`);
        console.log(`Line items: ${financeBudget.lineItems.length}`);
        
        const budgetData = {
            current: { revenue: 0, expenses: 0, profit: 0, capex: 0 },
            actual: { revenue: 0, expenses: 0, profit: 0, capex: 0 },
            variance: {
                revenue: { value: 0, percentage: 0, reasons: [] },
                expenses: { value: 0, percentage: 0, reasons: [] },
                profit: { value: 0, percentage: 0, reasons: [] }
            },
            byDepartment: [],
            byProject: [],
            forecast: { revenue: 0, expenses: 0, profit: 0, confidence: 85 }
        };
        
        let totalBudgetRevenue = 0;
        let totalBudgetExpenses = 0;
        let totalActualRevenue = 0;
        let totalActualExpenses = 0;
        
        const departmentMap = new Map();
        
        for (const item of financeBudget.lineItems) {
            let account = item.account;
            
            if (account && typeof account === 'object' && account._id) {
                // Already populated
            } else if (account && typeof account === 'string') {
                account = await Account.findById(account);
            }
            
            if (!account) {
                console.log(`Skipping item with invalid account reference`);
                continue;
            }
            
            const amount = item.amount || 0;
            const actualAmount = item.actualAmount || 0;
            
            console.log(`Processing: ${account.name} (${account.type}) - Budget: ${amount}, Actual: ${actualAmount}`);
            
            if (account.type === 'revenue') {
                totalBudgetRevenue += amount;
                totalActualRevenue += actualAmount;
            } else if (account.type === 'expense') {
                totalBudgetExpenses += amount;
                totalActualExpenses += actualAmount;
                
                const department = account.name;
                if (!departmentMap.has(department)) {
                    departmentMap.set(department, { budget: 0, actual: 0 });
                }
                const dept = departmentMap.get(department);
                dept.budget += amount;
                dept.actual += actualAmount;
            }
        }
        
        budgetData.current.revenue = totalBudgetRevenue;
        budgetData.current.expenses = totalBudgetExpenses;
        budgetData.current.profit = totalBudgetRevenue - totalBudgetExpenses;
        
        budgetData.actual.revenue = totalActualRevenue;
        budgetData.actual.expenses = totalActualExpenses;
        budgetData.actual.profit = totalActualRevenue - totalActualExpenses;
        
        budgetData.variance.revenue.value = totalBudgetRevenue - totalActualRevenue;
        budgetData.variance.revenue.percentage = totalBudgetRevenue > 0 ? (budgetData.variance.revenue.value / totalBudgetRevenue) * 100 : 0;
        budgetData.variance.expenses.value = totalBudgetExpenses - totalActualExpenses;
        budgetData.variance.expenses.percentage = totalBudgetExpenses > 0 ? (budgetData.variance.expenses.value / totalBudgetExpenses) * 100 : 0;
        budgetData.variance.profit.value = budgetData.current.profit - budgetData.actual.profit;
        budgetData.variance.profit.percentage = budgetData.current.profit > 0 ? (budgetData.variance.profit.value / budgetData.current.profit) * 100 : 0;
        
        for (const [deptName, values] of departmentMap) {
            const variance = values.budget - values.actual;
            const variancePercent = values.budget > 0 ? (variance / values.budget) * 100 : 0;
            budgetData.byDepartment.push({
                department: deptName,
                budget: values.budget,
                actual: values.actual,
                variance: variance,
                variancePercentage: variancePercent
            });
        }
        
        budgetData.byDepartment.sort((a, b) => b.budget - a.budget);
        
        console.log(`Budget data prepared: Revenue Budget: ${totalBudgetRevenue}, Actual Revenue: ${totalActualRevenue}`);
        console.log(`Expense Budget: ${totalBudgetExpenses}, Actual Expenses: ${totalActualExpenses}`);
        console.log(`Departments: ${budgetData.byDepartment.length}`);
        
        return budgetData;
        
    } catch (error) {
        console.error('Error in getBudgetDataForExecutive:', error);
        return null;
    }
}

async function generateFinancialHealth(organizationId, year, quarter, memberId) {
    const health = new FinancialHealth({
        organization: organizationId,
        period: { asOf: new Date(), quarter, year },
        overallScore: 75,
        overallRating: 'good',
        components: {
            profitability: { score: 80, rating: 'good', weight: 30, metrics: { netMargin: 15, roe: 25, roa: 15, trend: 'up' } },
            liquidity: { score: 85, rating: 'excellent', weight: 25, metrics: { currentRatio: 2.5, quickRatio: 1.8, cashRatio: 1.2, workingCapital: 1200000 } },
            efficiency: { score: 70, rating: 'good', weight: 15, metrics: { assetTurnover: 1.2, inventoryTurnover: 6.5, receivableTurnover: 8.0, cashConversionCycle: 45 } },
            leverage: { score: 75, rating: 'good', weight: 15, metrics: { debtToEquity: 0.67, debtToAsset: 0.4, interestCoverage: 8.5, debtToEbitda: 2.0 } },
            growth: { score: 65, rating: 'fair', weight: 10, metrics: { revenueGrowth: 12, profitGrowth: 8, marketShare: 5, sustainableGrowth: 10 } },
            stability: { score: 70, rating: 'good', weight: 5, metrics: { revenueVolatility: 5, profitVolatility: 8, customerConcentration: 20, supplierConcentration: 15 } }
        },
        benchmarks: {
            industry: { profitability: 75, liquidity: 80, efficiency: 65, leverage: 70, growth: 60 },
            percentiles: { overall: 70, profitability: 75, liquidity: 85, efficiency: 65, leverage: 70, growth: 60 }
        },
        recommendations: [
            { area: 'Profitability', priority: 'high', action: 'Review pricing strategy to improve gross margin', expectedImpact: '2-3% margin improvement', timeline: '3 months', owner: 'CFO' },
            { area: 'Growth', priority: 'medium', action: 'Expand into new markets to accelerate growth', expectedImpact: '15% revenue growth', timeline: '6 months', owner: 'Strategy Director' }
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
        revenue: { total: 0, byStream: [], byProduct: [] },
        expenses: { total: 0, byCategory: [], byDepartment: [] },
        pnl: { revenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0, operatingExpenses: 0, operatingProfit: 0, operatingMargin: 0, netProfit: 0, netMargin: 0, ebitda: 0, ebitdaMargin: 0 },
        createdBy: memberId
    });
    
    await budget.save();
    return budget;
}

async function checkFinancialAlerts(organizationId, dashboard) {
    const alerts = [];
    
    // Check if alert already exists before adding
    const existingAlert = (type, metric) => {
        return dashboard.alerts.some(a => a.type === type && a.metric === metric && !a.resolved);
    };

    const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
        dashboard.alerts = dashboard.alerts.filter(alert => {
        if (alert.resolved && new Date(alert.timestamp) < thirtyDaysAgo) {
            return false;
        }
        return true;
    });
    
    // Current ratio alert
    if (dashboard.ratios?.liquidity?.current < 1.5 && !existingAlert('liquidity', 'currentRatio')) {
        alerts.push({
            type: 'liquidity',
            severity: 'critical',
            message: 'Current ratio below safe level',
            metric: 'currentRatio',
            value: dashboard.ratios.liquidity.current,
            threshold: 1.5,
            timestamp: new Date(),
            resolved: false
        });
    }
    
    // Revenue growth alert
    if ((dashboard.revenue?.trends?.yearOverYear || 0) < 5 && !existingAlert('growth', 'yoyGrowth')) {
        alerts.push({
            type: 'growth',
            severity: 'warning',
            message: 'Revenue growth below target',
            metric: 'yoyGrowth',
            value: dashboard.revenue.trends.yearOverYear || 0,
            threshold: 5,
            timestamp: new Date(),
            resolved: false
        });
    }
    
    // Only add new alerts that don't exist
    if (alerts.length > 0) {
        dashboard.alerts = [...dashboard.alerts, ...alerts].slice(0, 50);
        await dashboard.save();
    }
    
    return alerts;
}

async function generateFinancialForecast(organizationId, metric, horizon) {
    const months = horizon === '12months' ? 12 : horizon === '6months' ? 6 : 3;
    const forecast = [];
    
    let baseValue = 0;
    let growthRate = 0.02;
    
    const dashboard = await FinancialDashboard.findOne({ organization: organizationId }).sort({ 'period.end': -1 });
    
    if (dashboard) {
        if (metric === 'revenue') baseValue = dashboard.revenue?.total || 1000000;
        else if (metric === 'profit') baseValue = dashboard.financialHealth?.profit?.net?.value || 150000;
        else if (metric === 'cashflow') baseValue = dashboard.financialHealth?.cashFlow?.net || 100000;
    }
    
    for (let i = 1; i <= months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        const value = baseValue * Math.pow(1 + growthRate, i);
        
        forecast.push({
            period: date.toISOString().substring(0, 7),
            value: Math.round(value),
            lowerBound: Math.round(value * 0.9),
            upperBound: Math.round(value * 1.1),
            confidence: 85 - (i * 2)
        });
    }
    
    return { metric, horizon, baseValue, forecast };
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