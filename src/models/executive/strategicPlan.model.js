// src/models/executive/strategicPlan.model.js
const mongoose = require('mongoose');

const strategicPlanSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Plan identification
    name: {
        type: String,
        required: true
    },
    description: String,
    vision: String,
    mission: String,
    values: [String],
    
    // Plan period
    period: {
        startYear: {
            type: Number,
            required: true
        },
        endYear: {
            type: Number,
            required: true
        },
        type: {
            type: String,
            enum: ['annual', '3-year', '5-year', '10-year'],
            default: '3-year'
        },
        isCurrent: {
            type: Boolean,
            default: false
        }
    },
    
    // Strategic Pillars
    pillars: [{
        name: {
            type: String,
            required: true
        },
        description: String,
        icon: String,
        color: String,
        order: Number,
        objectives: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StrategicObjective'
        }],
        metrics: [{
            name: String,
            target: Number,
            current: Number,
            unit: String
        }],
        progress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        budget: {
            allocated: Number,
            spent: Number
        }
    }],
    
    // Strategic Objectives
    objectives: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StrategicObjective'
    }],
    
    // Key Performance Indicators
    kpis: [{
        name: String,
        description: String,
        category: {
            type: String,
            enum: ['financial', 'customer', 'operational', 'employee', 'innovation']
        },
        baseline: Number,
        target: Number,
        current: Number,
        unit: String,
        frequency: {
            type: String,
            enum: ['monthly', 'quarterly', 'annual']
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        trend: {
            direction: {
                type: String,
                enum: ['up', 'down', 'stable']
            },
            percentage: Number
        },
        history: [{
            date: Date,
            value: Number,
            period: String
        }]
    }],
    
    // OKRs (Objectives and Key Results)
    okrs: [{
        objective: {
            type: String,
            required: true
        },
        description: String,
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        keyResults: [{
            description: String,
            baseline: Number,
            target: Number,
            current: Number,
            unit: String,
            confidence: Number,
            trend: String,
            status: {
                type: String,
                enum: ['on_track', 'at_risk', 'behind', 'completed']
            },
            history: [{
                date: Date,
                value: Number,
                note: String
            }]
        }],
        progress: Number,
        quarter: Number,
        year: Number,
        status: {
            type: String,
            enum: ['draft', 'active', 'completed', 'archived']
        }
    }],
    
    // Strategic Initiatives
    initiatives: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StrategicInitiative'
    }],
    
    // Financial Plan
    financialPlan: {
        revenue: {
            target: [{
                year: Number,
                amount: Number,
                growth: Number
            }],
            byStream: [{
                stream: String,
                target: [{
                    year: Number,
                    amount: Number
                }]
            }]
        },
        expenses: {
            target: [{
                year: Number,
                amount: Number
            }],
            byCategory: [{
                category: String,
                target: [{
                    year: Number,
                    amount: Number
                }]
            }]
        },
        profit: {
            target: [{
                year: Number,
                amount: Number,
                margin: Number
            }]
        },
        investment: {
            total: [{
                year: Number,
                amount: Number
            }],
            byInitiative: [{
                initiative: String,
                amount: [{
                    year: Number,
                    amount: Number
                }]
            }]
        },
        roi: {
            projected: Number,
            paybackPeriod: Number,
            npv: Number,
            irr: Number
        }
    },
    
    // Resource Plan
    resourcePlan: {
        headcount: [{
            year: Number,
            total: Number,
            byDepartment: [{
                department: String,
                count: Number
            }],
            byRole: [{
                role: String,
                count: Number
            }]
        }],
        budget: {
            total: [{
                year: Number,
                amount: Number
            }],
            byCategory: [{
                category: String,
                amount: [{
                    year: Number,
                    amount: Number
                }]
            }]
        },
        technology: [{
            year: Number,
            investments: [{
                type: String,
                amount: Number
            }]
        }]
    },
    
    // Risk Assessment
    riskAssessment: {
        overall: {
            level: {
                type: String,
                enum: ['low', 'medium', 'high', 'critical']
            },
            score: Number
        },
        risks: [{
            category: String,
            description: String,
            probability: {
                type: String,
                enum: ['low', 'medium', 'high']
            },
            impact: {
                type: String,
                enum: ['low', 'medium', 'high', 'critical']
            },
            riskScore: Number,
            mitigation: String,
            contingency: String,
            owner: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            }
        }],
        opportunities: [{
            category: String,
            description: String,
            potential: String,
            effort: String,
            timeline: String,
            owner: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            }
        }]
    },
    
    // Market Analysis
    marketAnalysis: {
        marketSize: {
            current: Number,
            projected: [{
                year: Number,
                value: Number,
                growth: Number
            }]
        },
        marketShare: {
            current: Number,
            target: [{
                year: Number,
                value: Number
            }]
        },
        segments: [{
            name: String,
            size: Number,
            growth: Number,
            share: Number,
            potential: String
        }],
        trends: [{
            trend: String,
            impact: String,
            implication: String,
            timeframe: String
        }]
    },
    
    // Competitive Analysis
    competitiveAnalysis: {
        competitors: [{
            name: String,
            type: {
                type: String,
                enum: ['direct', 'indirect', 'potential', 'substitute']
            },
            marketShare: Number,
            strengths: [String],
            weaknesses: [String],
            strategies: [String],
            recentMoves: [String],
            threat: {
                type: String,
                enum: ['low', 'medium', 'high']
            }
        }],
        positioning: {
            unique: [String],
            advantages: [String],
            gaps: [String]
        },
        swot: {
            strengths: [{
                item: String,
                impact: String
            }],
            weaknesses: [{
                item: String,
                impact: String
            }],
            opportunities: [{
                item: String,
                potential: String,
                timeline: String
            }],
            threats: [{
                item: String,
                impact: String,
                probability: String
            }]
        },
        porterFiveForces: {
            threatOfNewEntrants: {
                level: {
                    type: String,
                    enum: ['low', 'medium', 'high']
                },
                factors: [String]
            },
            bargainingPowerOfBuyers: {
                level: {
                    type: String,
                    enum: ['low', 'medium', 'high']
                },
                factors: [String]
            },
            bargainingPowerOfSuppliers: {
                level: {
                    type: String,
                    enum: ['low', 'medium', 'high']
                },
                factors: [String]
            },
            threatOfSubstitutes: {
                level: {
                    type: String,
                    enum: ['low', 'medium', 'high']
                },
                factors: [String]
            },
            rivalryAmongExisting: {
                level: {
                    type: String,
                    enum: ['low', 'medium', 'high']
                },
                factors: [String]
            }
        }
    },
    
    // Scenario Planning
    scenarios: [{
        name: {
            type: String,
            required: true
        },
        description: String,
        type: {
            type: String,
            enum: ['optimistic', 'pessimistic', 'most_likely', 'what_if']
        },
        assumptions: [{
            factor: String,
            value: mongoose.Schema.Types.Mixed,
            change: Number
        }],
        financialImpact: {
            revenue: Number,
            profit: Number,
            cashflow: Number,
            roi: Number
        },
        operationalImpact: {
            capacity: Number,
            efficiency: Number,
            headcount: Number
        },
        marketImpact: {
            share: Number,
            penetration: Number,
            growth: Number
        },
        risks: [{
            description: String,
            probability: String,
            impact: String
        }],
        probability: Number,
        createdAt: Date,
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        }
    }],
    
    // Review and Approval
    review: {
        status: {
            type: String,
            enum: ['draft', 'under_review', 'approved', 'rejected', 'archived'],
            default: 'draft'
        },
        reviews: [{
            reviewer: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            date: Date,
            comments: String,
            recommendations: [String],
            decision: {
                type: String,
                enum: ['approve', 'reject', 'revisions']
            }
        }],
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        approvedAt: Date,
        version: {
            type: Number,
            default: 1
        }
    },
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
strategicPlanSchema.index({ organization: 1, 'period.startYear': -1 });
strategicPlanSchema.index({ organization: 1, 'period.isCurrent': 1 });
strategicPlanSchema.index({ organization: 1, 'review.status': 1 });

// Methods
strategicPlanSchema.methods.calculateOverallProgress = function() {
    let totalProgress = 0;
    let totalObjectives = 0;
    
    // Calculate from OKRs
    const activeOKRs = this.okrs.filter(okr => okr.status === 'active');
    if (activeOKRs.length > 0) {
        const okrProgress = activeOKRs.reduce((sum, okr) => sum + (okr.progress || 0), 0);
        totalProgress += okrProgress;
        totalObjectives += activeOKRs.length;
    }
    
    // Calculate from initiatives
    // This would be populated from StrategicInitiative model
    
    this.progress = totalObjectives > 0 ? Math.round(totalProgress / totalObjectives) : 0;
    return this.save();
};

strategicPlanSchema.methods.setCurrent = async function() {
    // Reset all other plans to not current
    await this.constructor.updateMany(
        { organization: this.organization, 'period.isCurrent': true },
        { $set: { 'period.isCurrent': false } }
    );
    
    this.period.isCurrent = true;
    return this.save();
};

module.exports = mongoose.model('StrategicPlan', strategicPlanSchema);