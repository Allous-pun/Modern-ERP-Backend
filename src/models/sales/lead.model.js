// src/models/sales/lead.model.js
const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Basic Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
    },
    phone: {
        type: String,
        trim: true
    },
    mobile: String,
    
    // Company Details
    company: {
        type: String,
        trim: true
    },
    position: {
        type: String,
        trim: true
    },
    website: String,
    industry: String,
    companySize: String,
    annualRevenue: Number,
    
    // Address
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    
    // Lead Source
    source: {
        type: String,
        enum: [
            'website', 'referral', 'social_media', 'email_campaign',
            'phone_inquiry', 'event', 'partner', 'other'
        ],
        default: 'other'
    },
    sourceDetails: String,
    
    // Lead Status
    status: {
        type: String,
        required: [true, 'Lead status is required'],
        enum: [
            'new', 'contacted', 'qualified', 'unqualified',
            'working', 'nurturing', 'converted', 'lost'
        ],
        default: 'new',
        index: true
    },
    statusReason: String,
    
    // Lead Score
    score: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    
    // Assignment
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedAt: Date,
    
    // Qualification
    budget: Number,
    authority: {
        type: String,
        enum: ['low', 'medium', 'high']
    },
    need: String,
    timeline: String,
    
    // Conversion
    convertedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    convertedAt: Date,
    convertedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Activities
    lastContactedAt: Date,
    nextFollowUp: Date,
    followUpCount: {
        type: Number,
        default: 0
    },
    
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
leadSchema.index({ organization: 1, email: 1 }, { unique: true });
leadSchema.index({ organization: 1, status: 1 });
leadSchema.index({ organization: 1, assignedTo: 1 });
leadSchema.index({ organization: 1, score: -1 });
leadSchema.index({ nextFollowUp: 1 });

// Virtual for full name
leadSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`.trim();
});

// Virtual for days since created
leadSchema.virtual('ageInDays').get(function() {
    return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to update lead score
leadSchema.methods.updateScore = function() {
    let score = 0;
    
    // Score based on engagement
    if (this.followUpCount > 0) score += this.followUpCount * 5;
    if (this.lastContactedAt) {
        const daysSinceContact = Math.floor((new Date() - this.lastContactedAt) / (1000 * 60 * 60 * 24));
        if (daysSinceContact < 7) score += 10;
    }
    
    // Score based on qualification
    if (this.budget) score += 15;
    if (this.authority === 'high') score += 20;
    if (this.need) score += 15;
    if (this.timeline) score += 10;
    
    // Score based on company information
    if (this.company) score += 5;
    if (this.position) score += 5;
    if (this.industry) score += 5;
    
    this.score = Math.min(score, 100);
    return this.score;
};

// Method to qualify lead
leadSchema.methods.qualify = async function(userId) {
    this.status = 'qualified';
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Method to disqualify lead
leadSchema.methods.disqualify = async function(reason, userId) {
    this.status = 'unqualified';
    this.statusReason = reason;
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Static method to get leads by score range
leadSchema.statics.getLeadsByScore = async function(organizationId, minScore = 70) {
    return this.find({
        organization: organizationId,
        score: { $gte: minScore },
        status: { $nin: ['converted', 'unqualified', 'lost'] }
    }).sort({ score: -1 });
};

// Static method to get leads needing follow-up
leadSchema.statics.getLeadsNeedingFollowUp = async function(organizationId) {
    const today = new Date();
    return this.find({
        organization: organizationId,
        nextFollowUp: { $lte: today },
        status: { $nin: ['converted', 'unqualified', 'lost'] }
    }).sort({ nextFollowUp: 1 });
};

module.exports = mongoose.model('Lead', leadSchema);