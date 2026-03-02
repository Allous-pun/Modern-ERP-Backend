// src/models/organization.model.js
const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
    // Identity
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
    
    // Business Information
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
    
    // Contact
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
    
    // Address
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
    
    // Currency & Localization
    currency: {
        type: String,
        default: 'USD',
        uppercase: true,
        trim: true
    },
    timezone: {
        type: String,
        default: 'UTC'
    },
    language: {
        type: String,
        default: 'en',
        lowercase: true
    },
    
    // Subscription & Billing
    subscription: {
        plan: {
            type: String,
            enum: ['trial', 'basic', 'professional', 'enterprise'],
            default: 'trial'
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'suspended', 'cancelled', 'expired'],
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

    isActive: {
        type: Boolean,
        default: true
    },
    
    // Parent-Child Relationship
    parentOrganization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    
    // Branches
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
        },
        settings: {
            timezone: String,
            currency: String
        }
    }],
    
    // Status
    status: {
        type: String,
        enum: ['active', 'suspended', 'trial', 'inactive', 'pending'],
        default: 'active'  // ✅ changed default to active
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationDate: Date,
    
    // Modules
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
    
    // Custom Fields
    customFields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    logo: {
        type: String,
        default: null
    },
    favicon: {
        type: String,
        default: null
    },
    theme: {
        primaryColor: { type: String, default: '#3498db' },
        secondaryColor: { type: String, default: '#2c3e50' },
        accentColor: { type: String, default: '#e74c3c' },
        fontFamily: { type: String, default: 'Inter' },
        logoUrl: String,
        faviconUrl: String
    },
    
    // Audit
    lastActive: Date,
    lastSubscriptionUpdate: Date,
    notes: String
}, {
    timestamps: true,
    toJSON: { virtuals: true, transform: (doc, ret) => { delete ret.__v; return ret; } },
    toObject: { virtuals: true }
});

// Indexes
organizationSchema.index({ email: 1 });
organizationSchema.index({ status: 1 });
organizationSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });
organizationSchema.index({ parentOrganization: 1 });
organizationSchema.index({ 'branches.code': 1 });

// Pre-save: code & slug
organizationSchema.pre('save', function() {
    if (!this.organizationCode) {
        this.organizationCode = `ORG-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }
    if (!this.slug && this.name) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
});

// Virtuals
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

organizationSchema.virtual('memberCount', { ref: 'User', localField: '_id', foreignField: 'organization', count: true });
organizationSchema.virtual('installedModulesCount', { ref: 'InstalledModule', localField: '_id', foreignField: 'organization', count: true });
organizationSchema.virtual('activeBranchesCount').get(function() {
    return this.branches?.filter(b => b.isActive).length || 0;
});
organizationSchema.virtual('isOnTrial').get(function() {
    return this.subscription?.plan === 'trial' && this.subscription?.status === 'active';
});
organizationSchema.virtual('subscriptionExpired').get(function() {
    return this.subscription?.endDate && this.subscription.endDate < new Date();
});

// Methods
organizationSchema.methods.hasFeature = function(featureKey) {
    return this.subscription?.features?.includes(featureKey) || false;
};
organizationSchema.methods.canAddUser = async function() {
    const userCount = await mongoose.model('User').countDocuments({ organization: this._id, isActive: true });
    return userCount < (this.subscription?.maxUsers || Infinity);
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

// Statics
organizationSchema.statics.findBySlug = function(slug) { return this.findOne({ slug }); };
organizationSchema.statics.findByOrganizationCode = function(code) { return this.findOne({ organizationCode: code }); };
organizationSchema.statics.findActive = function() { return this.find({ status: 'active' }); };

module.exports = mongoose.model('Organization', organizationSchema);