// src/models/executive/executiveReport.model.js
const mongoose = require('mongoose');

const executiveReportSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Report identification
    name: {
        type: String,
        required: true
    },
    description: String,
    reportType: {
        type: String,
        enum: [
            'board', 'investor', 'esg', 'executive_summary', 
            'financial', 'operational', 'strategic', 'custom'
        ],
        required: true
    },
    
    // Target audience/role
    targetRoles: [{
        type: String,
        enum: [
            'board_member', 'chairman', 'ceo', 'coo', 'cfo', 
            'cto', 'cio', 'cro', 'chro', 'strategy_director', 'all_executives'
        ]
    }],
    
    // Report period
    period: {
        startDate: Date,
        endDate: Date,
        type: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
            default: 'monthly'
        },
        fiscalYear: Number,
        quarter: Number,
        month: Number
    },
    
    // Report content
    content: {
        executive: String,
        introduction: String,
        sections: [{
            title: String,
            content: String,
            order: Number,
            charts: [{
                type: {
                    type: String,
                    enum: ['line', 'bar', 'pie', 'donut', 'table', 'metric']
                },
                title: String,
                data: mongoose.Schema.Types.Mixed,
                config: mongoose.Schema.Types.Mixed
            }],
            tables: [{
                title: String,
                headers: [String],
                rows: [mongoose.Schema.Types.Mixed],
                summary: String
            }],
            metrics: [{
                name: String,
                value: mongoose.Schema.Types.Mixed,
                change: Number,
                trend: String,
                icon: String,
                color: String
            }]
        }],
        conclusion: String,
        recommendations: [{
            text: String,
            priority: {
                type: String,
                enum: ['high', 'medium', 'low']
            },
            owner: String,
            deadline: Date
        }],
        attachments: [{
            name: String,
            url: String,
            type: String,
            size: Number
        }]
    },
    
    // Data sources
    dataSources: [{
        module: {
            type: String,
            enum: ['finance', 'sales', 'hr', 'operations', 'marketing', 'executive', 'custom'],
            default: 'custom'
        },
        metrics: [String],
        lastUpdated: Date
    }],
    
    // Visual configuration
    visualization: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'brand'],
            default: 'light'
        },
        logo: String,
        colors: [String],
        font: String,
        pageSize: {
            type: String,
            enum: ['A4', 'Letter', 'Legal'],
            default: 'A4'
        },
        orientation: {
            type: String,
            enum: ['portrait', 'landscape'],
            default: 'portrait'
        }
    },
    
    // Generation status
    status: {
        type: String,
        enum: ['draft', 'generated', 'published', 'archived'],
        default: 'draft'
    },
    generatedAt: Date,
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    publishedAt: Date,
    publishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    version: {
        type: Number,
        default: 1
    },
    
    // Sharing and distribution
    sharing: {
        isPublic: {
            type: Boolean,
            default: false
        },
        shareLink: String,
        sharedWith: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            permissions: {
                type: String,
                enum: ['view', 'download', 'edit'],
                default: 'view'
            },
            sharedAt: Date
        }],
        externalRecipients: [{
            email: String,
            name: String,
            sentAt: Date,
            status: {
                type: String,
                enum: ['pending', 'sent', 'delivered', 'viewed']
            }
        }]
    },
    
    // Distribution schedule
    schedule: {
        enabled: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly']
        },
        dayOfWeek: {
            type: Number,
            min: 0,
            max: 6
        },
        dayOfMonth: {
            type: Number,
            min: 1,
            max: 31
        },
        time: String,
        recipients: [String],
        lastSent: Date,
        nextSend: Date
    },
    
    // Export formats
    exports: [{
        format: {
            type: String,
            enum: ['pdf', 'excel', 'csv', 'json', 'ppt']
        },
        url: String,
        generatedAt: Date,
        size: Number,
        downloaded: {
            count: Number,
            lastDownloaded: Date
        }
    }],
    
    // Access tracking
    access: {
        views: {
            type: Number,
            default: 0
        },
        downloads: {
            type: Number,
            default: 0
        },
        lastViewed: Date,
        viewedBy: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            viewedAt: Date
        }],
        feedback: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            rating: {
                type: Number,
                min: 1,
                max: 5
            },
            comment: String,
            createdAt: Date
        }]
    },
    
    // Templates
    isTemplate: {
        type: Boolean,
        default: false
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExecutiveReport'
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
    tags: [String],
    notes: String
}, {
    timestamps: true
});

// Indexes
executiveReportSchema.index({ organization: 1, reportType: 1 });
executiveReportSchema.index({ organization: 1, 'period.startDate': -1, 'period.endDate': -1 });
executiveReportSchema.index({ organization: 1, targetRoles: 1 });
executiveReportSchema.index({ organization: 1, 'schedule.enabled': 1, 'schedule.nextSend': 1 });

// Methods
executiveReportSchema.methods.incrementViews = function(userId) {
    this.access.views += 1;
    this.access.lastViewed = new Date();
    this.access.viewedBy.push({
        user: userId,
        viewedAt: new Date()
    });
    return this.save();
};

executiveReportSchema.methods.incrementDownloads = function() {
    this.access.downloads += 1;
    return this.save();
};

executiveReportSchema.methods.addFeedback = function(userId, rating, comment) {
    this.access.feedback.push({
        user: userId,
        rating,
        comment,
        createdAt: new Date()
    });
    return this.save();
};

// Statics
executiveReportSchema.statics.getReportsByRole = function(organizationId, role) {
    return this.find({
        organization: organizationId,
        targetRoles: { $in: [role, 'all_executives'] },
        status: 'published'
    }).sort({ createdAt: -1 });
};

executiveReportSchema.statics.getDueScheduledReports = function() {
    const now = new Date();
    return this.find({
        'schedule.enabled': true,
        'schedule.nextSend': { $lte: now },
        status: 'published'
    });
};

module.exports = mongoose.model('ExecutiveReport', executiveReportSchema);
