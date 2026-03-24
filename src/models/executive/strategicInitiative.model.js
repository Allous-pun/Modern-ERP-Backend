// src/models/executive/strategicInitiative.model.js
const mongoose = require('mongoose');

const strategicInitiativeSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Initiative identification
    name: {
        type: String,
        required: true
    },
    description: String,
    code: String,
    
    // Categorization
    category: {
        type: String,
        enum: ['growth', 'innovation', 'efficiency', 'transformation', 'compliance', 'culture'],
        required: true
    },
    subCategory: String,
    
    // Strategic alignment
    strategicPlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StrategicPlan'
    },
    objective: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StrategicObjective'
    },
    pillar: String,
    priority: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
        default: 'medium'
    },
    
    // Timeline
    timeline: {
        startDate: {
            type: Date,
            required: true
        },
        plannedEndDate: {
            type: Date,
            required: true
        },
        actualEndDate: Date,
        duration: Number, // days
        phases: [{
            name: String,
            startDate: Date,
            endDate: Date,
            status: {
                type: String,
                enum: ['pending', 'in_progress', 'completed', 'delayed']
            }
        }]
    },
    
    // Budget and resources
    budget: {
        allocated: {
            total: Number,
            byPhase: [{
                phase: String,
                amount: Number
            }],
            byYear: [{
                year: Number,
                amount: Number
            }]
        },
        spent: {
            total: Number,
            byPhase: [{
                phase: String,
                amount: Number
            }]
        },
        remaining: Number,
        variance: Number,
        currency: {
            type: String,
            default: 'USD'
        },
        roi: {
            projected: Number,
            actual: Number
        }
    },
    
    // Resources
    resources: {
        team: [{
            member: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            role: String,
            allocation: Number, // percentage
            startDate: Date,
            endDate: Date
        }],
        external: [{
            vendor: String,
            service: String,
            cost: Number,
            contract: String
        }],
        equipment: [{
            name: String,
            quantity: Number,
            cost: Number
        }]
    },
    
    // Stakeholders
    stakeholders: {
        sponsor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        programManager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        projectManager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        businessOwner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        steeringCommittee: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        }],
        impactedDepartments: [String]
    },
    
    // Progress tracking
    progress: {
        overall: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        milestones: [{
            name: String,
            dueDate: Date,
            completedDate: Date,
            status: {
                type: String,
                enum: ['pending', 'in_progress', 'completed', 'delayed', 'cancelled']
            },
            deliverables: [String],
            dependencies: [String],
            notes: String,
            completedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            }
        }],
        tasks: [{
            name: String,
            assignedTo: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            dueDate: Date,
            completedDate: Date,
            status: {
                type: String,
                enum: ['todo', 'in_progress', 'completed', 'blocked']
            },
            priority: {
                type: String,
                enum: ['high', 'medium', 'low']
            },
            notes: String
        }],
        blockers: [{
            issue: String,
            impact: String,
            severity: {
                type: String,
                enum: ['low', 'medium', 'high', 'critical']
            },
            raisedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            raisedAt: Date,
            resolvedAt: Date,
            resolution: String,
            status: {
                type: String,
                enum: ['open', 'in_progress', 'resolved']
            }
        }]
    },
    
    // Benefits tracking
    benefits: {
        financial: {
            revenue: {
                projected: Number,
                actual: Number
            },
            costSavings: {
                projected: Number,
                actual: Number
            },
            roi: {
                projected: Number,
                actual: Number
            },
            paybackPeriod: {
                projected: Number,
                actual: Number
            }
        },
        operational: {
            efficiency: {
                projected: Number,
                actual: Number
            },
            productivity: {
                projected: Number,
                actual: Number
            },
            quality: {
                projected: Number,
                actual: Number
            },
            cycleTime: {
                projected: Number,
                actual: Number
            }
        },
        customer: {
            satisfaction: {
                projected: Number,
                actual: Number
            },
            retention: {
                projected: Number,
                actual: Number
            },
            acquisition: {
                projected: Number,
                actual: Number
            }
        },
        employee: {
            satisfaction: {
                projected: Number,
                actual: Number
            },
            productivity: {
                projected: Number,
                actual: Number
            },
            turnover: {
                projected: Number,
                actual: Number
            }
        }
    },
    
    // Risks
    risks: [{
        description: String,
        category: String,
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
        },
        status: {
            type: String,
            enum: ['identified', 'monitoring', 'mitigated', 'occurred']
        },
        triggers: [String],
        lastReviewed: Date
    }],
    
    // Dependencies
    dependencies: [{
        initiative: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StrategicInitiative'
        },
        type: {
            type: String,
            enum: ['blocking', 'blocked_by', 'related']
        },
        description: String
    }],
    
    // Status
    status: {
        type: String,
        enum: ['proposed', 'approved', 'in_progress', 'completed', 'on_hold', 'cancelled'],
        default: 'proposed'
    },
    
    // Health
    health: {
        overall: {
            type: String,
            enum: ['green', 'yellow', 'red']
        },
        schedule: {
            type: String,
            enum: ['green', 'yellow', 'red']
        },
        budget: {
            type: String,
            enum: ['green', 'yellow', 'red']
        },
        scope: {
            type: String,
            enum: ['green', 'yellow', 'red']
        },
        risks: {
            type: String,
            enum: ['green', 'yellow', 'red']
        }
    },
    
    // Reports and updates
    updates: [{
        date: Date,
        summary: String,
        progress: Number,
        accomplishments: [String],
        nextSteps: [String],
        challenges: [String],
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        attachments: [String]
    }],
    
    // Lessons learned
    lessonsLearned: [{
        category: String,
        observation: String,
        impact: String,
        recommendation: String,
        documentedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        documentedAt: Date
    }],
    
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
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    approvedAt: Date,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
strategicInitiativeSchema.index({ organization: 1, status: 1 });
strategicInitiativeSchema.index({ organization: 1, priority: 1 });
strategicInitiativeSchema.index({ strategicPlan: 1, objective: 1 });
strategicInitiativeSchema.index({ 'timeline.startDate': 1, 'timeline.plannedEndDate': 1 });

// Methods
strategicInitiativeSchema.methods.calculateProgress = function() {
    const totalMilestones = this.progress.milestones.length;
    if (totalMilestones === 0) {
        this.progress.overall = 0;
    } else {
        const completed = this.progress.milestones.filter(m => m.status === 'completed').length;
        this.progress.overall = Math.round((completed / totalMilestones) * 100);
    }
    
    // Update health based on progress and timeline
    const today = new Date();
    const plannedEndDate = new Date(this.timeline.plannedEndDate);
    const daysDiff = Math.ceil((plannedEndDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) {
        this.health.schedule = 'red';
    } else if (daysDiff < 30) {
        this.health.schedule = 'yellow';
    } else {
        this.health.schedule = 'green';
    }
    
    // Update budget health
    if (this.budget.allocated.total > 0) {
        const spentPercentage = (this.budget.spent.total / this.budget.allocated.total) * 100;
        if (spentPercentage > 100) {
            this.health.budget = 'red';
        } else if (spentPercentage > 90) {
            this.health.budget = 'yellow';
        } else {
            this.health.budget = 'green';
        }
    }
    
    // Update overall health
    const healthValues = [this.health.schedule, this.health.budget, this.health.scope, this.health.risks];
    if (healthValues.includes('red')) {
        this.health.overall = 'red';
    } else if (healthValues.includes('yellow')) {
        this.health.overall = 'yellow';
    } else {
        this.health.overall = 'green';
    }
    
    return this.save();
};

strategicInitiativeSchema.methods.addUpdate = function(updateData, updatedBy) {
    this.updates.push({
        ...updateData,
        date: new Date(),
        updatedBy
    });
    
    this.updatedBy = updatedBy;
    return this.calculateProgress();
};

module.exports = mongoose.model('StrategicInitiative', strategicInitiativeSchema);