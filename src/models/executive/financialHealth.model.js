// src/models/executive/financialHealth.model.js
const mongoose = require('mongoose');

const financialHealthSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Assessment period
    period: {
        asOf: {
            type: Date,
            default: Date.now
        },
        quarter: Number,
        year: Number
    },
    
    // Overall health score (0-100)
    overallScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true
    },
    overallRating: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'critical']
    },
    
    // Component scores
    components: {
        profitability: {
            score: Number,
            rating: String,
            weight: Number,
            metrics: {
                netMargin: Number,
                roe: Number,
                roa: Number,
                trend: String
            }
        },
        liquidity: {
            score: Number,
            rating: String,
            weight: Number,
            metrics: {
                currentRatio: Number,
                quickRatio: Number,
                cashRatio: Number,
                workingCapital: Number
            }
        },
        efficiency: {
            score: Number,
            rating: String,
            weight: Number,
            metrics: {
                assetTurnover: Number,
                inventoryTurnover: Number,
                receivableTurnover: Number,
                cashConversionCycle: Number
            }
        },
        leverage: {
            score: Number,
            rating: String,
            weight: Number,
            metrics: {
                debtToEquity: Number,
                debtToAsset: Number,
                interestCoverage: Number,
                debtToEbitda: Number
            }
        },
        growth: {
            score: Number,
            rating: String,
            weight: Number,
            metrics: {
                revenueGrowth: Number,
                profitGrowth: Number,
                marketShare: Number,
                sustainableGrowth: Number
            }
        },
        stability: {
            score: Number,
            rating: String,
            weight: Number,
            metrics: {
                revenueVolatility: Number,
                profitVolatility: Number,
                customerConcentration: Number,
                supplierConcentration: Number
            }
        }
    },
    
    // Detailed metrics
    metrics: {
        profitability: {
            grossMargin: Number,
            operatingMargin: Number,
            netMargin: Number,
            ebitdaMargin: Number,
            roe: Number,
            roa: Number,
            roi: Number,
            roic: Number
        },
        liquidity: {
            currentRatio: Number,
            quickRatio: Number,
            cashRatio: Number,
            operatingCashFlow: Number,
            freeCashFlow: Number,
            cashBurnRate: Number,
            cashRunway: Number
        },
        efficiency: {
            assetTurnover: Number,
            inventoryTurnover: Number,
            receivableTurnover: Number,
            payableTurnover: Number,
            cashConversionCycle: Number,
            workingCapitalTurnover: Number
        },
        leverage: {
            debtToEquity: Number,
            debtToAsset: Number,
            debtToEbitda: Number,
            interestCoverage: Number,
            fixedChargeCoverage: Number,
            debtServiceCoverage: Number
        },
        growth: {
            revenueGrowth: {
                qoq: Number,
                yoy: Number,
                cagr3: Number,
                cagr5: Number
            },
            profitGrowth: {
                qoq: Number,
                yoy: Number,
                cagr3: Number,
                cagr5: Number
            },
            sustainableGrowth: Number
        },
        market: {
            marketShare: Number,
            pe: Number,
            pb: Number,
            ev: Number,
            evToEbitda: Number
        }
    },
    
    // Benchmarking
    benchmarks: {
        industry: {
            profitability: Number,
            liquidity: Number,
            efficiency: Number,
            leverage: Number,
            growth: Number
        },
        peerGroup: [{
            company: String,
            score: Number,
            comparison: {
                profitability: Number,
                liquidity: Number,
                efficiency: Number,
                leverage: Number,
                growth: Number
            }
        }],
        percentiles: {
            overall: Number,
            profitability: Number,
            liquidity: Number,
            efficiency: Number,
            leverage: Number,
            growth: Number
        }
    },
    
    // Risk factors
    riskFactors: [{
        factor: String,
        impact: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
        },
        probability: Number,
        mitigation: String,
        status: {
            type: String,
            enum: ['active', 'monitoring', 'mitigated']
        }
    }],
    
    // Recommendations
    recommendations: [{
        area: String,
        priority: {
            type: String,
            enum: ['high', 'medium', 'low']
        },
        action: String,
        expectedImpact: String,
        timeline: String,
        owner: String
    }],
    
    // Trends
    trends: {
        overall: [{
            date: Date,
            score: Number
        }],
        components: {
            profitability: [{
                date: Date,
                score: Number
            }],
            liquidity: [{
                date: Date,
                score: Number
            }],
            efficiency: [{
                date: Date,
                score: Number
            }],
            leverage: [{
                date: Date,
                score: Number
            }],
            growth: [{
                date: Date,
                score: Number
            }]
        }
    },
    
    // Metadata
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    nextReview: Date
}, {
    timestamps: true
});

// Indexes
financialHealthSchema.index({ organization: 1, 'period.year': 1, 'period.quarter': 1 });
financialHealthSchema.index({ organization: 1, overallRating: 1 });

module.exports = mongoose.model('FinancialHealth', financialHealthSchema);