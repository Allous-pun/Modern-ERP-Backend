// src/models/systemConfig.model.js
const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        unique: true
    },
    settings: {
        security: {
            passwordPolicy: {
                minLength: { type: Number, default: 8 },
                requireUppercase: { type: Boolean, default: true },
                requireNumbers: { type: Boolean, default: true },
                requireSpecialChars: { type: Boolean, default: false },
                expiryDays: { type: Number, default: 90 }
            },
            sessionTimeout: { type: Number, default: 30 },
            maxLoginAttempts: { type: Number, default: 5 },
            twoFactorRequired: { type: Boolean, default: false },
            ipWhitelist: [String]
        },
        backup: {
            autoBackup: { type: Boolean, default: true },
            backupFrequency: { 
                type: String, 
                enum: ['daily', 'weekly', 'monthly'],
                default: 'daily'
            },
            retentionDays: { type: Number, default: 30 }
        },
        audit: {
            logRetentionDays: { type: Number, default: 365 },
            auditLevel: {
                type: String,
                enum: ['basic', 'detailed', 'verbose'],
                default: 'detailed'
            }
        },
        system: {
            maintenanceMode: { type: Boolean, default: false },
            debugMode: { type: Boolean, default: false },
            allowedDomains: [String]
        }
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('SystemConfig', systemConfigSchema);