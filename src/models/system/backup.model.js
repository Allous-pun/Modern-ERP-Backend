// src/models/system/backup.model.js
const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Backup Identification
    filename: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number, // in bytes
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    
    // Backup Details
    type: {
        type: String,
        enum: ['manual', 'automated', 'scheduled'],
        default: 'manual'
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed', 'restoring'],
        default: 'pending'
    },
    
    // Content
    includes: [{
        type: String,
        enum: ['users', 'roles', 'settings', 'modules', 'finance', 'hr', 'sales', 'all']
    }],
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    
    // Restore Info
    restoredAt: Date,
    restoredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    restoreCount: {
        type: Number,
        default: 0
    },
    
    // Error tracking
    errorMessage: String,
    errorStack: String,
    
    // Retention
    expiresAt: Date,
    isArchived: {
        type: Boolean,
        default: false
    },
    
    // Notes
    notes: String,
    
    // Encryption
    isEncrypted: {
        type: Boolean,
        default: true
    },
    encryptionMethod: {
        type: String,
        default: 'AES-256'
    }
}, {
    timestamps: true
});

// Indexes
backupSchema.index({ organization: 1, createdAt: -1 });
backupSchema.index({ organization: 1, status: 1 });
backupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for formatted file size
backupSchema.virtual('formattedSize').get(function() {
    const bytes = this.fileSize;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for duration
backupSchema.virtual('duration').get(function() {
    if (!this.completedAt || !this.createdAt) return null;
    return this.completedAt - this.createdAt; // in milliseconds
});

// Method to mark as completed
backupSchema.methods.markCompleted = function() {
    this.status = 'completed';
    this.completedAt = new Date();
    return this.save();
};

// Method to mark as failed
backupSchema.methods.markFailed = function(error) {
    this.status = 'failed';
    this.errorMessage = error.message;
    this.errorStack = error.stack;
    this.completedAt = new Date();
    return this.save();
};

module.exports = mongoose.model('Backup', backupSchema);