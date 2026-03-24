// src/controllers/executive/analytics.controller.js
const ExecutiveSummary = require('../../models/executive/executiveSummary.model');
const BusinessPerformance = require('../../models/executive/businessPerformance.model');
const KPI = require('../../models/executive/kpi.model');
const { logExecutiveAction } = require('../../services/executive/auditHelper.service');
const mongoose = require('mongoose');

// Helper function to get user ID from req.user (same as governance controller)
const getUserId = (req) => {
    return req.user?.memberId || req.user?.id || req.user?._id;
};

/**
 * @desc    Get executive summary dashboard
 * @route   GET /api/executive/analytics/summary
 * @access  Private (CEO, Strategy Director)
 */
const getExecutiveSummary = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { period = 'monthly', date } = req.query;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Calculate date range based on period
        const dateRange = calculateDateRange(period, date);
        
        // Get or generate executive summary
        let summary = await ExecutiveSummary.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end,
            'period.type': period
        }).populate('createdBy', 'personalInfo firstName personalInfo lastName email');
        
        // If not found, generate new summary
        if (!summary) {
            summary = await generateExecutiveSummary(req.organization.id, dateRange, period, userId);
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'executive_summary',
            targetId: summary._id,
            description: `Viewed executive summary for ${period}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: summary
        });
        
    } catch (error) {
        console.error('Get executive summary error:', error);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'executive_summary',
            description: 'Failed to view executive summary',
            success: false,
            error
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to fetch executive summary'
        });
    }
};

/**
 * @desc    Get business performance analytics
 * @route   GET /api/executive/analytics/performance
 * @access  Private (CEO, Strategy Director)
 */
const getBusinessPerformance = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { 
            period = 'monthly',
            startDate,
            endDate,
            metrics = ['revenue', 'profit', 'growth', 'customers']
        } = req.query;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        let query = { organization: req.organization.id };
        
        if (startDate && endDate) {
            query['period.start'] = { $gte: new Date(startDate) };
            query['period.end'] = { $lte: new Date(endDate) };
        } else {
            const dateRange = calculateDateRange(period);
            query['period.start'] = dateRange.start;
            query['period.end'] = dateRange.end;
        }
        
        let performance = await BusinessPerformance.findOne(query)
            .sort({ generatedAt: -1 });
        
        // If not found, generate new performance data
        if (!performance) {
            performance = await generateBusinessPerformance(
                req.organization.id, 
                query['period.start'], 
                query['period.end'],
                userId
            );
        }
        
        // Parse metrics if it's a string (from query params)
        let metricsArray = metrics;
        if (typeof metrics === 'string') {
            metricsArray = metrics.split(',');
        }
        
        // Filter requested metrics
        const filteredData = filterMetrics(performance, metricsArray);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'business_performance',
            description: `Viewed business performance for ${period}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: filteredData
        });
        
    } catch (error) {
        console.error('Get business performance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch business performance'
        });
    }
};

/**
 * @desc    Get cross-functional metrics
 * @route   GET /api/executive/analytics/cross-functional
 * @access  Private (CEO)
 */
const getCrossFunctionalMetrics = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { departments = ['sales', 'finance', 'hr', 'operations'] } = req.query;
        
        // Get user ID safely (for logging)
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Parse departments if it's a string
        let departmentsArray = departments;
        if (typeof departments === 'string') {
            departmentsArray = departments.split(',');
        }
        
        // Aggregate metrics from different modules
        const metrics = await aggregateCrossFunctionalMetrics(req.organization.id, departmentsArray);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'cross_functional_metrics',
            description: 'Viewed cross-functional metrics',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: metrics
        });
        
    } catch (error) {
        console.error('Get cross-functional metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cross-functional metrics'
        });
    }
};

/**
 * @desc    Get forecast data
 * @route   GET /api/executive/analytics/forecast
 * @access  Private (CEO, CFO)
 */
const getForecastData = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { metric = 'revenue', horizon = '12months' } = req.query;
        
        // Get user ID safely (for logging)
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Generate forecast based on historical data
        const forecast = await generateForecast(req.organization.id, metric, horizon);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'forecast',
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
            message: 'Failed to fetch forecast data'
        });
    }
};

/**
 * @desc    Get trend analysis
 * @route   GET /api/executive/analytics/trends
 * @access  Private (CEO, Strategy Director)
 */
const getTrendAnalysis = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { 
            metrics = ['revenue', 'profit', 'customers'],
            period = '12months'
        } = req.query;
        
        // Get user ID safely (for logging)
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(period));
        
        // Parse metrics if it's a string
        let metricsArray = metrics;
        if (typeof metrics === 'string') {
            metricsArray = metrics.split(',');
        }
        
        // Get historical data for trends
        const trends = await analyzeTrends(
            req.organization.id, 
            metricsArray, 
            startDate, 
            endDate
        );
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'trend_analysis',
            description: `Viewed trend analysis for ${period}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: trends
        });
        
    } catch (error) {
        console.error('Get trend analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch trend analysis'
        });
    }
};

/**
 * @desc    Get KPI dashboard
 * @route   GET /api/executive/analytics/kpis
 * @access  Private (CEO, Strategy Director)
 */
const getKPIDashboard = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { categories } = req.query;
        
        // Get user ID safely (for logging)
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const kpis = await KPI.getDashboardKPIs(
            req.organization.id,
            categories ? categories.split(',') : []
        );
        
        // Group by category
        const grouped = kpis.reduce((acc, kpi) => {
            if (!acc[kpi.category]) {
                acc[kpi.category] = [];
            }
            acc[kpi.category].push(kpi);
            return acc;
        }, {});
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'kpi_dashboard',
            description: 'Viewed KPI dashboard',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: grouped
        });
        
    } catch (error) {
        console.error('Get KPI dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch KPI dashboard'
        });
    }
};

/**
 * @desc    Update KPI value
 * @route   PUT /api/executive/analytics/kpis/:id/value
 * @access  Private (CEO, Strategy Director)
 */
const updateKPIValue = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        const { value, date } = req.body;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const kpi = await KPI.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!kpi) {
            return res.status(404).json({
                success: false,
                message: 'KPI not found'
            });
        }
        
        const oldValue = kpi.currentValue;
        await kpi.updateValue(value, date ? new Date(date) : new Date());
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'kpi',
            targetId: kpi._id,
            targetName: kpi.name,
            changes: {
                before: oldValue,
                after: value
            },
            description: `Updated KPI ${kpi.name} to ${value}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: kpi,
            message: 'KPI updated successfully'
        });
        
    } catch (error) {
        console.error('Update KPI error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update KPI'
        });
    }
};

/**
 * @desc    Get KPI history
 * @route   GET /api/executive/analytics/kpis/:id/history
 * @access  Private (CEO, Strategy Director)
 */
const getKPIHistory = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        const { days = 30 } = req.query;
        
        // Get user ID safely (for logging)
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const history = await KPI.getKPIHistory(id, days);
        
        res.status(200).json({
            success: true,
            data: history
        });
        
    } catch (error) {
        console.error('Get KPI history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch KPI history'
        });
    }
};

/**
 * @desc    Create new KPI
 * @route   POST /api/executive/analytics/kpis
 * @access  Private (CEO, Strategy Director)
 */
const createKPI = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const kpiData = req.body;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Check if KPI with same code exists (changed from key to code to match your schema)
        const existing = await KPI.findOne({ 
            organization: req.organization.id,
            code: kpiData.code 
        });
        
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'KPI with this code already exists'
            });
        }
        
        const kpi = new KPI({
            organization: req.organization.id,
            ...kpiData,
            createdBy: userId
        });
        
        await kpi.save();
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'kpi',
            targetId: kpi._id,
            targetName: kpi.name,
            changes: kpiData,
            description: `Created new KPI: ${kpi.name}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(201).json({
            success: true,
            data: kpi,
            message: 'KPI created successfully'
        });
        
    } catch (error) {
        console.error('Create KPI error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create KPI'
        });
    }
};

// ==================== HELPER FUNCTIONS ====================

function calculateDateRange(period, referenceDate = new Date()) {
    const date = new Date(referenceDate);
    const start = new Date(date);
    const end = new Date(date);
    
    switch(period) {
        case 'daily':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'weekly':
            start.setDate(date.getDate() - date.getDay());
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
            const quarter = Math.floor(date.getMonth() / 3);
            start.setMonth(quarter * 3, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(quarter * 3 + 3, 0);
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

async function generateExecutiveSummary(organizationId, dateRange, periodType, memberId) {
    // This would aggregate data from various modules
    // For now, return a template structure
    
    const summary = new ExecutiveSummary({
        organization: organizationId,
        period: {
            start: dateRange.start,
            end: dateRange.end,
            type: periodType
        },
        keyMetrics: {
            revenue: { current: 0, previous: 0, change: 0, trend: 'stable' },
            profit: { current: 0, previous: 0, change: 0, margin: 0, trend: 'stable' },
            cashFlow: { operating: 0, investing: 0, financing: 0, net: 0, forecast: 0 },
            customers: { total: 0, new: 0, churn: 0, lifetimeValue: 0 },
            employees: { total: 0, newHires: 0, turnover: 0, satisfaction: 0 }
        },
        highlights: {
            topPerformers: [],
            areasOfConcern: [],
            achievements: []
        },
        departments: [],
        financialHealth: {
            revenue: { total: 0, byStream: [], growth: 0, forecast: 0 },
            expenses: { total: 0, byCategory: [], vsBudget: 0 },
            profitability: { grossMargin: 0, operatingMargin: 0, netMargin: 0, ebitda: 0, roi: 0 },
            liquidity: { currentRatio: 0, quickRatio: 0, cashReserves: 0, burnRate: 0 }
        },
        operationalMetrics: {
            efficiency: { overall: 0, byDepartment: [] },
            quality: { defectRate: 0, customerSatisfaction: 0, nps: 0, slaCompliance: 0 },
            productivity: { revenuePerEmployee: 0, profitPerEmployee: 0, unitsPerEmployee: 0 }
        },
        strategicProgress: {
            initiatives: { total: 0, completed: 0, onTrack: 0, atRisk: 0, behind: 0 },
            okrProgress: { company: 0, byDepartment: [] },
            milestones: []
        },
        riskIndicators: [],
        opportunities: [],
        recommendations: [],
        createdBy: memberId,
        isPublished: true,
        publishedAt: new Date()
    });
    
    await summary.save();
    return summary;
}

async function generateBusinessPerformance(organizationId, startDate, endDate, memberId) {
    // This would aggregate data from finance, sales, etc.
    // For now, return template structure
    
    const performance = new BusinessPerformance({
        organization: organizationId,
        period: { start: startDate, end: endDate },
        revenue: {
            total: 0,
            breakdown: { byProduct: [], byRegion: [], byChannel: [], byCustomer: [] },
            trends: { daily: [], monthly: [], yearOverYear: 0, quarterOverQuarter: 0 },
            forecast: { nextMonth: 0, nextQuarter: 0, nextYear: 0, confidence: 0 }
        },
        costs: {
            total: 0,
            breakdown: { fixed: [], variable: [], byDepartment: [] },
            trends: { daily: [], monthly: [] }
        },
        profitability: {
            grossProfit: 0,
            grossMargin: 0,
            operatingProfit: 0,
            operatingMargin: 0,
            netProfit: 0,
            netMargin: 0,
            ebitda: 0,
            ebitdaMargin: 0,
            byProduct: [],
            byCustomer: []
        },
        growth: {
            revenue: { qoq: 0, yoy: 0, cagr: 0 },
            customers: { qoq: 0, yoy: 0, acquisition: 0, retention: 0 },
            market: { share: 0, penetration: 0, expansion: 0 }
        },
        efficiency: {
            assetTurnover: 0,
            inventoryTurnover: 0,
            receivablesTurnover: 0,
            payablesTurnover: 0,
            cashConversionCycle: 0,
            returnOnAssets: 0,
            returnOnEquity: 0,
            returnOnInvestment: 0
        },
        generatedBy: memberId,
        dataSources: ['finance', 'sales', 'hr']
    });
    
    await performance.save();
    return performance;
}

async function aggregateCrossFunctionalMetrics(organizationId, departments) {
    // This would aggregate data from different modules
    // For now, return placeholder structure
    
    const metrics = {};
    
    departments.forEach(dept => {
        metrics[dept] = {
            revenue: 0,
            expenses: 0,
            headcount: 0,
            productivity: 0,
            satisfaction: 0
        };
    });
    
    return metrics;
}

async function generateForecast(organizationId, metric, horizon) {
    // This would use historical data to generate forecasts
    // For now, return placeholder
    
    const months = horizon === '12months' ? 12 : horizon === '6months' ? 6 : 3;
    const forecast = [];
    
    for (let i = 1; i <= months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        
        forecast.push({
            period: date.toISOString().substring(0, 7),
            value: 0,
            lowerBound: 0,
            upperBound: 0,
            confidence: 85
        });
    }
    
    return {
        metric,
        horizon,
        forecast,
        metadata: {
            model: 'time_series',
            accuracy: 85,
            generatedAt: new Date()
        }
    };
}

async function analyzeTrends(organizationId, metrics, startDate, endDate) {
    // This would analyze historical trends
    // For now, return placeholder
    
    const trends = {};
    
    metrics.forEach(metric => {
        trends[metric] = {
            direction: 'stable',
            change: 0,
            seasonal: false,
            pattern: 'linear',
            data: []
        };
    });
    
    return trends;
}

function filterMetrics(performance, requestedMetrics) {
    const filtered = {};
    
    requestedMetrics.forEach(metric => {
        if (performance[metric]) {
            filtered[metric] = performance[metric];
        }
    });
    
    return filtered;
}

module.exports = {
    getExecutiveSummary,
    getBusinessPerformance,
    getCrossFunctionalMetrics,
    getForecastData,
    getTrendAnalysis,
    getKPIDashboard,
    updateKPIValue,
    getKPIHistory,
    createKPI
};