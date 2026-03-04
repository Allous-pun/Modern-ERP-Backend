// src/models/installedModule.model.js
const mongoose = require('mongoose');

const installedModuleSchema = new mongoose.Schema({
    // References
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    module: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
        required: true
    },
    moduleSlug: {
        type: String,
        required: true,
        index: true
    },
    
    // Installation Metadata
    installedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'installedByModel' // Dynamic ref based on user type
    },
    installedByModel: {
        type: String,
        required: true,
        enum: ['User', 'OrganizationMember'], // Can be either Supreme User or Organization Member
        default: 'User'
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
    
    // Subscription Info
    subscription: {
        plan: {
            type: String,
            enum: ['trial', 'basic', 'premium', 'enterprise'],
            default: 'trial'
        },
        billingCycle: {
            type: String,
            enum: ['monthly', 'quarterly', 'annual', 'one-time'],
            default: 'monthly'
        },
        price: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            default: 'KSH'
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

// Indexes for efficient queries
installedModuleSchema.index({ status: 1 });
installedModuleSchema.index({ 'subscription.renewalDate': 1 });

// Virtual to check if module is active
installedModuleSchema.virtual('isActive').get(function() {
    return this.status === 'active' || this.status === 'trial';
});

// Virtual to check if trial is active
installedModuleSchema.virtual('isTrialActive').get(function() {
    return this.status === 'trial' && 
           this.subscription?.renewalDate && 
           this.subscription.renewalDate > new Date();
});

// Method to check if feature is enabled
installedModuleSchema.methods.isFeatureEnabled = function(featureKey) {
    return this.enabledFeatures.includes(featureKey);
};

// Method to update usage stats
installedModuleSchema.methods.recordAccess = function() {
    this.usage.accessCount += 1;
    this.usage.lastAccessed = new Date();
    return this.save();
};

module.exports = mongoose.model('InstalledModule', installedModuleSchema);