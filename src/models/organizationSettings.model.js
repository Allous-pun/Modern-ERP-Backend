// src/models/organizationSettings.model.js
const mongoose = require('mongoose');

const organizationSettingsSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        unique: true
    },
    
    // Localization
    timezone: {
        type: String,
        default: 'UTC'
    },
    dateFormat: {
        type: String,
        enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
        default: 'DD/MM/YYYY'
    },
    timeFormat: {
        type: String,
        enum: ['12h', '24h'],
        default: '24h'
    },
    firstDayOfWeek: {
        type: Number,
        enum: [0, 1, 6], // 0 = Sunday, 1 = Monday, 6 = Saturday
        default: 1
    },
    
    // Financial
    fiscalYearStart: {
        type: String,
        default: '01-01' // MM-DD format
    },
    fiscalYearEnd: {
        type: String,
        default: '12-31'
    },
    baseCurrency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    multiCurrencyEnabled: {
        type: Boolean,
        default: false
    },
    acceptedCurrencies: [{
        type: String,
        uppercase: true
    }],
    
    // Tax
    taxSystem: {
        type: String,
        enum: ['simple', 'advanced', 'vat', 'gst'],
        default: 'simple'
    },
    taxRates: [{
        name: String,
        rate: Number,
        isDefault: Boolean
    }],
    
    // Communication
    defaultLanguage: {
        type: String,
        default: 'en'
    },
    languages: [{
        code: String,
        name: String,
        isActive: Boolean
    }],
    
    // Security
    passwordPolicy: {
        minLength: {
            type: Number,
            default: 8
        },
        requireUppercase: {
            type: Boolean,
            default: true
        },
        requireNumbers: {
            type: Boolean,
            default: true
        },
        requireSpecialChars: {
            type: Boolean,
            default: false
        },
        expiryDays: {
            type: Number,
            default: 90
        }
    },
    
    // Session
    sessionTimeout: {
        type: Number,
        default: 30 // minutes
    },
    maxLoginAttempts: {
        type: Number,
        default: 5
    },
    
    // Notifications
    emailNotifications: {
        type: Boolean,
        default: true
    },
    notificationChannels: [{
        type: String,
        enum: ['email', 'sms', 'push', 'in-app'],
        default: ['email', 'in-app']
    }],
    
    // Features
    features: {
        twoFactorAuth: {
            type: Boolean,
            default: false
        },
        ssoEnabled: {
            type: Boolean,
            default: false
        },
        apiAccess: {
            type: Boolean,
            default: true
        },
        webhooks: {
            type: Boolean,
            default: false
        }
    },
    
    // Appearance
    theme: {
        primaryColor: String,
        secondaryColor: String,
        logo: String,
        favicon: String,
        customCSS: String
    },
    
    // Metadata
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Method to get effective setting
organizationSettingsSchema.methods.getEffectiveSetting = function(key, defaultValue = null) {
    return this[key] !== undefined ? this[key] : defaultValue;
};

module.exports = mongoose.model('OrganizationSettings', organizationSettingsSchema);