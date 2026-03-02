// src/models/organizationMember.model.js
const mongoose = require('mongoose');

const organizationMemberSchema = new mongoose.Schema({
    // Core references
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    
    // Member information
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
    employeeId: {
        type: String,
        trim: true
    },
    
    // Member status
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending'],
        default: 'active'
    },
    isDefault: {
        type: Boolean,
        default: false  // Default organization for user
    },
    
    // Metadata
    joinedAt: {
        type: Date,
        default: Date.now
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Permissions override (for special cases)
    permissionsOverride: [{
        type: String,
        description: 'Additional permissions specific to this organization'
    }],
    
    // Notes
    notes: String
}, {
    timestamps: true
});

// Ensure unique user-organization combination
organizationMemberSchema.index({ user: 1, organization: 1 }, { unique: true });

// Index for efficient queries
organizationMemberSchema.index({ organization: 1, status: 1 });
organizationMemberSchema.index({ user: 1, status: 1 });

// Virtual for member profile
organizationMemberSchema.virtual('profile').get(function() {
    return {
        jobTitle: this.jobTitle,
        department: this.department,
        employeeId: this.employeeId,
        joinedAt: this.joinedAt
    };
});

module.exports = mongoose.model('OrganizationMember', organizationMemberSchema);