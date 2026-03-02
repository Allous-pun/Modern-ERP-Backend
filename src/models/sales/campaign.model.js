// src/models/sales/campaign.model.js
const mongoose = require('mongoose');

const campaignTargetSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['lead', 'customer', 'contact'],
        required: true
    },
    ids: [{
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'target.type'
    }],
    filters: mongoose.Schema.Types.Mixed,
    count: Number
}, { _id: true });

const campaignMetricSchema = new mongoose.Schema({
    date: {
        type: Date,
        default: Date.now
    },
    opens: {
        type: Number,
        default: 0
    },
    clicks: {
        type: Number,
        default: 0
    },
    conversions: {
        type: Number,
        default: 0
    },
    revenue: {
        type: Number,
        default: 0
    }
}, { _id: true });

const campaignSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Basic Information
    name: {
        type: String,
        required: [true, 'Campaign name is required'],
        trim: true,
        maxlength: [200, 'Campaign name cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    
    // Campaign Type
    type: {
        type: String,
        required: [true, 'Campaign type is required'],
        enum: [
            'email', 'social_media', 'ppc', 'seo',
            'event', 'webinar', 'direct_mail', 'telemarketing',
            'referral', 'other'
        ],
        index: true
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
    
    // Budget
    budget: {
        type: Number,
        required: [true, 'Budget is required'],
        min: [0, 'Budget cannot be negative']
    },
    actualCost: {
        type: Number,
        default: 0,
        min: [0, 'Actual cost cannot be negative']
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    
    // Targets
    targetAudience: campaignTargetSchema,
    targetLeads: {
        type: Number,
        default: 0
    },
    targetConversions: {
        type: Number,
        default: 0
    },
    targetRevenue: {
        type: Number,
        default: 0
    },
    
    // Actuals
    actualLeads: {
        type: Number,
        default: 0
    },
    actualConversions: {
        type: Number,
        default: 0
    },
    actualRevenue: {
        type: Number,
        default: 0
    },
    
    // Metrics
    metrics: [campaignMetricSchema],
    
    // ROI
    roi: {
        type: Number,
        default: 0
    },
    roas: {
        type: Number,
        default: 0
    },
    
    // Status
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
        default: 'draft',
        index: true
    },
    
    // Channel specific
    channelConfig: {
        email: {
            template: String,
            subject: String,
            fromName: String,
            fromEmail: String
        },
        social: {
            platforms: [String],
            posts: [mongoose.Schema.Types.Mixed]
        },
        ppc: {
            platforms: [String],
            keywords: [String],
            adGroups: [mongoose.Schema.Types.Mixed]
        }
    },
    
    // Team
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Campaign owner is required']
    },
    team: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: String
    }],
    
    // Tags
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    
    // Attachments
    attachments: [{
        filename: String,
        url: String,
        type: String,
        size: Number,
        uploadedAt: Date,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator is required']
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
campaignSchema.index({ organization: 1, status: 1 });
campaignSchema.index({ organization: 1, type: 1 });
campaignSchema.index({ organization: 1, startDate: 1, endDate: 1 });
campaignSchema.index({ owner: 1 });

// Virtual for progress
campaignSchema.virtual('progress').get(function() {
    const now = new Date();
    if (now < this.startDate) return 0;
    if (now > this.endDate) return 100;
    
    const total = this.endDate - this.startDate;
    const elapsed = now - this.startDate;
    return Math.min(100, Math.round((elapsed / total) * 100));
});

// Virtual for days remaining
campaignSchema.virtual('daysRemaining').get(function() {
    const now = new Date();
    if (now > this.endDate) return 0;
    return Math.ceil((this.endDate - now) / (1000 * 60 * 60 * 24));
});

// Virtual for conversion rate
campaignSchema.virtual('conversionRate').get(function() {
    if (this.actualLeads === 0) return 0;
    return (this.actualConversions / this.actualLeads) * 100;
});

// Virtual for cost per lead
campaignSchema.virtual('costPerLead').get(function() {
    if (this.actualLeads === 0) return 0;
    return this.actualCost / this.actualLeads;
});

// Method to update metrics
campaignSchema.methods.updateMetrics = async function(metrics) {
    this.metrics.push({
        ...metrics,
        date: new Date()
    });
    
    // Update totals
    const latest = this.metrics[this.metrics.length - 1];
    this.actualLeads += latest.opens || 0;
    this.actualConversions += latest.conversions || 0;
    this.actualRevenue += latest.revenue || 0;
    
    // Calculate ROI
    if (this.actualCost > 0) {
        this.roi = ((this.actualRevenue - this.actualCost) / this.actualCost) * 100;
        this.roas = this.actualRevenue / this.actualCost;
    }
    
    await this.save();
    return this;
};

// Method to launch campaign
campaignSchema.methods.launch = async function(userId) {
    this.status = 'active';
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Method to pause campaign
campaignSchema.methods.pause = async function(userId) {
    this.status = 'paused';
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Method to complete campaign
campaignSchema.methods.complete = async function(userId) {
    this.status = 'completed';
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Static method to get active campaigns
campaignSchema.statics.getActiveCampaigns = async function(organizationId) {
    const now = new Date();
    return this.find({
        organization: organizationId,
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now }
    }).populate('owner', 'firstName lastName');
};

// Static method to get campaign performance
campaignSchema.statics.getCampaignPerformance = async function(organizationId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                organization: mongoose.Types.ObjectId(organizationId),
                startDate: { $gte: new Date(startDate) },
                endDate: { $lte: new Date(endDate) }
            }
        },
        {
            $project: {
                name: 1,
                type: 1,
                status: 1,
                budget: 1,
                actualCost: 1,
                actualLeads: 1,
                actualConversions: 1,
                actualRevenue: 1,
                roi: 1,
                roas: 1,
                costPerLead: {
                    $cond: {
                        if: { $gt: ['$actualLeads', 0] },
                        then: { $divide: ['$actualCost', '$actualLeads'] },
                        else: 0
                    }
                },
                conversionRate: {
                    $cond: {
                        if: { $gt: ['$actualLeads', 0] },
                        then: { $multiply: [{ $divide: ['$actualConversions', '$actualLeads'] }, 100] },
                        else: 0
                    }
                }
            }
        },
        { $sort: { roi: -1 } }
    ]);
};

module.exports = mongoose.model('Campaign', campaignSchema);