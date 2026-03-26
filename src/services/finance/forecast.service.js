// src/services/finance/forecast.service.js
const mongoose = require('mongoose');
const FinancialForecast = require('../../models/finance/forecast.model');
const JournalEntry = require('../../models/finance/journalEntry.model');
const Account = require('../../models/finance/account.model');
const FinancialAnalysis = require('../../models/finance/analysis.model');

class ForecastService {
    // Generate forecast based on historical data
    async generateForecast(organizationId, months = 12, assumptions = {}, actor) {
        try {
            // Get historical data (last 12 months)
            const historicalData = await this._getHistoricalData(organizationId, 12);
            
            // Calculate trends
            const trends = this._calculateTrends(historicalData);
            
            // Generate monthly forecasts
            const monthlyForecasts = this._generateMonthlyForecasts(
                historicalData,
                trends,
                months,
                assumptions
            );
            
            // Aggregate quarterly and yearly
            const quarterlyForecasts = this._aggregateQuarterly(monthlyForecasts);
            const yearlyForecasts = this._aggregateYearly(monthlyForecasts);
            
            // Calculate summary statistics
            const summary = this._calculateSummary(monthlyForecasts);
            
            // Save forecast
            const forecast = new FinancialForecast({
                organization: organizationId,
                name: `Financial Forecast - Next ${months} Months`,
                description: `Projected financial performance for the next ${months} months`,
                forecastType: 'comprehensive',
                period: {
                    startDate: new Date(),
                    endDate: new Date(new Date().setMonth(new Date().getMonth() + months)),
                    months: months
                },
                assumptions: assumptions,
                results: {
                    monthly: monthlyForecasts,
                    quarterly: quarterlyForecasts,
                    yearly: yearlyForecasts,
                    summary: summary
                },
                historicalData: {
                    periods: historicalData,
                    trends: trends
                },
                status: 'active',
                createdBy: actor.id
            });
            
            await forecast.save();
            return forecast;
            
        } catch (error) {
            console.error('Error generating forecast:', error);
            throw error;
        }
    }
    
    // Get historical data from journal entries
    async _getHistoricalData(organizationId, months) {
        const historicalData = [];
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            
            // Get income statement for this month
            const entries = await JournalEntry.find({
                organization: organizationId,
                date: { $gte: monthStart, $lte: monthEnd },
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
            
            historicalData.push({
                month: currentDate.toLocaleString('default', { month: 'short' }),
                year: currentDate.getFullYear(),
                revenue: revenue,
                expenses: expenses,
                netIncome: revenue - expenses
            });
            
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        return historicalData;
    }
    
    // Calculate trends from historical data
    _calculateTrends(historicalData) {
        const revenues = historicalData.map(d => d.revenue);
        const expenses = historicalData.map(d => d.expenses);
        
        // Calculate growth rates
        const revenueGrowth = this._calculateGrowthRate(revenues);
        const expenseGrowth = this._calculateGrowthRate(expenses);
        
        // Calculate seasonality (monthly patterns)
        const seasonality = this._calculateSeasonality(historicalData);
        
        return {
            revenue: {
                growthRate: revenueGrowth,
                seasonality: seasonality.revenue,
                average: revenues.reduce((a,b) => a + b, 0) / revenues.length
            },
            expenses: {
                growthRate: expenseGrowth,
                seasonality: seasonality.expenses,
                average: expenses.reduce((a,b) => a + b, 0) / expenses.length
            }
        };
    }
    
    // Calculate growth rate using linear regression
    _calculateGrowthRate(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const x = Array.from({length: n}, (_, i) => i);
        
        const sumX = x.reduce((a,b) => a + b, 0);
        const sumY = values.reduce((a,b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Calculate percentage growth relative to average
        const avg = sumY / n;
        return avg > 0 ? (slope / avg) * 100 : 0;
    }
    
    // Calculate seasonality factors (monthly patterns)
    _calculateSeasonality(historicalData) {
        const monthlyRevenue = Array(12).fill(0);
        const monthlyExpenses = Array(12).fill(0);
        const monthlyCount = Array(12).fill(0);
        
        for (const data of historicalData) {
            const monthIndex = new Date(`${data.month} 1, ${data.year}`).getMonth();
            monthlyRevenue[monthIndex] += data.revenue;
            monthlyExpenses[monthIndex] += data.expenses;
            monthlyCount[monthIndex]++;
        }
        
        // Calculate averages and seasonality factors
        const revenueFactors = [];
        const expenseFactors = [];
        
        for (let i = 0; i < 12; i++) {
            const avgRevenue = monthlyRevenue[i] / (monthlyCount[i] || 1);
            const avgExpenses = monthlyExpenses[i] / (monthlyCount[i] || 1);
            
            revenueFactors.push(avgRevenue);
            expenseFactors.push(avgExpenses);
        }
        
        // Normalize factors (make average 1)
        const revAvg = revenueFactors.reduce((a,b) => a + b, 0) / 12;
        const expAvg = expenseFactors.reduce((a,b) => a + b, 0) / 12;
        
        return {
            revenue: revenueFactors.map(f => revAvg > 0 ? f / revAvg : 1),
            expenses: expenseFactors.map(f => expAvg > 0 ? f / expAvg : 1)
        };
    }
    
    // Generate monthly forecasts
    _generateMonthlyForecasts(historicalData, trends, months, assumptions) {
        const forecasts = [];
        const lastMonth = new Date();
        const lastData = historicalData[historicalData.length - 1];
        
        let currentRevenue = lastData?.revenue || trends.revenue.average;
        let currentExpenses = lastData?.expenses || trends.expenses.average;
        
        for (let i = 0; i < months; i++) {
            const forecastDate = new Date();
            forecastDate.setMonth(forecastDate.getMonth() + i);
            const monthIndex = forecastDate.getMonth();
            
            // Apply growth rates
            const revenueGrowth = (assumptions.revenueGrowth || trends.revenue.growthRate) / 12;
            const expenseGrowth = (assumptions.expenseGrowth || trends.expenses.growthRate) / 12;
            
            currentRevenue = currentRevenue * (1 + revenueGrowth / 100);
            currentExpenses = currentExpenses * (1 + expenseGrowth / 100);
            
            // Apply seasonality
            const revenueSeasonality = assumptions.seasonality?.revenue?.[monthIndex] || 
                                      trends.revenue.seasonality[monthIndex] || 1;
            const expenseSeasonality = assumptions.seasonality?.expenses?.[monthIndex] || 
                                      trends.expenses.seasonality[monthIndex] || 1;
            
            const finalRevenue = currentRevenue * revenueSeasonality;
            const finalExpenses = currentExpenses * expenseSeasonality;
            const netIncome = finalRevenue - finalExpenses;
            
            // Calculate confidence intervals (80% confidence)
            const revenueStdDev = this._calculateStdDev(historicalData.map(d => d.revenue));
            const expenseStdDev = this._calculateStdDev(historicalData.map(d => d.expenses));
            
            forecasts.push({
                month: forecastDate.toLocaleString('default', { month: 'short' }),
                year: forecastDate.getFullYear(),
                revenue: Math.round(finalRevenue),
                expenses: Math.round(finalExpenses),
                netIncome: Math.round(netIncome),
                cashFlow: Math.round(netIncome * 0.8), // Simplified cash flow
                confidence: {
                    lower: Math.round(finalRevenue - revenueStdDev * 1.28),
                    upper: Math.round(finalRevenue + revenueStdDev * 1.28),
                    probability: 80
                }
            });
        }
        
        return forecasts;
    }
    
    // Calculate standard deviation
    _calculateStdDev(values) {
        if (values.length === 0) return 0;
        const avg = values.reduce((a,b) => a + b, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a,b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquareDiff);
    }
    
    // Aggregate monthly forecasts into quarterly
    _aggregateQuarterly(monthlyForecasts) {
        const quarterly = [];
        const quarters = {};
        
        for (const forecast of monthlyForecasts) {
            const quarter = Math.ceil((new Date(forecast.year, this._getMonthIndex(forecast.month), 1).getMonth() + 1) / 3);
            const key = `${forecast.year}-Q${quarter}`;
            
            if (!quarters[key]) {
                quarters[key] = {
                    quarter: quarter,
                    year: forecast.year,
                    revenue: 0,
                    expenses: 0,
                    netIncome: 0,
                    cashFlow: 0
                };
            }
            
            quarters[key].revenue += forecast.revenue;
            quarters[key].expenses += forecast.expenses;
            quarters[key].netIncome += forecast.netIncome;
            quarters[key].cashFlow += forecast.cashFlow;
        }
        
        return Object.values(quarters);
    }
    
    // Aggregate monthly forecasts into yearly
    _aggregateYearly(monthlyForecasts) {
        const yearly = {};
        
        for (const forecast of monthlyForecasts) {
            if (!yearly[forecast.year]) {
                yearly[forecast.year] = {
                    year: forecast.year,
                    revenue: 0,
                    expenses: 0,
                    netIncome: 0,
                    cashFlow: 0,
                    cumulative: 0
                };
            }
            
            yearly[forecast.year].revenue += forecast.revenue;
            yearly[forecast.year].expenses += forecast.expenses;
            yearly[forecast.year].netIncome += forecast.netIncome;
            yearly[forecast.year].cashFlow += forecast.cashFlow;
        }
        
        // Calculate cumulative
        let cumulative = 0;
        const result = Object.values(yearly);
        for (const year of result) {
            cumulative += year.netIncome;
            year.cumulative = cumulative;
        }
        
        return result;
    }
    
    // Calculate summary statistics
    _calculateSummary(monthlyForecasts) {
        const totalRevenue = monthlyForecasts.reduce((sum, f) => sum + f.revenue, 0);
        const totalExpenses = monthlyForecasts.reduce((sum, f) => sum + f.expenses, 0);
        const totalNetIncome = monthlyForecasts.reduce((sum, f) => sum + f.netIncome, 0);
        
        return {
            totalRevenue: totalRevenue,
            totalExpenses: totalExpenses,
            totalNetIncome: totalNetIncome,
            averageRevenue: totalRevenue / monthlyForecasts.length,
            averageExpenses: totalExpenses / monthlyForecasts.length,
            averageNetIncome: totalNetIncome / monthlyForecasts.length,
            bestCase: {
                revenue: Math.max(...monthlyForecasts.map(f => f.revenue)),
                netIncome: Math.max(...monthlyForecasts.map(f => f.netIncome))
            },
            worstCase: {
                revenue: Math.min(...monthlyForecasts.map(f => f.revenue)),
                netIncome: Math.min(...monthlyForecasts.map(f => f.netIncome))
            }
        };
    }
    
    _getMonthIndex(month) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.indexOf(month);
    }
    
    // Get all forecasts
    async getForecasts(organizationId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        
        const [forecasts, total] = await Promise.all([
            FinancialForecast.find({ organization: organizationId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            FinancialForecast.countDocuments({ organization: organizationId })
        ]);
        
        return { forecasts, total, page, pages: Math.ceil(total / limit) };
    }
    
    // Get forecast by ID
    async getForecastById(id, organizationId) {
        const forecast = await FinancialForecast.findOne({
            _id: id,
            organization: organizationId
        });
        
        if (!forecast) {
            throw new Error('Forecast not found');
        }
        
        return forecast;
    }
}

module.exports = ForecastService;
