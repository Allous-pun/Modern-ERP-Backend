// src/models/finance/forecast.model.js
const mongoose = require('mongoose');

const forecastSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    name: {
        type: String,
        required: true
    },
    
    description: String,
    
    forecastType: {
        type: String,
        enum: ['revenue', 'expenses', 'cash_flow', 'comprehensive'],
        default: 'comprehensive'
    },
    
    period: {
        startDate: Date,
        endDate: Date,
        months: Number
    },
    
    // Input assumptions
    assumptions: {
        revenueGrowth: {
            type: Number,
            default: 0,
            description: "Expected revenue growth rate (%)"
        },
        expenseGrowth: {
            type: Number,
            default: 0,
            description: "Expected expense growth rate (%)"
        },
        inflation: {
            type: Number,
            default: 0,
            description: "Expected inflation rate (%)"
        },
        seasonality: {
            type: Map,
            of: Number,
            default: {}
        },
        custom: mongoose.Schema.Types.Mixed
    },
    
    // Forecast results
    results: {
        monthly: [{
            month: String,
            year: Number,
            revenue: Number,
            expenses: Number,
            netIncome: Number,
            cashFlow: Number,
            confidence: {
                lower: Number,
                upper: Number,
                probability: Number
            }
        }],
        quarterly: [{
            quarter: Number,
            year: Number,
            revenue: Number,
            expenses: Number,
            netIncome: Number,
            cashFlow: Number
        }],
        yearly: [{
            year: Number,
            revenue: Number,
            expenses: Number,
            netIncome: Number,
            cashFlow: Number,
            cumulative: Number
        }],
        summary: {
            totalRevenue: Number,
            totalExpenses: Number,
            totalNetIncome: Number,
            averageRevenue: Number,
            averageExpenses: Number,
            averageNetIncome: Number,
            bestCase: {
                revenue: Number,
                netIncome: Number
            },
            worstCase: {
                revenue: Number,
                netIncome: Number
            }
        }
    },
    
    // Historical data used
    historicalData: {
        periods: [{
            month: String,
            year: Number,
            revenue: Number,
            expenses: Number,
            netIncome: Number
        }],
        trends: {
            revenue: {
                growthRate: Number,
                seasonality: [Number]
            },
            expenses: {
                growthRate: Number,
                seasonality: [Number]
            }
        }
    },
    
    status: {
        type: String,
        enum: ['draft', 'active', 'archived'],
        default: 'draft'
    },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('FinancialForecast', forecastSchema);
