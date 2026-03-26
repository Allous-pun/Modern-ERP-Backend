// src/services/finance/analysis.service.js
const mongoose = require('mongoose');
const FinancialAnalysis = require('../../models/finance/analysis.model');
const JournalEntry = require('../../models/finance/journalEntry.model');
const Account = require('../../models/finance/account.model');

class AnalysisService {
    // Generate ratio analysis (existing)
    async generateRatioAnalysis(organizationId, startDate, endDate, actor) {
        try {
            const incomeData = await this._getIncomeStatement(organizationId, startDate, endDate);
            const balanceData = await this._getBalanceSheet(organizationId, endDate);
            const ratios = this._calculateRatios(incomeData, balanceData);
            
            const analysis = new FinancialAnalysis({
                organization: organizationId,
                name: `Ratio Analysis ${startDate} to ${endDate}`,
                analysisType: 'ratio',
                period: { startDate, endDate },
                results: ratios,
                createdBy: actor.id
            });
            
            await analysis.save();
            return analysis;
            
        } catch (error) {
            console.error('Error generating ratio analysis:', error);
            throw error;
        }
    }
    
    // Generate trend analysis
    async generateTrendAnalysis(organizationId, periods = 12, actor) {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - periods);
            
            const trends = await this._calculateTrends(organizationId, startDate, endDate, periods);
            
            const analysis = new FinancialAnalysis({
                organization: organizationId,
                name: `Trend Analysis - Last ${periods} Months`,
                description: `Financial trends over the last ${periods} months`,
                analysisType: 'trend',
                period: { startDate, endDate, periods },
                results: trends,
                createdBy: actor.id
            });
            
            await analysis.save();
            return analysis;
            
        } catch (error) {
            console.error('Error generating trend analysis:', error);
            throw error;
        }
    }
    
    // Generate variance analysis
    async generateVarianceAnalysis(organizationId, startDate, endDate, budgetYear, actor) {
        try {
            const actualData = await this._getIncomeStatement(organizationId, startDate, endDate);
            const budgetData = await this._getBudgetData(organizationId, budgetYear, startDate, endDate);
            const variances = this._calculateVariances(actualData, budgetData);
            
            const analysis = new FinancialAnalysis({
                organization: organizationId,
                name: `Variance Analysis ${startDate} to ${endDate}`,
                description: `Budget vs Actual variance analysis for ${startDate} to ${endDate}`,
                analysisType: 'variance',
                period: { startDate, endDate },
                results: variances,
                createdBy: actor.id
            });
            
            await analysis.save();
            return analysis;
            
        } catch (error) {
            console.error('Error generating variance analysis:', error);
            throw error;
        }
    }
    
    // ==================== NEW METHODS FOR EXECUTIVE DASHBOARD ====================
    
    /**
     * Analyze trends for executive dashboard
     */
    async analyzeTrends(options, organizationId) {
        try {
            const { metric = 'revenue', periods = 12, forecast = false } = options;
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - periods);
            
            const trends = await this._calculateTrends(organizationId, startDate, endDate, periods);
            
            if (metric === 'revenue') {
                return {
                    metric: 'revenue',
                    data: trends.trends.revenue,
                    months: trends.trends.months,
                    growthRates: trends.growthRates.revenue,
                    movingAverages: trends.movingAverages.revenue,
                    forecast: forecast ? trends.forecast.revenue : null,
                    summary: trends.summary
                };
            } else if (metric === 'expenses') {
                return {
                    metric: 'expenses',
                    data: trends.trends.expenses,
                    months: trends.trends.months,
                    growthRates: trends.growthRates.expenses,
                    movingAverages: trends.movingAverages.expenses,
                    forecast: forecast ? trends.forecast.expenses : null,
                    summary: trends.summary
                };
            } else if (metric === 'netIncome') {
                return {
                    metric: 'netIncome',
                    data: trends.trends.netIncome,
                    months: trends.trends.months,
                    growthRates: trends.growthRates.netIncome,
                    movingAverages: trends.movingAverages.netIncome,
                    forecast: forecast ? trends.forecast.netIncome : null,
                    summary: trends.summary
                };
            } else {
                return trends;
            }
            
        } catch (error) {
            console.error('Error in analyzeTrends:', error);
            throw error;
        }
    }
    
    /**
     * Analyze variances for executive dashboard
     */
    async analyzeVariances(options, organizationId) {
        try {
            const { startDate, endDate, compareTo = 'budget' } = options;
            
            if (!startDate || !endDate) {
                throw new Error('startDate and endDate are required');
            }
            
            const actualData = await this._getIncomeStatement(organizationId, startDate, endDate);
            const budgetYear = new Date(startDate).getFullYear();
            const budgetData = await this._getBudgetData(organizationId, budgetYear, startDate, endDate);
            
            const variances = this._calculateVariances(actualData, budgetData);
            
            return {
                period: { startDate, endDate },
                compareTo,
                actual: actualData,
                budget: budgetData,
                variances: variances.variances,
                analysis: variances.analysis
            };
            
        } catch (error) {
            console.error('Error in analyzeVariances:', error);
            throw error;
        }
    }
    
    /**
     * Calculate ratios for executive dashboard
     */
    async calculateRatios(period, organizationId) {
        try {
            const { startDate, endDate } = period;
            const incomeData = await this._getIncomeStatement(organizationId, startDate, endDate);
            const balanceData = await this._getBalanceSheet(organizationId, endDate);
            
            return this._calculateRatios(incomeData, balanceData);
            
        } catch (error) {
            console.error('Error in calculateRatios:', error);
            throw error;
        }
    }
    
    // ==================== PRIVATE HELPER METHODS ====================
    
    // Calculate trends over time
    async _calculateTrends(organizationId, startDate, endDate, periods) {
        const trends = {
            revenue: [],
            expenses: [],
            netIncome: [],
            months: []
        };
        
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            
            const incomeData = await this._getIncomeStatement(
                organizationId,
                monthStart,
                monthEnd
            );
            
            const monthName = currentDate.toLocaleString('default', { month: 'short' }) + ' ' + currentDate.getFullYear();
            
            trends.months.push(monthName);
            trends.revenue.push(incomeData.revenue);
            trends.expenses.push(incomeData.expenses);
            trends.netIncome.push(incomeData.netIncome);
            
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        // Calculate growth rates
        const growthRates = {
            revenue: [],
            expenses: [],
            netIncome: []
        };
        
        for (let i = 1; i < trends.revenue.length; i++) {
            if (trends.revenue[i-1] > 0) {
                growthRates.revenue.push(((trends.revenue[i] - trends.revenue[i-1]) / trends.revenue[i-1]) * 100);
                growthRates.expenses.push(((trends.expenses[i] - trends.expenses[i-1]) / trends.expenses[i-1]) * 100);
                growthRates.netIncome.push(((trends.netIncome[i] - trends.netIncome[i-1]) / Math.abs(trends.netIncome[i-1])) * 100);
            } else {
                growthRates.revenue.push(0);
                growthRates.expenses.push(0);
                growthRates.netIncome.push(0);
            }
        }
        
        // Calculate moving averages (3-month)
        const movingAverages = {
            revenue: this._calculateMovingAverage(trends.revenue, 3),
            expenses: this._calculateMovingAverage(trends.expenses, 3),
            netIncome: this._calculateMovingAverage(trends.netIncome, 3)
        };
        
        // Simple forecast for next period
        const forecast = {
            revenue: this._forecastNextPeriod(trends.revenue),
            expenses: this._forecastNextPeriod(trends.expenses),
            netIncome: this._forecastNextPeriod(trends.netIncome)
        };
        
        return {
            trends,
            growthRates,
            movingAverages,
            forecast,
            summary: {
                averageRevenue: trends.revenue.reduce((a,b) => a + b, 0) / trends.revenue.length,
                averageExpenses: trends.expenses.reduce((a,b) => a + b, 0) / trends.expenses.length,
                averageNetIncome: trends.netIncome.reduce((a,b) => a + b, 0) / trends.netIncome.length,
                maxRevenue: Math.max(...trends.revenue),
                minRevenue: Math.min(...trends.revenue),
                maxExpenses: Math.max(...trends.expenses),
                minExpenses: Math.min(...trends.expenses),
                totalRevenue: trends.revenue.reduce((a,b) => a + b, 0),
                totalExpenses: trends.expenses.reduce((a,b) => a + b, 0),
                totalNetIncome: trends.netIncome.reduce((a,b) => a + b, 0)
            }
        };
    }
    
    // Calculate moving average
    _calculateMovingAverage(data, window) {
        const averages = [];
        for (let i = 0; i < data.length - window + 1; i++) {
            const sum = data.slice(i, i + window).reduce((a,b) => a + b, 0);
            averages.push(sum / window);
        }
        return averages;
    }
    
    // Simple linear regression forecast
    _forecastNextPeriod(data) {
        if (data.length < 2) return data[0] || 0;
        
        const n = data.length;
        const x = Array.from({length: n}, (_, i) => i);
        const y = data;
        
        const sumX = x.reduce((a,b) => a + b, 0);
        const sumY = y.reduce((a,b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        return slope * n + intercept;
    }
    
    // Get budget data
    async _getBudgetData(organizationId, budgetYear, startDate, endDate) {
        try {
            const Budget = require('../../models/finance/budget.model');
            const budget = await Budget.findOne({
                organization: organizationId,
                fiscalYear: budgetYear,
                status: { $in: ['active', 'approved'] }
            });
            
            if (budget) {
                // Calculate budget amounts for the period
                const periodMonths = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24 * 30));
                const monthlyFactor = periodMonths / 12;
                
                return {
                    revenue: (budget.revenueTotal || 0) * monthlyFactor,
                    expenses: (budget.expenseTotal || 0) * monthlyFactor,
                    netIncome: (budget.netIncome || 0) * monthlyFactor
                };
            }
            
            // Fallback sample data
            return {
                revenue: 100000,
                expenses: 70000,
                netIncome: 30000
            };
            
        } catch (error) {
            console.error('Error getting budget data:', error);
            return {
                revenue: 100000,
                expenses: 70000,
                netIncome: 30000
            };
        }
    }
    
    // Calculate variances
    _calculateVariances(actual, budget) {
        const revenueVariance = actual.revenue - budget.revenue;
        const expenseVariance = actual.expenses - budget.expenses;
        const netIncomeVariance = actual.netIncome - budget.netIncome;
        
        return {
            actual: actual,
            budget: budget,
            variances: {
                revenue: {
                    amount: revenueVariance,
                    percentage: budget.revenue > 0 ? (revenueVariance / budget.revenue) * 100 : 0,
                    favorable: revenueVariance > 0
                },
                expenses: {
                    amount: expenseVariance,
                    percentage: budget.expenses > 0 ? (expenseVariance / budget.expenses) * 100 : 0,
                    favorable: expenseVariance < 0
                },
                netIncome: {
                    amount: netIncomeVariance,
                    percentage: budget.netIncome > 0 ? (netIncomeVariance / budget.netIncome) * 100 : 0,
                    favorable: netIncomeVariance > 0
                }
            },
            analysis: {
                summary: revenueVariance > 0 ? 
                    `Revenue exceeded budget by ${Math.abs(revenueVariance).toFixed(2)}` : 
                    `Revenue was below budget by ${Math.abs(revenueVariance).toFixed(2)}`,
                recommendations: this._generateVarianceRecommendations(revenueVariance, expenseVariance)
            }
        };
    }
    
    // Generate recommendations based on variances
    _generateVarianceRecommendations(revenueVar, expenseVar) {
        const recommendations = [];
        
        if (revenueVar < 0) {
            recommendations.push("Investigate reasons for revenue shortfall and adjust sales strategy");
        } else if (revenueVar > 0) {
            recommendations.push("Capitalize on revenue growth by increasing marketing efforts");
        }
        
        if (expenseVar > 0) {
            recommendations.push("Review expenses that exceeded budget and identify cost-saving opportunities");
        } else if (expenseVar < 0) {
            recommendations.push("Maintain current expense control measures");
        }
        
        if (recommendations.length === 0) {
            recommendations.push("Performance is on track with budget, continue current strategy");
        }
        
        return recommendations;
    }
    
    // Get income statement data
    async _getIncomeStatement(organizationId, startDate, endDate) {
        const entries = await JournalEntry.find({
            organization: organizationId,
            date: { $gte: new Date(startDate), $lte: new Date(endDate) },
            status: 'posted'
        }).populate('entries.account');
        
        let revenue = 0;
        let expenses = 0;
        
        for (const entry of entries) {
            for (const line of entry.entries) {
                const account = line.account;
                if (!account) continue;
                
                const amount = (line.debit || 0) - (line.credit || 0);
                
                if (account.type === 'revenue') {
                    revenue += Math.abs(amount);
                } else if (account.type === 'expense') {
                    expenses += Math.abs(amount);
                }
            }
        }
        
        return { revenue, expenses, netIncome: revenue - expenses };
    }
    
    // Get balance sheet data
    async _getBalanceSheet(organizationId, asOfDate) {
        try {
            const accounts = await Account.find({ 
                organization: organizationId, 
                isActive: true 
            });
            
            let totalAssets = 0;
            let totalLiabilities = 0;
            let totalEquity = 0;
            
            for (const account of accounts) {
                const balance = await this._getAccountBalance(account._id, organizationId, asOfDate);
                
                if (account.type === 'asset') {
                    totalAssets += balance;
                } else if (account.type === 'liability') {
                    totalLiabilities += balance;
                } else if (account.type === 'equity') {
                    totalEquity += balance;
                }
            }
            
            return { totalAssets, totalLiabilities, totalEquity };
            
        } catch (error) {
            console.error('Error in _getBalanceSheet:', error);
            return { totalAssets: 0, totalLiabilities: 0, totalEquity: 0 };
        }
    }
    
    // Get account balance
    async _getAccountBalance(accountId, organizationId, asOfDate) {
        try {
            const result = await JournalEntry.aggregate([
                {
                    $match: {
                        organization: new mongoose.Types.ObjectId(organizationId),
                        date: { $lte: new Date(asOfDate) },
                        status: 'posted'
                    }
                },
                { $unwind: '$entries' },
                {
                    $match: {
                        'entries.account': new mongoose.Types.ObjectId(accountId)
                    }
                },
                {
                    $group: {
                        _id: null,
                        balance: {
                            $sum: { $subtract: ['$entries.debit', '$entries.credit'] }
                        }
                    }
                }
            ]);
            
            return result.length > 0 ? result[0].balance : 0;
        } catch (error) {
            console.error('Error getting account balance:', error);
            return 0;
        }
    }
    
    // Calculate ratios
    _calculateRatios(income, balance) {
        const ratios = {};
        
        ratios.netProfitMargin = income.revenue > 0 ? (income.netIncome / income.revenue) * 100 : 0;
        ratios.currentRatio = balance.totalLiabilities > 0 ? balance.totalAssets / balance.totalLiabilities : 0;
        ratios.debtToEquity = balance.totalEquity > 0 ? balance.totalLiabilities / balance.totalEquity : 0;
        ratios.returnOnAssets = balance.totalAssets > 0 ? (income.netIncome / balance.totalAssets) * 100 : 0;
        ratios.returnOnEquity = balance.totalEquity > 0 ? (income.netIncome / balance.totalEquity) * 100 : 0;
        
        ratios.revenue = income.revenue;
        ratios.expenses = income.expenses;
        ratios.netIncome = income.netIncome;
        ratios.totalAssets = balance.totalAssets;
        ratios.totalLiabilities = balance.totalLiabilities;
        ratios.totalEquity = balance.totalEquity;
        
        return ratios;
    }
    
    // Get all analyses
    async getAnalyses(organizationId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        
        const [analyses, total] = await Promise.all([
            FinancialAnalysis.find({ organization: organizationId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            FinancialAnalysis.countDocuments({ organization: organizationId })
        ]);
        
        return { analyses, total, page, pages: Math.ceil(total / limit) };
    }
    
    // Get analysis by ID
    async getAnalysisById(id, organizationId) {
        const analysis = await FinancialAnalysis.findOne({
            _id: id,
            organization: organizationId
        });
        
        if (!analysis) {
            throw new Error('Analysis not found');
        }
        
        return analysis;
    }
}

module.exports = AnalysisService;
