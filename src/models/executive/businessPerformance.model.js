// src/models/executive/businessPerformance.model.js
const mongoose = require('mongoose');

const businessPerformanceSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Performance period
    period: {
        start: Date,
        end: Date,
        type: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
        }
    },
    
    // Revenue Analysis
    revenue: {
        total: Number,
        breakdown: {
            byProduct: [{
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product'
                },
                name: String,
                amount: Number,
                quantity: Number,
                growth: Number
            }],
            byRegion: [{
                region: String,
                amount: Number,
                growth: Number
            }],
            byChannel: [{
                channel: String,
                amount: Number,
                growth: Number
            }],
            byCustomer: [{
                customerId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Customer'
                },
                name: String,
                amount: Number,
                lifetime: Number
            }]
        },
        trends: {
            daily: [{
                date: Date,
                value: Number
            }],
            monthly: [{
                month: String,
                value: Number
            }],
            yearOverYear: Number,
            quarterOverQuarter: Number
        },
        forecast: {
            nextMonth: Number,
            nextQuarter: Number,
            nextYear: Number,
            confidence: Number
        }
    },
    
    // Cost Analysis
    costs: {
        total: Number,
        breakdown: {
            fixed: [{
                category: String,
                amount: Number
            }],
            variable: [{
                category: String,
                amount: Number
            }],
            byDepartment: [{
                department: String,
                amount: Number,
                budget: Number,
                variance: Number
            }]
        },
        trends: {
            daily: [{
                date: Date,
                value: Number
            }],
            monthly: [{
                month: String,
                value: Number
            }]
        }
    },
    
    // Profitability
    profitability: {
        grossProfit: Number,
        grossMargin: Number,
        operatingProfit: Number,
        operatingMargin: Number,
        netProfit: Number,
        netMargin: Number,
        ebitda: Number,
        ebitdaMargin: Number,
        
        byProduct: [{
            productId: mongoose.Schema.Types.ObjectId,
            name: String,
            revenue: Number,
            cost: Number,
            profit: Number,
            margin: Number
        }],
        
        byCustomer: [{
            customerId: mongoose.Schema.Types.ObjectId,
            name: String,
            revenue: Number,
            cost: Number,
            profit: Number,
            margin: Number
        }]
    },
    
    // Growth Metrics
    growth: {
        revenue: {
            qoq: Number,
            yoy: Number,
            cagr: Number
        },
        customers: {
            qoq: Number,
            yoy: Number,
            acquisition: Number,
            retention: Number
        },
        market: {
            share: Number,
            penetration: Number,
            expansion: Number
        }
    },
    
    // Efficiency Ratios
    efficiency: {
        assetTurnover: Number,
        inventoryTurnover: Number,
        receivablesTurnover: Number,
        payablesTurnover: Number,
        cashConversionCycle: Number,
        returnOnAssets: Number,
        returnOnEquity: Number,
        returnOnInvestment: Number
    },
    
    // Customer Metrics
    customerMetrics: {
        acquisition: {
            cac: Number,
            sourceBreakdown: [{
                source: String,
                count: Number,
                cost: Number
            }],
            conversionRate: Number
        },
        retention: {
            churnRate: Number,
            retentionRate: Number,
            repeatRate: Number,
            averageLifespan: Number
        },
        value: {
            arpu: Number,
            ltv: Number,
            ltvToCac: Number,
            expansionRevenue: Number
        },
        satisfaction: {
            nps: Number,
            csat: Number,
            ces: Number,
            feedback: [{
                rating: Number,
                comment: String,
                date: Date
            }]
        }
    },
    
    // Product Metrics
    productMetrics: {
        performance: [{
            productId: mongoose.Schema.Types.ObjectId,
            name: String,
            revenue: Number,
            units: Number,
            margin: Number,
            growth: Number
        }],
        adoption: {
            activeUsers: Number,
            usageRate: Number,
            featureAdoption: [{
                feature: String,
                adoptionRate: Number
            }]
        },
        pipeline: {
            development: [{
                product: String,
                stage: String,
                completion: Number,
                launchDate: Date
            }]
        }
    },
    
    // Market Intelligence
    marketIntelligence: {
        marketSize: Number,
        marketShare: Number,
        competitors: [{
            name: String,
            share: Number,
            strengths: [String],
            weaknesses: [String],
            recentMoves: String
        }],
        opportunities: [{
            name: String,
            size: Number,
            growth: Number,
            effort: String
        }],
        threats: [{
            name: String,
            impact: String,
            probability: String,
            mitigation: String
        }]
    },
    
    // Benchmarking
    benchmarking: {
        industryAverage: {
            revenue: Number,
            profit: Number,
            margin: Number,
            growth: Number
        },
        peerComparison: [{
            company: String,
            revenue: Number,
            profit: Number,
            margin: Number,
            growth: Number
        }],
        percentiles: {
            revenue: Number,
            profit: Number,
            growth: Number,
            efficiency: Number
        }
    },
    
    // Metadata
    generatedAt: {
        type: Date,
        default: Date.now
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    dataSources: [String],
    accuracy: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
    }
}, {
    timestamps: true
});

// Indexes
businessPerformanceSchema.index({ organization: 1, 'period.start': -1, 'period.end': -1 });
businessPerformanceSchema.index({ organization: 1, 'period.type': 1 });

module.exports = mongoose.model('BusinessPerformance', businessPerformanceSchema);