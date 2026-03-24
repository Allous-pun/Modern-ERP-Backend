// src/models/executive/innovationPipeline.model.js
const mongoose = require('mongoose');

const innovationPipelineSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Idea/Innovation details
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    problem: String,
    solution: String,
    
    // Categorization
    category: {
        type: String,
        enum: ['product', 'process', 'service', 'business_model', 'technology', 'customer_experience'],
        required: true
    },
    subCategory: String,
    
    // Innovation type
    type: {
        type: String,
        enum: ['incremental', 'disruptive', 'radical', 'architectural'],
        default: 'incremental'
    },
    
    // Origin
    source: {
        type: String,
        enum: ['employee', 'customer', 'partner', 'research', 'competitor', 'market'],
        required: true
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    department: String,
    
    // Timeline
    submittedAt: {
        type: Date,
        default: Date.now
    },
    reviewedAt: Date,
    approvedAt: Date,
    implementedAt: Date,
    
    // Status tracking
    status: {
        type: String,
        enum: ['submitted', 'under_review', 'approved', 'in_development', 'testing', 'implemented', 'rejected', 'on_hold'],
        default: 'submitted'
    },
    stage: {
        type: String,
        enum: ['ideation', 'validation', 'prototyping', 'development', 'piloting', 'launch'],
        default: 'ideation'
    },
    
    // Assessment
    potential: {
        marketSize: Number,
        revenuePotential: Number,
        costSavings: Number,
        customerImpact: Number,
        strategicAlignment: Number,
        overall: {
            type: String,
            enum: ['high', 'medium', 'low']
        }
    },
    
    // Effort estimation
    effort: {
        development: {
            type: String,
            enum: ['high', 'medium', 'low']
        },
        resources: {
            type: String,
            enum: ['high', 'medium', 'low']
        },
        time: {
            type: String,
            enum: ['high', 'medium', 'low']
        },
        overall: {
            type: String,
            enum: ['high', 'medium', 'low']
        }
    },
    
    // Resources
    resources: {
        budget: {
            allocated: Number,
            spent: Number,
            remaining: Number
        },
        team: [{
            member: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            role: String,
            allocation: Number // percentage
        }],
        tools: [String]
    },
    
    // Development tracking
    development: {
        lead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        milestones: [{
            name: String,
            dueDate: Date,
            completedDate: Date,
            status: {
                type: String,
                enum: ['pending', 'in_progress', 'completed', 'delayed']
            },
            deliverables: [String]
        }],
        progress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        blockers: [{
            issue: String,
            severity: String,
            reportedAt: Date,
            resolvedAt: Date,
            status: String
        }]
    },
    
    // Testing & Validation
    testing: {
        testPlan: String,
        testCases: [{
            name: String,
            result: {
                type: String,
                enum: ['passed', 'failed', 'pending']
            },
            notes: String
        }],
        userTesting: {
            participants: Number,
            satisfaction: Number,
            feedback: [String]
        },
        pilotGroup: [{
            customer: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Customer'
            },
            feedback: String,
            startDate: Date,
            endDate: Date
        }]
    },
    
    // Business Impact
    impact: {
        actual: {
            revenue: Number,
            savings: Number,
            customers: Number,
            efficiency: Number
        },
        projected: {
            revenue: Number,
            savings: Number,
            customers: Number,
            efficiency: Number
        },
        roi: Number,
        paybackPeriod: Number,
        metrics: [{
            name: String,
            baseline: Number,
            current: Number,
            target: Number,
            improvement: Number
        }]
    },
    
    // Intellectual Property
    ip: {
        patentFiled: {
            type: Boolean,
            default: false
        },
        patentNumber: String,
        patentDate: Date,
        trademark: String,
        copyright: String,
        tradeSecret: Boolean
    },
    
    // Documentation
    documentation: {
        proposal: String,
        businessCase: String,
        technicalSpec: String,
        userManual: String,
        training: String
    },
    
    // Attachments
    attachments: [{
        name: String,
        url: String,
        type: String,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        uploadedAt: Date
    }],
    
    // Comments/Feedback
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        attachments: [String]
    }],
    
    // Review history
    reviews: [{
        reviewer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        stage: String,
        decision: {
            type: String,
            enum: ['approve', 'reject', 'more_info', 'modify']
        },
        comments: String,
        score: Number,
        reviewedAt: {
            type: Date,
            default: Date.now
        }
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
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
innovationPipelineSchema.index({ organization: 1, status: 1 });
innovationPipelineSchema.index({ organization: 1, category: 1 });
innovationPipelineSchema.index({ organization: 1, 'potential.overall': 1 });

// Methods
innovationPipelineSchema.methods.calculateROI = function() {
    if (this.impact.projected && this.resources.budget) {
        const totalInvestment = this.resources.budget.allocated;
        const totalReturn = this.impact.projected.revenue || this.impact.projected.savings || 0;
        
        if (totalInvestment > 0) {
            this.impact.roi = ((totalReturn - totalInvestment) / totalInvestment) * 100;
            this.impact.paybackPeriod = totalInvestment / (totalReturn / 12); // months
        }
    }
    return this;
};

innovationPipelineSchema.methods.updateProgress = function() {
    if (this.development && this.development.milestones) {
        const total = this.development.milestones.length;
        const completed = this.development.milestones.filter(m => m.status === 'completed').length;
        
        if (total > 0) {
            this.development.progress = (completed / total) * 100;
        }
    }
    return this;
};

module.exports = mongoose.model('InnovationPipeline', innovationPipelineSchema);