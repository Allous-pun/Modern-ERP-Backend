// src/models/installedModule.model.js
const mongoose = require('mongoose');

const installedModuleSchema = new mongoose.Schema({
    // References
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    module: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
        required: true
    },
    moduleSlug: {
        type: String,
        required: true
    },
    
    // Installation Metadata
    installedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    installedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'trial', 'expired'],
        default: 'active'
    },
    
    // Module Configuration (Per Organization)
    settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Feature Toggles
    enabledFeatures: [{
        type: String,
        description: 'Specific features enabled for this module'
    }],
    
    // Subscription Info (Future)
    subscription: {
        plan: String,
        billingCycle: {
            type: String,
            enum: ['monthly', 'quarterly', 'annual'],
            default: 'monthly'
        },
        price: Number,
        currency: {
            type: String,
            default: 'USD'
        },
        renewalDate: Date,
        lastBillingDate: Date
    },
    
    // Usage Metrics
    usage: {
        lastAccessed: Date,
        accessCount: {
            type: Number,
            default: 0
        },
        usersCount: {
            type: Number,
            default: 0
        }
    },
    
    // Metadata
    notes: String
}, {
    timestamps: true
});

// Ensure unique installation per organization/module
installedModuleSchema.index({ organization: 1, module: 1 }, { unique: true });

// Virtual to check if module is active
installedModuleSchema.virtual('isActive').get(function() {
    return this.status === 'active';
});

module.exports = mongoose.model('InstalledModule', installedModuleSchema);