// src/models/sales/interaction.model.js
const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Related Entities
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: [true, 'Customer is required']
    },
    contact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    },
    lead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead'
    },
    opportunity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Opportunity'
    },
    
    // Interaction Details
    type: {
        type: String,
        required: [true, 'Interaction type is required'],
        enum: [
            'call', 'email', 'meeting', 'note', 'task',
            'sms', 'chat', 'social_media', 'other'
        ],
        index: true
    },
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
        default: 'inbound'
    },
    
    // Subject & Content
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
        maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    content: {
        type: String,
        required: [true, 'Content is required'],
        trim: true,
        maxlength: [5000, 'Content cannot exceed 5000 characters']
    },
    
    // Dates
    date: {
        type: Date,
        required: [true, 'Interaction date is required'],
        default: Date.now,
        index: true
    },
    scheduledDate: Date,
    completedDate: Date,
    
    // Duration (for calls/meetings)
    duration: {
        type: Number, // in minutes
        min: [0, 'Duration cannot be negative']
    },
    
    // Outcome
    outcome: {
        type: String,
        enum: ['completed', 'scheduled', 'cancelled', 'no-show'],
        default: 'completed'
    },
    result: String,
    
    // Follow-up
    followUpRequired: {
        type: Boolean,
        default: false
    },
    followUpDate: Date,
    followUpTask: String,
    
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
    
    // Participants
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: String
    }],
    
    // Location (for meetings)
    location: String,
    meetingLink: String,
    
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
interactionSchema.index({ organization: 1, customer: 1 });
interactionSchema.index({ organization: 1, contact: 1 });
interactionSchema.index({ organization: 1, lead: 1 });
interactionSchema.index({ organization: 1, opportunity: 1 });
interactionSchema.index({ organization: 1, date: -1 });
interactionSchema.index({ followUpDate: 1 });

// Virtual for is overdue
interactionSchema.virtual('isOverdue').get(function() {
    return this.followUpRequired && 
           this.followUpDate && 
           new Date() > this.followUpDate &&
           this.outcome !== 'completed';
});

// Method to schedule follow-up
interactionSchema.methods.scheduleFollowUp = async function(followUpDate, task, userId) {
    this.followUpRequired = true;
    this.followUpDate = followUpDate;
    this.followUpTask = task;
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Method to complete follow-up
interactionSchema.methods.completeFollowUp = async function(userId) {
    this.followUpRequired = false;
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Method to get interaction timeline
interactionSchema.statics.getTimeline = async function(organizationId, customerId, limit = 50) {
    return this.find({
        organization: organizationId,
        customer: customerId
    })
    .sort({ date: -1 })
    .limit(limit)
    .populate('contact', 'firstName lastName')
    .populate('lead', 'firstName lastName company')
    .populate('opportunity', 'name amount')
    .populate('createdBy', 'firstName lastName');
};

// Method to get upcoming follow-ups
interactionSchema.statics.getUpcomingFollowUps = async function(organizationId, userId = null) {
    const query = {
        organization: organizationId,
        followUpRequired: true,
        followUpDate: { $gte: new Date() },
        outcome: { $ne: 'completed' }
    };
    
    if (userId) {
        query['participants.user'] = userId;
    }
    
    return this.find(query)
        .sort({ followUpDate: 1 })
        .populate('customer', 'name')
        .populate('contact', 'firstName lastName');
};

// Method to get interaction summary
interactionSchema.statics.getSummary = async function(organizationId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                organization: mongoose.Types.ObjectId(organizationId),
                date: { $gte: new Date(startDate), $lte: new Date(endDate) }
            }
        },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                inbound: {
                    $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] }
                },
                outbound: {
                    $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('Interaction', interactionSchema);