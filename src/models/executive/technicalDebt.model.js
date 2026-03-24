// src/models/executive/technicalDebt.model.js
const mongoose = require('mongoose');

const technicalDebtSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // System/Component identification
    system: {
        type: String,
        required: true
    },
    component: String,
    version: String,
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    
    // Debt categorization
    category: {
        type: String,
        enum: ['code_quality', 'architecture', 'test_coverage', 'documentation', 'dependency', 'infrastructure', 'security'],
        required: true
    },
    type: {
        type: String,
        enum: ['intentional', 'inadvertent', 'bit_rot', 'design_debt'],
        default: 'inadvertent'
    },
    
    // Description
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    location: String, // file path, module, etc.
    
    // Severity assessment
    severity: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
        required: true
    },
    priority: {
        type: String,
        enum: ['immediate', 'high', 'medium', 'low'],
        default: 'medium'
    },
    
    // Impact assessment
    impact: {
        performance: {
            score: Number,
            description: String
        },
        maintainability: {
            score: Number,
            description: String
        },
        scalability: {
            score: Number,
            description: String
        },
        security: {
            score: Number,
            description: String
        },
        reliability: {
            score: Number,
            description: String
        }
    },
    
    // Effort estimation
    effort: {
        estimated: {
            hours: Number,
            cost: Number
        },
        actual: {
            hours: Number,
            cost: Number
        },
        complexity: {
            type: String,
            enum: ['high', 'medium', 'low']
        }
    },
    
    // Interest (cost of carrying debt)
    interest: {
        daily: Number,
        monthly: Number,
        yearly: Number,
        accrued: Number,
        compounding: {
            type: String,
            enum: ['daily', 'weekly', 'monthly']
        }
    },
    
    // Timeline
    identifiedAt: {
        type: Date,
        default: Date.now
    },
    identifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    dueDate: Date,
    resolvedAt: Date,
    
    // Status tracking
    status: {
        type: String,
        enum: ['identified', 'assessed', 'planned', 'in_progress', 'resolved', 'deferred', 'accepted'],
        default: 'identified'
    },
    
    // Resolution plan
    resolution: {
        approach: String,
        steps: [String],
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        reviewDate: Date,
        approvalStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected']
        }
    },
    
    // Dependencies
    dependencies: [{
        type: String,
        version: String,
        status: String
    }],
    
    // Metrics
    metrics: {
        linesOfCode: Number,
        filesAffected: Number,
        testsAffected: Number,
        usersAffected: Number,
        riskScore: Number
    },
    
    // Tags
    tags: [String],
    
    // Comments
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        content: String,
        createdAt: Date
    }],
    
    // History
    history: [{
        status: String,
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        changedAt: Date,
        notes: String
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
technicalDebtSchema.index({ organization: 1, status: 1 });
technicalDebtSchema.index({ organization: 1, severity: 1 });
technicalDebtSchema.index({ organization: 1, system: 1 });

// Methods
technicalDebtSchema.methods.calculateInterest = function() {
    if (this.status !== 'resolved' && this.identifiedAt) {
        const daysOutstanding = Math.floor((new Date() - this.identifiedAt) / (1000 * 60 * 60 * 24));
        this.interest.accrued = this.interest.daily * daysOutstanding;
    }
    return this;
};

technicalDebtSchema.methods.resolve = function(resolvedBy, notes) {
    this.status = 'resolved';
    this.resolvedAt = new Date();
    this.history.push({
        status: 'resolved',
        changedBy: resolvedBy,
        changedAt: new Date(),
        notes: notes || 'Debt resolved'
    });
    this.updatedBy = resolvedBy;
    return this.save();
};

// Statics - FIXED: Use new mongoose.Types.ObjectId() instead of just mongoose.Types.ObjectId()
technicalDebtSchema.statics.getDebtBySeverity = function(organizationId) {
    return this.aggregate([
        { $match: { organization: new mongoose.Types.ObjectId(organizationId), isActive: true } },
        { $group: {
            _id: '$severity',
            count: { $sum: 1 },
            totalEffort: { $sum: '$effort.estimated.hours' },
            totalInterest: { $sum: '$interest.accrued' }
        }},
        { $sort: { _id: 1 } }
    ]);
};

technicalDebtSchema.statics.getDebtByCategory = function(organizationId) {
    return this.aggregate([
        { $match: { organization: new mongoose.Types.ObjectId(organizationId), isActive: true } },
        { $group: {
            _id: '$category',
            count: { $sum: 1 },
            criticalCount: {
                $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
            },
            totalEffort: { $sum: '$effort.estimated.hours' }
        }}
    ]);
};

// Optional: Add a method to calculate technical debt ratio
technicalDebtSchema.statics.getDebtRatio = function(organizationId) {
    return this.aggregate([
        { $match: { organization: new mongoose.Types.ObjectId(organizationId), isActive: true } },
        { $group: {
            _id: null,
            totalDebt: { $sum: '$effort.estimated.hours' },
            criticalDebt: { 
                $sum: { 
                    $cond: [{ $eq: ['$severity', 'critical'] }, '$effort.estimated.hours', 0] 
                } 
            },
            highDebt: { 
                $sum: { 
                    $cond: [{ $eq: ['$severity', 'high'] }, '$effort.estimated.hours', 0] 
                } 
            }
        }}
    ]);
};

// Optional: Add a method to get aging technical debt
technicalDebtSchema.statics.getAgingDebt = function(organizationId) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const ninetyDaysAgo = new Date(now.setDate(now.getDate() - 90));
    
    return this.aggregate([
        { $match: { organization: new mongoose.Types.ObjectId(organizationId), isActive: true, status: { $ne: 'resolved' } } },
        { $group: {
            _id: null,
            lessThan30Days: {
                $sum: { $cond: [{ $gte: ['$identifiedAt', thirtyDaysAgo] }, 1, 0] }
            },
            between30And90Days: {
                $sum: { 
                    $cond: [
                        { $and: [
                            { $lt: ['$identifiedAt', thirtyDaysAgo] },
                            { $gte: ['$identifiedAt', ninetyDaysAgo] }
                        ] }, 
                        1, 0
                    ] 
                }
            },
            moreThan90Days: {
                $sum: { $cond: [{ $lt: ['$identifiedAt', ninetyDaysAgo] }, 1, 0] }
            }
        }}
    ]);
};

module.exports = mongoose.model('TechnicalDebt', technicalDebtSchema);
