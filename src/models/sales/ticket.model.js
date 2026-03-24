// src/models/sales/ticket.model.js
const mongoose = require('mongoose');

const ticketCommentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, 'Comment content is required'],
        maxlength: [2000, 'Comment cannot exceed 2000 characters']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isInternal: {
        type: Boolean,
        default: false
    },
    attachments: [{
        filename: String,
        url: String,
        type: String,
        size: Number
    }]
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Ticket Identity
    ticketNumber: {
        type: String,
        required: [true, 'Ticket number is required'],
        unique: true,
        trim: true
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
    
    // Subject & Description
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
        maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    
    // Category & Priority
    category: {
        type: String,
        enum: ['billing', 'technical', 'general', 'sales', 'support', 'other'],
        default: 'general',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true
    },
    
    // Status
    status: {
        type: String,
        enum: ['open', 'assigned', 'in-progress', 'pending', 'resolved', 'closed'],
        default: 'open',
        index: true
    },
    
    // Assignment
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedAt: Date,
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Team
    team: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: String
    }],
    
    // Dates
    openedAt: {
        type: Date,
        default: Date.now
    },
    dueDate: Date,
    resolvedAt: Date,
    closedAt: Date,
    
    // SLA
    sla: {
        responseDue: Date,
        resolutionDue: Date,
        breached: {
            type: Boolean,
            default: false
        },
        breachReason: String
    },
    
    // Resolution
    resolution: {
        type: String,
        maxlength: [2000, 'Resolution cannot exceed 2000 characters']
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Feedback
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        receivedAt: Date
    },
    
    // Comments
    comments: [ticketCommentSchema],
    
    // Tags
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    
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
    
    // Custom Fields
    customFields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
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
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
ticketSchema.index({ organization: 1, ticketNumber: 1 }, { unique: true });
ticketSchema.index({ organization: 1, customer: 1 });
ticketSchema.index({ organization: 1, status: 1 });
ticketSchema.index({ organization: 1, priority: 1 });
ticketSchema.index({ organization: 1, assignedTo: 1 });
ticketSchema.index({ 'sla.responseDue': 1 });
ticketSchema.index({ 'sla.resolutionDue': 1 });

// Virtual for age
ticketSchema.virtual('age').get(function() {
    const now = this.resolvedAt || this.closedAt || new Date();
    const created = this.createdAt;
    const diffMs = now - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return { days: diffDays, hours: diffHours, total: diffMs };
});

// Virtual for response time
ticketSchema.virtual('responseTime').get(function() {
    if (!this.comments || this.comments.length === 0) return null;
    const firstResponse = this.comments.sort((a, b) => a.createdAt - b.createdAt)[0];
    return firstResponse.createdAt - this.createdAt;
});

// Method to assign ticket
ticketSchema.methods.assign = async function(userId, assignedBy) {
    this.assignedTo = userId;
    this.assignedAt = new Date();
    this.assignedBy = assignedBy;
    this.status = 'assigned';
    this.updatedBy = assignedBy;
    
    await this.save();
    return this;
};

// Method to add comment
ticketSchema.methods.addComment = async function(comment, author, isInternal = false) {
    this.comments.push({
        content: comment,
        author,
        isInternal
    });
    
    if (this.status === 'open' || this.status === 'assigned') {
        this.status = 'in-progress';
    }
    
    this.updatedBy = author;
    await this.save();
    return this;
};

// Method to resolve ticket
ticketSchema.methods.resolve = async function(resolution, userId) {
    this.status = 'resolved';
    this.resolution = resolution;
    this.resolvedAt = new Date();
    this.resolvedBy = userId;
    this.updatedBy = userId;
    
    await this.save();
    return this;
};

// Method to close ticket
ticketSchema.methods.close = async function(userId) {
    this.status = 'closed';
    this.closedAt = new Date();
    this.updatedBy = userId;
    
    await this.save();
    return this;
};

// Method to add feedback
ticketSchema.methods.addFeedback = async function(rating, comment) {
    this.feedback = {
        rating,
        comment,
        receivedAt: new Date()
    };
    
    await this.save();
    return this;
};

// Method to check SLA
ticketSchema.methods.checkSLA = async function() {
    const now = new Date();
    
    if (this.sla.responseDue && now > this.sla.responseDue && this.status === 'open') {
        this.sla.breached = true;
        this.sla.breachReason = 'Response time exceeded';
    }
    
    if (this.sla.resolutionDue && now > this.sla.resolutionDue && this.status !== 'resolved' && this.status !== 'closed') {
        this.sla.breached = true;
        this.sla.breachReason = 'Resolution time exceeded';
    }
    
    await this.save();
    return this.sla.breached;
};

// Static method to get open tickets
ticketSchema.statics.getOpenTickets = async function(organizationId) {
    return this.find({
        organization: organizationId,
        status: { $in: ['open', 'assigned', 'in-progress', 'pending'] }
    })
    .sort({ priority: -1, createdAt: 1 })
    .populate('customer', 'name')
    .populate('assignedTo', 'firstName lastName');
};

// Static method to get tickets by priority
ticketSchema.statics.getTicketsByPriority = async function(organizationId) {
    return this.aggregate([
        {
            $match: {
                organization: mongoose.Types.ObjectId(organizationId)
            }
        },
        {
            $group: {
                _id: '$priority',
                count: { $sum: 1 },
                open: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['open', 'assigned', 'in-progress', 'pending']] },
                            1,
                            0
                        ]
                    }
                },
                resolved: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
                    }
                },
                closed: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'closed'] }, 1, 0]
                    }
                }
            }
        },
        { $sort: { '_id': 1 } }
    ]);
};

module.exports = mongoose.model('Ticket', ticketSchema);