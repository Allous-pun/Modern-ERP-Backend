// src/services/sales/forecast.service.js
const { Opportunity, Order, Lead } = require('../../models/sales');
const mongoose = require('mongoose');

class ForecastService {
    
    /**
     * Generate sales forecast
     */
    static async generateForecast(organizationId, months = 3) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + months);

        // Get pipeline opportunities
        const opportunities = await Opportunity.find({
            organization: organizationId,
            expectedCloseDate: { $gte: startDate, $lte: endDate },
            stage: { $nin: ['closed-won', 'closed-lost'] }
        }).populate('customer');

        // Get historical data for trend analysis
        const historicalData = await this.getHistoricalData(organizationId, 6);

        // Calculate forecast by category
        const byCategory = await this.calculateCategoryForecast(opportunities, historicalData);

        // Calculate forecast by rep
        const byRep = await this.calculateRepForecast(opportunities);

        // Calculate weighted forecast
        const weightedForecast = this.calculateWeightedForecast(opportunities);

        // Calculate confidence intervals
        const confidence = this.calculateConfidenceIntervals(opportunities, historicalData);

        return {
            period: {
                start: startDate,
                end: endDate
            },
            summary: {
                totalOpportunities: opportunities.length,
                totalAmount: opportunities.reduce((sum, opp) => sum + opp.amount, 0),
                weightedAmount: weightedForecast.total,
                averageDealSize: opportunities.length > 0
                    ? opportunities.reduce((sum, opp) => sum + opp.amount, 0) / opportunities.length
                    : 0
            },
            byMonth: await this.getMonthlyBreakdown(organizationId, months),
            byCategory,
            byRep,
            weighted: weightedForecast,
            confidence,
            historical: historicalData
        };
    }

    /**
     * Get monthly breakdown forecast
     */
    static async getMonthlyBreakdown(organizationId, months) {
        const startDate = new Date();
        const monthly = [];

        for (let i = 0; i < months; i++) {
            const monthStart = new Date(startDate);
            monthStart.setMonth(monthStart.getMonth() + i);
            monthStart.setDate(1);
            
            const monthEnd = new Date(monthStart);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            monthEnd.setDate(0);

            const opportunities = await Opportunity.find({
                organization: organizationId,
                expectedCloseDate: { $gte: monthStart, $lte: monthEnd },
                stage: { $nin: ['closed-won', 'closed-lost'] }
            });

            const monthData = {
                month: monthStart.toISOString().slice(0, 7),
                opportunities: opportunities.length,
                totalAmount: opportunities.reduce((sum, opp) => sum + opp.amount, 0),
                weightedAmount: opportunities.reduce((sum, opp) => {
                    const weight = this.getStageWeight(opp.stage);
                    return sum + (opp.amount * weight);
                }, 0),
                byStage: await this.getStageBreakdown(opportunities)
            };

            monthly.push(monthData);
        }

        return monthly;
    }

    /**
     * Get stage weight for weighted forecast
     */
    static getStageWeight(stage) {
        const weights = {
            'qualification': 0.1,
            'needs-analysis': 0.3,
            'proposal': 0.6,
            'negotiation': 0.8
        };
        return weights[stage] || 0;
    }

    /**
     * Get stage breakdown for opportunities
     */
    static async getStageBreakdown(opportunities) {
        const breakdown = {};
        
        opportunities.forEach(opp => {
            if (!breakdown[opp.stage]) {
                breakdown[opp.stage] = {
                    count: 0,
                    amount: 0,
                    weighted: 0
                };
            }
            
            breakdown[opp.stage].count++;
            breakdown[opp.stage].amount += opp.amount;
            breakdown[opp.stage].weighted += opp.amount * this.getStageWeight(opp.stage);
        });

        return breakdown;
    }

    /**
     * Calculate weighted forecast
     */
    static calculateWeightedForecast(opportunities) {
        let total = 0;
        const byStage = {};

        opportunities.forEach(opp => {
            const weight = this.getStageWeight(opp.stage);
            const weighted = opp.amount * weight;
            
            total += weighted;

            if (!byStage[opp.stage]) {
                byStage[opp.stage] = 0;
            }
            byStage[opp.stage] += weighted;
        });

        return {
            total,
            byStage
        };
    }

    /**
     * Calculate forecast by category
     */
    static async calculateCategoryForecast(opportunities, historicalData) {
        const categories = {};

        opportunities.forEach(opp => {
            const category = opp.category || 'uncategorized';
            
            if (!categories[category]) {
                categories[category] = {
                    opportunities: [],
                    totalAmount: 0,
                    weightedAmount: 0,
                    historicalAverage: this.getHistoricalAverage(historicalData, category)
                };
            }

            categories[category].opportunities.push(opp._id);
            categories[category].totalAmount += opp.amount;
            categories[category].weightedAmount += opp.amount * this.getStageWeight(opp.stage);
        });

        return categories;
    }

    /**
     * Calculate forecast by sales rep
     */
    static async calculateRepForecast(opportunities) {
        const byRep = {};

        opportunities.forEach(opp => {
            if (!opp.assignedTo) return;
            
            const repId = opp.assignedTo.toString();
            
            if (!byRep[repId]) {
                byRep[repId] = {
                    opportunities: [],
                    totalAmount: 0,
                    weightedAmount: 0,
                    count: 0
                };
            }

            byRep[repId].opportunities.push(opp._id);
            byRep[repId].totalAmount += opp.amount;
            byRep[repId].weightedAmount += opp.amount * this.getStageWeight(opp.stage);
            byRep[repId].count++;
        });

        // Add rep details
        for (const repId of Object.keys(byRep)) {
            const user = await User.findById(repId).select('firstName lastName');
            if (user) {
                byRep[repId].repName = `${user.firstName} ${user.lastName}`;
            }
        }

        return byRep;
    }

    /**
     * Get historical data for trend analysis
     */
    static async getHistoricalData(organizationId, months = 6) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const orders = await Order.find({
            organization: organizationId,
            status: 'completed',
            orderDate: { $gte: startDate }
        });

        // Group by month
        const monthly = {};
        orders.forEach(order => {
            const month = order.orderDate.toISOString().slice(0, 7);
            if (!monthly[month]) {
                monthly[month] = {
                    count: 0,
                    amount: 0,
                    categories: {}
                };
            }
            monthly[month].count++;
            monthly[month].amount += order.total;

            // Track by category if available
            if (order.category) {
                if (!monthly[month].categories[order.category]) {
                    monthly[month].categories[order.category] = 0;
                }
                monthly[month].categories[order.category] += order.total;
            }
        });

        // Calculate trends
        const months = Object.keys(monthly).sort();
        const trends = {
            count: this.calculateTrend(months.map(m => monthly[m].count)),
            amount: this.calculateTrend(months.map(m => monthly[m].amount))
        };

        return {
            monthly,
            trends,
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, o) => sum + o.total, 0)
        };
    }

    /**
     * Calculate trend from historical data
     */
    static calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const first = values[0];
        const last = values[values.length - 1];
        
        if (first === 0) return 100;
        
        return ((last - first) / first) * 100;
    }

    /**
     * Get historical average for category
     */
    static getHistoricalAverage(historicalData, category) {
        let total = 0;
        let count = 0;

        Object.values(historicalData.monthly || {}).forEach(month => {
            if (month.categories && month.categories[category]) {
                total += month.categories[category];
                count++;
            }
        });

        return count > 0 ? total / count : 0;
    }

    /**
     * Calculate confidence intervals
     */
    static calculateConfidenceIntervals(opportunities, historicalData) {
        const amounts = opportunities.map(o => o.amount);
        
        if (amounts.length === 0) {
            return {
                lower: 0,
                upper: 0,
                confidence: 0
            };
        }

        // Calculate mean
        const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;

        // Calculate standard deviation
        const squaredDiffs = amounts.map(a => Math.pow(a - mean, 2));
        const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / amounts.length;
        const stdDev = Math.sqrt(variance);

        // Calculate confidence interval (95% confidence, z-score = 1.96)
        const marginOfError = 1.96 * (stdDev / Math.sqrt(amounts.length));
        
        // Adjust based on historical accuracy
        const historicalAccuracy = this.calculateHistoricalAccuracy(historicalData);
        const adjustedMargin = marginOfError * (1 + (1 - historicalAccuracy));

        return {
            lower: Math.max(0, mean - adjustedMargin),
            upper: mean + adjustedMargin,
            confidence: historicalAccuracy * 100
        };
    }

    /**
     * Calculate historical forecast accuracy
     */
    static calculateHistoricalAccuracy(historicalData) {
        // This would compare previous forecasts with actuals
        // For now, return a default
        return 0.85;
    }

    /**
     * Generate best case / most likely / worst case scenarios
     */
    static generateScenarios(opportunities) {
        const amounts = opportunities.map(o => o.amount);
        
        if (amounts.length === 0) {
            return {
                bestCase: 0,
                mostLikely: 0,
                worstCase: 0
            };
        }

        // Sort amounts
        amounts.sort((a, b) => a - b);

        // Calculate percentiles
        const p10 = amounts[Math.floor(amounts.length * 0.1)];
        const p50 = amounts[Math.floor(amounts.length * 0.5)];
        const p90 = amounts[Math.floor(amounts.length * 0.9)];

        return {
            worstCase: amounts.reduce((sum, a) => sum + Math.min(a, p10), 0),
            mostLikely: amounts.reduce((sum, a) => sum + Math.min(a, p50), 0),
            bestCase: amounts.reduce((sum, a) => sum + Math.min(a, p90), 0)
        };
    }

    /**
     * Update forecast with actuals
     */
    static async updateForecastWithActuals(organizationId, period) {
        const { startDate, endDate } = period;

        // Get actual orders for the period
        const actuals = await Order.find({
            organization: organizationId,
            status: 'completed',
            orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });

        // Get forecast for the period
        const forecast = await this.generateForecast(organizationId, 1);

        // Calculate variance
        const actualAmount = actuals.reduce((sum, o) => sum + o.total, 0);
        const forecastAmount = forecast.weighted.total;

        return {
            period,
            actual: {
                orders: actuals.length,
                amount: actualAmount
            },
            forecast: {
                amount: forecastAmount
            },
            variance: {
                amount: actualAmount - forecastAmount,
                percentage: forecastAmount > 0 
                    ? ((actualAmount - forecastAmount) / forecastAmount) * 100
                    : 0
            }
        };
    }
}

module.exports = ForecastService;