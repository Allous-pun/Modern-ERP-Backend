// src/models/executive/digitalTransformation.model.js
const mongoose = require('mongoose');

const digitalTransformationSchema = new mongoose.Schema({
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
    vision: String,
    
    // Category
    category: {
        type: String,
        enum: ['process_automation', 'cloud_migration', 'data_analytics', 'customer_experience', 'workplace_digitalization', 'ai_ml', 'iot', 'blockchain'],
        required: true
    },
    
    // Strategic alignment
    strategicAlignment: {
        businessGoal: String,
        objective: String,
        kpi: [{
            name: String,
            baseline: Number,
            target: Number
        }]
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
        duration: Number, // in days
        phases: [{
            name: String,
            startDate: Date,
            endDate: Date,
            status: {
                type: String,
                enum: ['pending', 'in_progress', 'completed', 'delayed']
            },
            deliverables: [String]
        }]
    },
    
    // Budget and resources
    budget: {
        allocated: {
            total: Number,
            byPhase: [{
                phase: String,
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
        tools: [{
            name: String,
            purpose: String,
            cost: Number
        }]
    },
    
    // Progress tracking
    progress: {
        overall: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        byPhase: [{
            phase: String,
            progress: Number,
            status: String
        }],
        milestones: [{
            name: String,
            dueDate: Date,
            completedDate: Date,
            status: {
                type: String,
                enum: ['pending', 'in_progress', 'completed', 'delayed', 'cancelled']
            },
            deliverables: [String],
            notes: String
        }],
        blockers: [{
            issue: String,
            impact: String,
            severity: {
                type: String,
                enum: ['low', 'medium', 'high', 'critical']
            },
            reportedAt: Date,
            resolvedAt: Date,
            resolution: String,
            status: {
                type: String,
                enum: ['open', 'in_progress', 'resolved']
            }
        }]
    },
    
    // Metrics and KPIs
    metrics: {
        baseline: [{
            name: String,
            value: Number,
            date: Date
        }],
        current: [{
            name: String,
            value: Number,
            date: Date
        }],
        targets: [{
            name: String,
            value: Number,
            deadline: Date
        }],
        achievements: [{
            name: String,
            baseline: Number,
            current: Number,
            improvement: Number,
            target: Number
        }]
    },
    
    // Business impact
    impact: {
        financial: {
            roi: Number,
            paybackPeriod: Number, // months
            npv: Number,
            irr: Number,
            costSavings: Number,
            revenueIncrease: Number
        },
        operational: {
            efficiency: Number,
            productivity: Number,
            quality: Number,
            cycleTime: Number
        },
        customer: {
            satisfaction: Number,
            retention: Number,
            acquisition: Number
        },
        employee: {
            satisfaction: Number,
            productivity: Number,
            adoption: Number
        }
    },
    
    // Risks and issues
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
        }
    }],
    
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
        businessOwner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        itLead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        changeManager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        steeringCommittee: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        }]
    },
    
    // Change management
    changeManagement: {
        communication: [{
            stakeholder: String,
            message: String,
            channel: String,
            sentAt: Date
        }],
        training: [{
            module: String,
            audience: String,
            completed: Number,
            total: Number,
            satisfaction: Number
        }],
        adoption: {
            current: Number,
            target: Number,
            byDepartment: [{
                department: String,
                adoption: Number
            }]
        }
    },
    
    // Status
    status: {
        type: String,
        enum: ['proposed', 'planned', 'in_progress', 'completed', 'on_hold', 'cancelled'],
        default: 'planned'
    },
    
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
        ref: 'OrganizationMember'
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
digitalTransformationSchema.index({ organization: 1, status: 1 });
digitalTransformationSchema.index({ organization: 1, category: 1 });
digitalTransformationSchema.index({ organization: 1, 'timeline.startDate': 1, 'timeline.plannedEndDate': 1 });

// Methods
digitalTransformationSchema.methods.calculateProgress = function() {
    const totalMilestones = this.progress.milestones.length;
    if (totalMilestones === 0) return;
    
    const completed = this.progress.milestones.filter(m => m.status === 'completed').length;
    this.progress.overall = Math.round((completed / totalMilestones) * 100);
    
    // Calculate phase progress
    this.progress.byPhase = this.timeline.phases.map(phase => {
        const phaseMilestones = this.progress.milestones.filter(m => 
            m.dueDate >= phase.startDate && m.dueDate <= phase.endDate
        );
        const phaseCompleted = phaseMilestones.filter(m => m.status === 'completed').length;
        const phaseProgress = phaseMilestones.length > 0 
            ? Math.round((phaseCompleted / phaseMilestones.length) * 100)
            : 0;
            
        let phaseStatus = 'pending';
        if (phaseProgress === 100) phaseStatus = 'completed';
        else if (phaseProgress > 0) phaseStatus = 'in_progress';
        
        return {
            phase: phase.name,
            progress: phaseProgress,
            status: phaseStatus
        };
    });
    
    return this.save();
};

digitalTransformationSchema.methods.calculateROI = function() {
    if (this.budget.allocated.total > 0 && this.impact.financial.costSavings) {
        const totalInvestment = this.budget.allocated.total;
        const totalReturn = this.impact.financial.costSavings + (this.impact.financial.revenueIncrease || 0);
        
        this.impact.financial.roi = ((totalReturn - totalInvestment) / totalInvestment) * 100;
        this.impact.financial.paybackPeriod = totalInvestment / (totalReturn / 12); // months
    }
    return this.save();
};

module.exports = mongoose.model('DigitalTransformation', digitalTransformationSchema);