// src/models/executive/strategicObjective.model.js
const mongoose = require('mongoose');

const strategicObjectiveSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Objective identification
    name: {
        type: String,
        required: true
    },
    description: String,
    category: {
        type: String,
        enum: ['growth', 'profitability', 'innovation', 'customer', 'operational', 'talent', 'sustainability'],
        required: true
    },
    
    // Strategic alignment
    strategicPlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StrategicPlan'
    },
    pillar: String,
    weight: {
        type: Number,
        min: 0,
        max: 100,
        default: 1
    },
    
    // Timeframe
    timeframe: {
        startDate: Date,
        endDate: Date,
        quarter: Number,
        year: Number,
        type: {
            type: String,
            enum: ['quarterly', 'annual', 'multi_year']
        }
    },
    
    // Owner and stakeholders
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    stakeholders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    }],
    departments: [String],
    
    // Key Results (OKRs)
    keyResults: [{
        description: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['metric', 'milestone', 'project']
        },
        baseline: {
            value: Number,
            date: Date
        },
        target: {
            value: Number,
            date: Date
        },
        current: {
            value: Number,
            date: Date
        },
        unit: String,
        progress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        confidence: {
            type: Number,
            min: 0,
            max: 100,
            default: 50
        },
        status: {
            type: String,
            enum: ['on_track', 'at_risk', 'behind', 'completed', 'not_started'],
            default: 'not_started'
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        initiatives: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StrategicInitiative'
        }],
        history: [{
            date: Date,
            value: Number,
            note: String,
            updatedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            }
        }],
        dependencies: [String]
    }],
    
    // Progress tracking
    progress: {
        overall: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        byKeyResult: [{
            keyResultId: String,
            progress: Number,
            status: String
        }],
        lastUpdated: Date
    },
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'active', 'completed', 'at_risk', 'behind', 'archived'],
        default: 'draft'
    },
    
    // Dependencies
    dependencies: [{
        objective: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StrategicObjective'
        },
        type: {
            type: String,
            enum: ['blocking', 'blocked_by', 'related']
        }
    }],
    
    // Risks
    risks: [{
        description: String,
        probability: {
            type: String,
            enum: ['low', 'medium', 'high']
        },
        impact: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
        },
        mitigation: String,
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        status: {
            type: String,
            enum: ['identified', 'monitoring', 'mitigated']
        }
    }],
    
    // Resources
    resources: {
        budget: {
            allocated: Number,
            spent: Number,
            currency: {
                type: String,
                default: 'USD'
            }
        },
        headcount: [{
            role: String,
            count: Number,
            allocation: Number
        }],
        dependencies: [String]
    },
    
    // Metrics
    metrics: [{
        name: String,
        baseline: Number,
        target: Number,
        current: Number,
        unit: String,
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly']
        },
        trend: {
            direction: String,
            percentage: Number
        }
    }],
    
    // Comments and notes
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        content: String,
        createdAt: Date,
        attachments: [String]
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
strategicObjectiveSchema.index({ organization: 1, status: 1 });
strategicObjectiveSchema.index({ organization: 1, owner: 1 });
strategicObjectiveSchema.index({ strategicPlan: 1 });

// Methods
strategicObjectiveSchema.methods.calculateProgress = function() {
    let totalProgress = 0;
    let totalKeyResults = 0;
    
    this.keyResults.forEach(kr => {
        if (kr.target && kr.target.value && kr.current && kr.current.value) {
            const progress = (kr.current.value / kr.target.value) * 100;
            kr.progress = Math.min(progress, 100);
            totalProgress += kr.progress;
            totalKeyResults++;
            
            // Update status based on progress
            if (kr.progress >= 100) {
                kr.status = 'completed';
            } else if (kr.progress >= 75) {
                kr.status = 'on_track';
            } else if (kr.progress >= 50) {
                kr.status = 'at_risk';
            } else {
                kr.status = 'behind';
            }
        }
    });
    
    this.progress.overall = totalKeyResults > 0 ? Math.round(totalProgress / totalKeyResults) : 0;
    this.progress.lastUpdated = new Date();
    
    // Update overall objective status
    const completedCount = this.keyResults.filter(kr => kr.status === 'completed').length;
    const atRiskCount = this.keyResults.filter(kr => kr.status === 'at_risk').length;
    const behindCount = this.keyResults.filter(kr => kr.status === 'behind').length;
    
    if (completedCount === this.keyResults.length && this.keyResults.length > 0) {
        this.status = 'completed';
    } else if (behindCount > 0) {
        this.status = 'behind';
    } else if (atRiskCount > 0) {
        this.status = 'at_risk';
    } else if (this.progress.overall > 0) {
        this.status = 'active';
    }
    
    return this.save();
};

strategicObjectiveSchema.methods.updateKeyResult = function(keyResultId, value, note, updatedBy) {
    const kr = this.keyResults.id(keyResultId);
    if (kr) {
        kr.history.push({
            date: new Date(),
            value,
            note,
            updatedBy
        });
        
        kr.current = {
            value,
            date: new Date()
        };
        
        this.updatedBy = updatedBy;
        return this.calculateProgress();
    }
    return Promise.reject(new Error('Key result not found'));
};

module.exports = mongoose.model('StrategicObjective', strategicObjectiveSchema);