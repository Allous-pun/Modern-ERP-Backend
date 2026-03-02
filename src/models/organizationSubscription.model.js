// src/models/organizationSubscription.model.js
const mongoose = require('mongoose');

const organizationSubscriptionSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        unique: true
    },
    
    // Plan details
    planName: {
        type: String,
        enum: ['trial', 'basic', 'professional', 'enterprise', 'custom'],
        default: 'trial'
    },
    planCode: {
        type: String,
        trim: true
    },
    
    // Billing
    billingCycle: {
        type: String,
        enum: ['monthly', 'quarterly', 'annual', 'one-time'],
        default: 'monthly'
    },
    billingCurrency: {
        type: String,
        default: 'USD'
    },
    price: {
        type: Number,
        default: 0
    },
    
    // Limits
    maxUsers: {
        type: Number,
        default: 5
    },
    maxStorage: {
        type: Number, // in MB
        default: 1024 // 1GB
    },
    maxModules: {
        type: Number,
        default: 10
    },
    
    // Module restrictions
    allowedModules: [{
        type: String,
        description: 'Module slugs allowed in this plan'
    }],
    restrictedModules: [{
        type: String,
        description: 'Module slugs not allowed'
    }],
    
    // Feature restrictions
    features: {
        apiAccess: {
            type: Boolean,
            default: false
        },
        customReports: {
            type: Boolean,
            default: false
        },
        advancedAnalytics: {
            type: Boolean,
            default: false
        },
        prioritySupport: {
            type: Boolean,
            default: false
        },
        whiteLabel: {
            type: Boolean,
            default: false
        }
    },
    
    // Dates
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    trialEndsAt: {
        type: Date
    },
    renewalDate: {
        type: Date
    },
    
    // Status
    status: {
        type: String,
        enum: ['active', 'trial', 'expired', 'cancelled', 'suspended'],
        default: 'trial'
    },
    autoRenew: {
        type: Boolean,
        default: true
    },
    
    // Payment
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'bank_transfer', 'paypal', 'invoice', 'none'],
        default: 'none'
    },
    paymentProvider: {
        type: String,
        trim: true
    },
    subscriptionId: {
        type: String, // ID from payment provider
        trim: true
    },
    
    // Invoicing
    invoiceEmail: {
        type: String,
        trim: true
    },
    billingAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    
    // Metadata
    notes: String,
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancellationReason: String
}, {
    timestamps: true
});

// Indexes
organizationSubscriptionSchema.index({ status: 1 });
organizationSubscriptionSchema.index({ renewalDate: 1 });

// Virtual to check if trial is active
organizationSubscriptionSchema.virtual('isTrialActive').get(function() {
    return this.status === 'trial' && this.trialEndsAt && this.trialEndsAt > new Date();
});

// Virtual to check if subscription is active
organizationSubscriptionSchema.virtual('isActive').get(function() {
    return this.status === 'active' || (this.status === 'trial' && this.isTrialActive);
});

// Virtual to check if expired
organizationSubscriptionSchema.virtual('isExpired').get(function() {
    return this.status === 'expired' || (this.endDate && this.endDate < new Date());
});

// Method to check if user limit reached
organizationSubscriptionSchema.methods.hasReachedUserLimit = async function() {
    const OrganizationMember = mongoose.model('OrganizationMember');
    const count = await OrganizationMember.countDocuments({
        organization: this.organization,
        status: 'active'
    });
    return count >= this.maxUsers;
};

module.exports = mongoose.model('OrganizationSubscription', organizationSubscriptionSchema);