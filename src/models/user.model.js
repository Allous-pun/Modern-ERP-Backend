// src/models/user.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Core Authentication
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
        index: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    
    // Profile Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    
    // Account Status
    isActive: {
        type: Boolean,
        default: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    
    // Security
    lastLogin: {
        type: Date
    },
    passwordChangedAt: {
        type: Date
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // Simple action log for tracking what the supreme user does
    actionLog: [{
        action: {
            type: String,
            enum: [
                'organization_created',
                'organization_activated',
                'organization_deactivated',
                'organization_reactivated',
                'organization_suspended',
                'subscription_updated',
                'subscription_cancelled',
                'subscription_renewed',
                'subscription_plan_changed',
                'subscription_price_updated',
                'logged_in',
                'logged_out'  // ← ADDED THIS LINE
            ],
            required: true
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization'
        },
        details: {
            type: mongoose.Schema.Types.Mixed
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.__v;
            delete ret.passwordResetToken;
            delete ret.passwordResetExpires;
            return ret;
        }
    }
});

// Simple pre-save hook - fixed to use proper function signature
userSchema.pre('save', async function() {
    // No next() parameter needed - just return a promise or use async/await
    if (!this.displayName) {
        this.displayName = `${this.firstName} ${this.lastName}`.trim();
    }
});

// ============================================
// SIMPLE METHODS FOR SUPREME USER ACTIONS
// ============================================

/**
 * Activate an organization
 */
userSchema.methods.activateOrganization = async function(organizationId) {
    const Organization = mongoose.model('Organization');
    
    const organization = await Organization.findByIdAndUpdate(
        organizationId,
        { 
            status: 'active',
            'subscription.status': 'active'
        },
        { new: true }
    );
    
    // Log the action
    this.actionLog.push({
        action: 'organization_activated',
        targetId: organizationId,
        details: {
            organizationName: organization.name,
            timestamp: new Date()
        }
    });
    
    await this.save();
    return organization;
};

/**
 * Deactivate an organization (when subscription not renewed)
 */
userSchema.methods.deactivateOrganization = async function(organizationId, reason = 'Subscription expired') {
    const Organization = mongoose.model('Organization');
    
    const organization = await Organization.findByIdAndUpdate(
        organizationId,
        { 
            status: 'inactive',
            'subscription.status': 'expired'
        },
        { new: true }
    );
    
    // Log the action
    this.actionLog.push({
        action: 'organization_deactivated',
        targetId: organizationId,
        details: {
            organizationName: organization.name,
            reason,
            timestamp: new Date()
        }
    });
    
    await this.save();
    return organization;
};

/**
 * Update subscription price (e.g., from KSH 100 to new price)
 */
userSchema.methods.updateSubscriptionPrice = async function(newPrice, currency = 'KSH') {
    // This could update a system config or all active subscriptions
    const SystemConfig = mongoose.model('SystemConfig') || null;
    
    if (SystemConfig) {
        await SystemConfig.findOneAndUpdate(
            { key: 'subscription_price' },
            { 
                value: newPrice,
                currency,
                updatedBy: this._id,
                updatedAt: new Date()
            },
            { upsert: true }
        );
    }
    
    // Log the action
    this.actionLog.push({
        action: 'subscription_price_updated',
        details: {
            newPrice,
            currency,
            timestamp: new Date()
        }
    });
    
    await this.save();
    return { newPrice, currency };
};

/**
 * Get all organizations with their subscription status
 */
userSchema.methods.getAllOrganizations = async function(filters = {}) {
    const Organization = mongoose.model('Organization');
    
    const query = {};
    
    // Filter by status if provided
    if (filters.status) {
        query.status = filters.status;
    }
    
    // Filter by subscription plan if provided
    if (filters.plan) {
        query['subscription.plan'] = filters.plan;
    }
    
    const organizations = await Organization.find(query)
        .select('name email status subscription.plan subscription.startDate subscription.endDate subscription.status createdAt')
        .sort({ createdAt: -1 });
    
    return organizations;
};

/**
 * Get organizations with expired subscriptions
 */
userSchema.methods.getExpiredOrganizations = async function() {
    const Organization = mongoose.model('Organization');
    
    const now = new Date();
    
    return Organization.find({
        'subscription.endDate': { $lt: now },
        'subscription.status': { $ne: 'expired' }
    }).select('name email subscription');
};

/**
 * Get summary dashboard data
 */
userSchema.methods.getDashboardSummary = async function() {
    const Organization = mongoose.model('Organization');
    
    const [
        totalOrganizations,
        activeOrganizations,
        inactiveOrganizations,
        trialOrganizations,
        expiredToday
    ] = await Promise.all([
        Organization.countDocuments(),
        Organization.countDocuments({ status: 'active' }),
        Organization.countDocuments({ status: 'inactive' }),
        Organization.countDocuments({ 'subscription.plan': 'trial' }),
        Organization.countDocuments({
            'subscription.endDate': { 
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999)
            }
        })
    ]);
    
    return {
        totalOrganizations,
        activeOrganizations,
        inactiveOrganizations,
        trialOrganizations,
        expiredToday,
        currentSubscriptionPrice: 'KSH 100', // This could come from SystemConfig
        lastLogin: this.lastLogin
    };
};

// Simple indexes
userSchema.index({ isActive: 1 });
userSchema.index({ 'actionLog.timestamp': -1 });

module.exports = mongoose.model('User', userSchema);