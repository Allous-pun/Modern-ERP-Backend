// src/models/organization.model.js
const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
    // ============================================
    // CORE IDENTITY - Keep
    // ============================================
    name: {
        type: String,
        required: [true, 'Organization name is required'],
        trim: true
    },
    legalName: {
        type: String,
        trim: true
    },
    slug: {
        type: String,
        required: [true, 'Organization slug is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    organizationCode: {
        type: String,
        unique: true,
        trim: true,
        sparse: true
    },
    
    // ============================================
    // BUSINESS INFORMATION - Keep
    // ============================================
    registrationNumber: {
        type: String,
        trim: true
    },
    taxNumber: {
        type: String,
        trim: true
    },
    industry: {
        type: String,
        enum: [
            'technology', 'manufacturing', 'retail', 'healthcare',
            'education', 'hospitality', 'construction', 'finance',
            'consulting', 'nonprofit', 'government', 'other'
        ],
        default: 'other'
    },
    organizationSize: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
        default: '1-10'
    },
    
    // ============================================
    // CONTACT - Keep (basic contact for the business)
    // ============================================
    email: {
        type: String,
        required: [true, 'Organization email is required'],
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
        type: String,
        trim: true
    },
    website: {
        type: String,
        trim: true,
        match: [/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, 'Please provide a valid URL']
    },
    
    // ============================================
    // ADDRESS - Keep
    // ============================================
    address: {
        street: String,
        city: String,
        state: String,
        country: {
            type: String,
            default: 'US'
        },
        postalCode: String
    },
    
    // ============================================
    // SUBSCRIPTION & BILLING - Keep (core to SaaS)
    // ============================================
    subscription: {
        plan: {
            type: String,
            enum: ['trial', 'basic', 'professional', 'enterprise'],
            default: 'trial'
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'suspended', 'cancelled', 'expired', 'trial'], // ← ADD 'trial' HERE
            default: 'active'
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        endDate: Date,
        autoRenew: {
            type: Boolean,
            default: true
        },
        features: [{
            type: String
        }],
        maxUsers: {
            type: Number,
            default: 5
        },
        maxStorage: {
            type: Number,
            default: 10
        },
        priceId: String,
        stripeCustomerId: String,
        stripeSubscriptionId: String
    },

    // ============================================
    // STATUS - Keep
    // ============================================
    isActive: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'trial', 'inactive', 'pending'],
        default: 'active'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationDate: Date,
    
    // ============================================
    // HIERARCHY - Keep
    // ============================================
    parentOrganization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    
    // ============================================
    // BRANCHES - Keep (physical locations)
    // ============================================
    branches: [{
        name: {
            type: String,
            required: true
        },
        code: {
            type: String,
            required: true
        },
        address: {
            street: String,
            city: String,
            state: String,
            country: String,
            postalCode: String
        },
        phone: String,
        email: String,
        manager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        isActive: {
            type: Boolean,
            default: true
        }
        // Removed branch-specific settings - these should come from OrganizationSettings
    }],
    
    // ============================================
    // MODULES - Keep (what's installed)
    // ============================================
    installedModules: [{
        module: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Module'
        },
        installedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'suspended'],
            default: 'active'
        },
        settings: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        enabledFeatures: [String]
    }],
    
    // ============================================
    // CUSTOM FIELDS - Keep (dynamic data)
    // ============================================
    customFields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    
    // ============================================
    // METADATA - Keep
    // ============================================
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    logo: {
        type: String,
        default: null  // Keep basic logo, detailed theme in Settings
    },
    favicon: {
        type: String,
        default: null  // Keep basic favicon, detailed theme in Settings
    },
    
    // ============================================
    // AUDIT - Keep
    // ============================================
    lastActive: Date,
    lastSubscriptionUpdate: Date,
    notes: String
}, {
    timestamps: true,
    toJSON: { virtuals: true, transform: (doc, ret) => { delete ret.__v; return ret; } },
    toObject: { virtuals: true }
});

// ============================================
// INDEXES - Keep
// ============================================
organizationSchema.index({ email: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });
organizationSchema.index({ parentOrganization: 1 });
organizationSchema.index({ 'branches.code': 1 });

// ============================================
// PRE-SAVE - Keep
// ============================================
organizationSchema.pre('save', function() {
    if (!this.organizationCode) {
        this.organizationCode = `ORG-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }
    if (!this.slug && this.name) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
});

// ============================================
// VIRTUALS - Keep/Update
// ============================================
organizationSchema.virtual('fullAddress').get(function() {
    if (!this.address) return '';
    return [
        this.address.street,
        this.address.city,
        this.address.state,
        this.address.country,
        this.address.postalCode
    ].filter(Boolean).join(', ');
});

// Update memberCount to use OrganizationMember model
organizationSchema.virtual('memberCount', { 
    ref: 'OrganizationMember', 
    localField: '_id', 
    foreignField: 'organization', 
    count: true 
});

organizationSchema.virtual('installedModulesCount', { 
    ref: 'InstalledModule', 
    localField: '_id', 
    foreignField: 'organization', 
    count: true 
});

organizationSchema.virtual('activeBranchesCount').get(function() {
    return this.branches?.filter(b => b.isActive).length || 0;
});

organizationSchema.virtual('isOnTrial').get(function() {
    return this.subscription?.plan === 'trial' && this.subscription?.status === 'active';
});

organizationSchema.virtual('subscriptionExpired').get(function() {
    return this.subscription?.endDate && this.subscription.endDate < new Date();
});

// New virtual to get settings
organizationSchema.virtual('settings', {
    ref: 'OrganizationSettings',
    localField: '_id',
    foreignField: 'organization',
    justOne: true
});

// ============================================
// METHODS - Keep/Update
// ============================================
organizationSchema.methods.hasFeature = function(featureKey) {
    return this.subscription?.features?.includes(featureKey) || false;
};

// Update canAddUser to use OrganizationMember
organizationSchema.methods.canAddUser = async function() {
    const OrganizationMember = mongoose.model('OrganizationMember');
    const memberCount = await OrganizationMember.countDocuments({ 
        organization: this._id, 
        status: 'active' 
    });
    return memberCount < (this.subscription?.maxUsers || Infinity);
};

organizationSchema.methods.isModuleInstalled = function(moduleSlug) {
    return this.installedModules?.some(im => im.module?.slug === moduleSlug && im.status === 'active') || false;
};

organizationSchema.methods.getModuleSettings = function(moduleSlug) {
    const installed = this.installedModules?.find(im => im.module?.slug === moduleSlug);
    return installed?.settings || {};
};

organizationSchema.methods.getBranchByCode = function(code) {
    return this.branches?.find(b => b.code === code);
};

// New method to get settings
organizationSchema.methods.getSettings = async function() {
    const OrganizationSettings = mongoose.model('OrganizationSettings');
    let settings = await OrganizationSettings.findOne({ organization: this._id });
    
    if (!settings) {
        // Create default settings if none exist
        settings = await OrganizationSettings.create({
            organization: this._id
        });
    }
    
    return settings;
};

// ============================================
// STATICS - Keep
// ============================================
organizationSchema.statics.findBySlug = function(slug) { 
    return this.findOne({ slug }); 
};

organizationSchema.statics.findByOrganizationCode = function(code) { 
    return this.findOne({ organizationCode: code }); 
};

organizationSchema.statics.findActive = function() { 
    return this.find({ status: 'active' }); 
};

module.exports = mongoose.model('Organization', organizationSchema);