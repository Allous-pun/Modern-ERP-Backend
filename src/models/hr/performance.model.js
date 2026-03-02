// src/models/hr/performance.model.js
const mongoose = require('mongoose');

const performanceCriteriaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Criteria name is required'],
        trim: true
    },
    description: String,
    weight: {
        type: Number,
        required: [true, 'Weight is required'],
        min: [0, 'Weight cannot be negative'],
        max: [100, 'Weight cannot exceed 100']
    },
    score: {
        type: Number,
        min: [0, 'Score cannot be negative'],
        max: [100, 'Score cannot exceed 100']
    },
    comments: String,
    ratedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    ratedAt: Date
}, { _id: true });

const performanceGoalSchema = new mongoose.Schema({
    goal: {
        type: String,
        required: [true, 'Goal is required'],
        trim: true
    },
    category: {
        type: String,
        enum: ['performance', 'development', 'behavioral', 'project']
    },
    measurement: String,
    target: String,
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    achievedAt: Date,
    comments: String
}, { _id: true });

const performanceFeedbackSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Feedback provider is required']
    },
    relationship: {
        type: String,
        enum: ['manager', 'peer', 'subordinate', 'self', 'other']
    },
    feedback: {
        type: String,
        required: [true, 'Feedback is required'],
        maxlength: [2000, 'Feedback cannot exceed 2000 characters']
    },
    strengths: String,
    areasForImprovement: String,
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    isAnonymous: {
        type: Boolean,
        default: false
    }
}, { _id: true });

const performanceSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Employee
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: [true, 'Employee is required'],
        index: true
    },
    
    // Review Details
    reviewPeriod: {
        type: String,
        required: [true, 'Review period is required'],
        enum: ['quarterly', 'semi-annual', 'annual', 'probation', 'project']
    },
    year: {
        type: Number,
        required: [true, 'Year is required']
    },
    quarter: {
        type: Number,
        min: 1,
        max: 4
    },
    
    // Dates
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    dueDate: Date,
    completedAt: Date,
    
    // Reviewers
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reviewer is required']
    },
    secondaryReviewers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // Self Assessment
    selfAssessment: {
        content: String,
        submittedAt: Date
    },
    
    // Evaluation Criteria
    criteria: [performanceCriteriaSchema],
    
    // Goals
    goals: [performanceGoalSchema],
    
    // 360 Feedback
    feedback360: [performanceFeedbackSchema],
    
    // Overall Ratings
    overallScore: {
        type: Number,
        min: 0,
        max: 100
    },
    overallRating: {
        type: String,
        enum: ['excellent', 'good', 'satisfactory', 'needs-improvement', 'poor']
    },
    
    // Summary
    summary: {
        type: String,
        maxlength: [5000, 'Summary cannot exceed 5000 characters']
    },
    
    // Achievements
    achievements: [String],
    
    // Areas for Improvement
    areasForImprovement: [String],
    
    // Development Plan
    developmentPlan: {
        type: String,
        maxlength: [2000, 'Development plan cannot exceed 2000 characters']
    },
    
    // Status
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: ['draft', 'self-assessment', 'manager-review', 'hr-review', 'submitted', 'approved', 'rejected'],
        default: 'draft',
        index: true
    },
    
    // Approval
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    approvalComments: String,
    
    // Rejection
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: String,
    
    // Next Review
    nextReviewDate: Date,
    
    // Template
    template: {
        type: String,
        trim: true
    },
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator is required']
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
performanceSchema.index({ organization: 1, employee: 1, year: -1, reviewPeriod: 1 });
performanceSchema.index({ organization: 1, status: 1 });
performanceSchema.index({ organization: 1, reviewer: 1 });
performanceSchema.index({ dueDate: 1 });

// Calculate overall score before save
performanceSchema.pre('save', function(next) {
    if (this.criteria && this.criteria.length > 0) {
        const totalWeight = this.criteria.reduce((sum, c) => sum + c.weight, 0);
        const weightedScore = this.criteria.reduce((sum, c) => sum + (c.score * c.weight / 100), 0);
        
        if (totalWeight > 0) {
            this.overallScore = Math.round((weightedScore / totalWeight) * 100) / 100;
            
            // Determine overall rating
            if (this.overallScore >= 90) {
                this.overallRating = 'excellent';
            } else if (this.overallScore >= 75) {
                this.overallRating = 'good';
            } else if (this.overallScore >= 60) {
                this.overallRating = 'satisfactory';
            } else if (this.overallScore >= 40) {
                this.overallRating = 'needs-improvement';
            } else {
                this.overallRating = 'poor';
            }
        }
    }
    next();
});

// Virtual for progress percentage
performanceSchema.virtual('progress').get(function() {
    if (this.status === 'approved') return 100;
    if (this.status === 'draft') return 20;
    if (this.status === 'self-assessment') return 40;
    if (this.status === 'manager-review') return 60;
    if (this.status === 'hr-review') return 80;
    if (this.status === 'submitted') return 90;
    return 0;
});

// Virtual for days remaining
performanceSchema.virtual('daysRemaining').get(function() {
    if (!this.dueDate) return null;
    const today = new Date();
    if (today > this.dueDate) return 0;
    const diffTime = this.dueDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to add criteria rating
performanceSchema.methods.addCriteriaRating = async function(criteriaId, score, comments, userId) {
    const criteria = this.criteria.id(criteriaId);
    if (!criteria) {
        throw new Error('Criteria not found');
    }
    
    criteria.score = score;
    criteria.comments = comments;
    criteria.ratedBy = userId;
    criteria.ratedAt = new Date();
    
    await this.save();
    return this;
};

// Method to add 360 feedback
performanceSchema.methods.addFeedback = async function(feedbackData) {
    this.feedback360.push(feedbackData);
    await this.save();
    return this;
};

// Method to add goal
performanceSchema.methods.addGoal = async function(goalData) {
    this.goals.push(goalData);
    await this.save();
    return this;
};

// Method to update goal progress
performanceSchema.methods.updateGoalProgress = async function(goalId, progress) {
    const goal = this.goals.id(goalId);
    if (!goal) {
        throw new Error('Goal not found');
    }
    
    goal.progress = progress;
    if (progress >= 100) {
        goal.achievedAt = new Date();
    }
    
    await this.save();
    return this;
};

// Static method to get performance trends
performanceSchema.statics.getPerformanceTrends = async function(organizationId, employeeId, years = 3) {
    const startYear = new Date().getFullYear() - years;
    
    const pipeline = [
        {
            $match: {
                organization: mongoose.Types.ObjectId(organizationId),
                employee: mongoose.Types.ObjectId(employeeId),
                year: { $gte: startYear },
                status: 'approved'
            }
        },
        {
            $group: {
                _id: {
                    year: '$year',
                    period: '$reviewPeriod'
                },
                score: { $avg: '$overallScore' },
                rating: { $first: '$overallRating' }
            }
        },
        { $sort: { '_id.year': 1, '_id.period': 1 } }
    ];
    
    return this.aggregate(pipeline);
};

module.exports = mongoose.model('Performance', performanceSchema);