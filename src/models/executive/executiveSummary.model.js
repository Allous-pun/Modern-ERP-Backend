// src/models/executive/executiveSummary.model.js
const mongoose = require('mongoose');

const executiveSummarySchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Summary period
    period: {
        start: {
            type: Date,
            required: true
        },
        end: {
            type: Date,
            required: true
        },
        type: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly'],
            required: true
        }
    },
    
    // Key Metrics at a Glance
    keyMetrics: {
        revenue: {
            current: Number,
            previous: Number,
            change: Number,
            trend: {
                type: String,
                enum: ['up', 'down', 'stable']
            }
        },
        profit: {
            current: Number,
            previous: Number,
            change: Number,
            margin: Number,
            trend: String
        },
        cashFlow: {
            operating: Number,
            investing: Number,
            financing: Number,
            net: Number,
            forecast: Number
        },
        customers: {
            total: Number,
            new: Number,
            churn: Number,
            lifetimeValue: Number
        },
        employees: {
            total: Number,
            newHires: Number,
            turnover: Number,
            satisfaction: Number
        }
    },
    
    // Performance Highlights
    highlights: {
        topPerformers: [{
            area: String,
            metric: String,
            value: Number,
            achievement: String
        }],
        areasOfConcern: [{
            area: String,
            metric: String,
            value: Number,
            gap: Number,
            action: String
        }],
        achievements: [{
            title: String,
            description: String,
            impact: String,
            date: Date
        }]
    },
    
    // Department Summaries
    departments: [{
        name: {
            type: String,
            enum: ['sales', 'marketing', 'finance', 'hr', 'operations', 'it', 'rnd']
        },
        metrics: {
            revenue: Number,
            expenses: Number,
            headcount: Number,
            utilization: Number,
            satisfaction: Number
        },
        kpis: [{
            name: String,
            target: Number,
            actual: Number,
            status: {
                type: String,
                enum: ['on_track', 'at_risk', 'behind']
            }
        }],
        highlights: String,
        concerns: String
    }],
    
    // Financial Health
    financialHealth: {
        revenue: {
            total: Number,
            byStream: [{
                name: String,
                amount: Number,
                percentage: Number
            }],
            growth: Number,
            forecast: Number
        },
        expenses: {
            total: Number,
            byCategory: [{
                name: String,
                amount: Number,
                percentage: Number
            }],
            vsBudget: Number
        },
        profitability: {
            grossMargin: Number,
            operatingMargin: Number,
            netMargin: Number,
            ebitda: Number,
            roi: Number
        },
        liquidity: {
            currentRatio: Number,
            quickRatio: Number,
            cashReserves: Number,
            burnRate: Number
        }
    },
    
    // Operational Excellence
    operationalMetrics: {
        efficiency: {
            overall: Number,
            byDepartment: [{
                department: String,
                score: Number
            }]
        },
        quality: {
            defectRate: Number,
            customerSatisfaction: Number,
            nps: Number,
            slaCompliance: Number
        },
        productivity: {
            revenuePerEmployee: Number,
            profitPerEmployee: Number,
            unitsPerEmployee: Number
        }
    },
    
    // Strategic Initiatives Progress
    strategicProgress: {
        initiatives: {
            total: Number,
            completed: Number,
            onTrack: Number,
            atRisk: Number,
            behind: Number
        },
        okrProgress: {
            company: Number,
            byDepartment: [{
                department: String,
                progress: Number
            }]
        },
        milestones: [{
            initiative: String,
            milestone: String,
            dueDate: Date,
            status: {
                type: String,
                enum: ['completed', 'in_progress', 'pending', 'overdue']
            }
        }]
    },
    
    // Risk Indicators
    riskIndicators: [{
        category: String,
        level: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
        },
        trend: String,
        description: String,
        mitigation: String
    }],
    
    // Opportunities
    opportunities: [{
        title: String,
        potential: String,
        impact: String,
        effort: String,
        timeline: String
    }],
    
    // Recommendations
    recommendations: [{
        area: String,
        action: String,
        priority: {
            type: String,
            enum: ['high', 'medium', 'low']
        },
        owner: String,
        timeline: String,
        expectedImpact: String
    }],
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    publishedAt: Date,
    version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

// Indexes
executiveSummarySchema.index({ organization: 1, 'period.start': -1, 'period.end': -1 });
executiveSummarySchema.index({ organization: 1, 'period.type': 1 });

module.exports = mongoose.model('ExecutiveSummary', executiveSummarySchema);