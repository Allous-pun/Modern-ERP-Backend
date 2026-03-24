// src/models/invite.model.js
const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
    // Who is being invited
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true
    },
    
    // Which organization
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    
    // Who invited them
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // What roles to assign
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }],
    
    // Job information
    jobTitle: {
        type: String,
        trim: true
    },
    department: {
        type: String,
        trim: true
    },
    
    // Invite token
    token: {
        type: String,
        required: true,
        unique: true
    },
    
    // Status
    status: {
        type: String,
        enum: ['pending', 'accepted', 'expired', 'cancelled'],
        default: 'pending'
    },
    
    // Dates
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },
    acceptedAt: Date,
    cancelledAt: Date,
    
    // Message
    message: String
}, {
    timestamps: true
});

// Indexes
inviteSchema.index({ email: 1, organization: 1 });
inviteSchema.index({ status: 1, expiresAt: 1 });

// Virtual to check if invite is valid
inviteSchema.virtual('isValid').get(function() {
    return this.status === 'pending' && this.expiresAt > new Date();
});

module.exports = mongoose.model('Invite', inviteSchema);