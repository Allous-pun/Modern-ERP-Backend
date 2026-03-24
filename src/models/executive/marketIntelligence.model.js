// src/models/executive/marketIntelligence.model.js
const mongoose = require('mongoose');

const marketIntelligenceSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Market analysis
    market: {
        name: String,
        sector: String,
        industry: String,
        region: String,
        size: {
            current: Number,
            projected: [{
                year: Number,
                value: Number,
                growth: Number
            }]
        },
        growth: {
            rate: Number,
            drivers: [String],
            constraints: [String]
        },
        trends: [{
            trend: String,
            description: String,
            impact: String,
            timeframe: String,
            source: String,
            confidence: {
                type: String,
                enum: ['high', 'medium', 'low']
            }
        }]
    },
    
    // Competitor intelligence
    competitors: [{
        name: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['direct', 'indirect', 'potential', 'substitute']
        },
        overview: {
            description: String,
            founded: Number,
            headquarters: String,
            employees: Number,
            revenue: Number,
            marketShare: Number
        },
        products: [{
            name: String,
            description: String,
            features: [String],
            pricing: {
                model: String,
                range: String
            },
            targetMarket: String,
            differentiators: [String]
        }],
        financials: {
            revenue: [{
                year: Number,
                value: Number,
                growth: Number
            }],
            profit: [{
                year: Number,
                value: Number
            }],
            valuation: Number,
            funding: [{
                round: String,
                date: Date,
                amount: Number,
                investors: [String]
            }]
        },
        strengths: [String],
        weaknesses: [String],
        opportunities: [String],
        threats: [String],
        strategies: [{
            type: String,
            description: String,
            impact: String
        }],
        recentMoves: [{
            type: String,
            description: String,
            date: Date,
            impact: String
        }],
        news: [{
            title: String,
            source: String,
            date: Date,
            url: String,
            summary: String
        }],
        socialMedia: {
            linkedin: String,
            twitter: String,
            facebook: String,
            instagram: String
        },
        threat: {
            level: {
                type: String,
                enum: ['low', 'medium', 'high', 'critical']
            },
            factors: [String]
        }
    }],
    
    // Customer intelligence
    customers: {
        segments: [{
            name: String,
            size: Number,
            growth: Number,
            characteristics: [String],
            needs: [String],
            painPoints: [String],
            buyingBehavior: String,
            priceSensitivity: {
                type: String,
                enum: ['low', 'medium', 'high']
            }
        }],
        personas: [{
            name: String,
            demographics: {
                age: String,
                gender: String,
                income: String,
                education: String,
                location: String
            },
            psychographics: {
                values: [String],
                interests: [String],
                lifestyle: String
            },
            goals: [String],
            challenges: [String],
            buyingCriteria: [String],
            preferredChannels: [String]
        }],
        feedback: [{
            source: String,
            type: {
                type: String,
                enum: ['survey', 'review', 'support', 'social']
            },
            sentiment: {
                type: String,
                enum: ['positive', 'neutral', 'negative']
            },
            content: String,
            date: Date,
            customerId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Customer'
            }
        }]
    },
    
    // Industry analysis
    industry: {
        overview: String,
        lifecycle: {
            stage: {
                type: String,
                enum: ['emerging', 'growth', 'mature', 'declining']
            },
            characteristics: [String]
        },
        regulations: [{
            name: String,
            description: String,
            impact: String,
            compliance: String
        }],
        barriers: {
            entry: [String],
            exit: [String]
        },
        keySuccessFactors: [String],
        associations: [{
            name: String,
            role: String
        }]
    },
    
    // Economic indicators
    economic: {
        gdp: {
            current: Number,
            growth: Number,
            forecast: Number
        },
        inflation: {
            current: Number,
            trend: String
        },
        interest: {
            current: Number,
            trend: String
        },
        unemployment: {
            current: Number,
            trend: String
        },
        consumerConfidence: {
            current: Number,
            trend: String
        },
        businessConfidence: {
            current: Number,
            trend: String
        }
    },
    
    // Technology trends
    technology: {
        trends: [{
            technology: String,
            description: String,
            impact: String,
            adoption: String,
            timeframe: String
        }],
        disruptions: [{
            technology: String,
            description: String,
            impact: String,
            timeline: String
        }],
        innovations: [{
            name: String,
            description: String,
            source: String,
            potential: String
        }]
    },
    
    // SWOT Analysis
    swot: {
        strengths: [{
            factor: String,
            impact: String,
            sustainability: String
        }],
        weaknesses: [{
            factor: String,
            impact: String,
            mitigation: String
        }],
        opportunities: [{
            factor: String,
            potential: String,
            timeframe: String,
            effort: String
        }],
        threats: [{
            factor: String,
            impact: String,
            probability: String,
            mitigation: String
        }]
    },
    
    // PESTLE Analysis
    pestle: {
        political: [{
            factor: String,
            impact: String,
            trend: String
        }],
        economic: [{
            factor: String,
            impact: String,
            trend: String
        }],
        social: [{
            factor: String,
            impact: String,
            trend: String
        }],
        technological: [{
            factor: String,
            impact: String,
            trend: String
        }],
        legal: [{
            factor: String,
            impact: String,
            trend: String
        }],
        environmental: [{
            factor: String,
            impact: String,
            trend: String
        }]
    },
    
    // Market research
    research: [{
        title: String,
        type: {
            type: String,
            enum: ['primary', 'secondary', 'syndicated']
        },
        methodology: String,
        source: String,
        date: Date,
        findings: [String],
        recommendations: [String],
        attachments: [String],
        url: String
    }],
    
    // Reports and publications
    reports: [{
        title: String,
        publisher: String,
        date: Date,
        summary: String,
        keyFindings: [String],
        url: String
    }],
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    lastUpdated: Date,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
marketIntelligenceSchema.index({ organization: 1, 'market.sector': 1 });
marketIntelligenceSchema.index({ organization: 1, 'market.region': 1 });
marketIntelligenceSchema.index({ 'competitors.name': 1 });

module.exports = mongoose.model('MarketIntelligence', marketIntelligenceSchema);