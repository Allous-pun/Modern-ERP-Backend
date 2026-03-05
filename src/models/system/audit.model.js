// src/models/system/audit.model.js
const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },

    // Who performed the action
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'actorModel'
    },
    actorModel: {
        type: String,
        required: true,
        enum: ['User', 'OrganizationMember'] // Supreme User or Organization Member
    },
    actorEmail: String,
    actorName: String,

    // What action was performed
    action: {
        type: String,
        required: true,
        enum: [
            // Auth actions
            'login', 'logout', 'login_failed', 'password_change', 'password_reset',
            
            // CRUD actions
            'create', 'update', 'delete', 'view', 'export', 'import',
            
            // Module actions
            'install_module', 'uninstall_module', 'update_module_settings',
            
            // User management
            'invite_user', 'activate_user', 'deactivate_user', 'update_user_role',
            
            // Organization actions
            'create_organization', 'update_organization', 'activate_organization', 
            'deactivate_organization', 'update_subscription',
            
            // Security actions
            'update_security_policies', 'enable_2fa', 'disable_2fa',
            
            // Data actions
            'data_export', 'data_import', 'data_anonymize',
            
            // Risk actions
            'create_risk', 'update_risk', 'archive_risk', 'create_assessment',
            
            // Compliance actions
            'create_compliance_framework', 'update_compliance', 'create_audit',
            
            // Privacy actions
            'record_consent', 'withdraw_consent', 'create_dsr', 'update_dsr',
            'report_breach', 'update_breach', 'create_privacy_policy',
            
            // Backup actions
            'create_backup', 'restore_backup', 'delete_backup', 'download_backup'
        ]
    },

    // What was affected
    targetType: {
        type: String,
        enum: [
            'user', 'organization', 'role', 'permission', 'module',
            'risk', 'assessment', 'compliance', 'audit', 'backup',
            'privacy', 'consent', 'dsr', 'breach', 'policy',
            'setting', 'subscription', 'member', 'invite', 'file'
        ],
        required: true
    },
    targetId: mongoose.Schema.Types.ObjectId,
    targetName: String,

    // Details of the change
    changes: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Request metadata
    metadata: {
        ipAddress: String,
        userAgent: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        requestId: String,
        responseTime: Number,
        statusCode: Number
    },

    // Description (human readable)
    description: {
        type: String,
        required: true
    },

    // Additional context
    context: {
        module: String, // Which module triggered the action
        source: {
            type: String,
            enum: ['web', 'api', 'mobile', 'system'],
            default: 'web'
        },
        sessionId: String
    },

    // Data before/after for sensitive changes
    data: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed
    },

    // For failed actions
    error: {
        message: String,
        stack: String
    },

    // Success status
    success: {
        type: Boolean,
        default: true
    },

    // Retention
    expiresAt: Date // For automatic deletion based on retention policy
}, {
    timestamps: true,
    expires: 90 * 24 * 60 * 60 * 1000 // 90 days default TTL
});

// Indexes for fast queries
auditSchema.index({ organization: 1, createdAt: -1 });
auditSchema.index({ organization: 1, actor: 1 });
auditSchema.index({ organization: 1, action: 1 });
auditSchema.index({ organization: 1, targetType: 1 });
auditSchema.index({ organization: 1, 'metadata.ipAddress': 1 });
auditSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Statics for common queries
auditSchema.statics.findByOrganization = function(organizationId, limit = 100) {
    return this.find({ organization: organizationId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('actor', 'personalInfo.firstName personalInfo.lastName email');
};

auditSchema.statics.findByUser = function(userId, limit = 50) {
    return this.find({ actor: userId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

auditSchema.statics.findByAction = function(action, organizationId, limit = 100) {
    return this.find({ action, organization: organizationId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

auditSchema.statics.findByTarget = function(targetType, targetId, limit = 50) {
    return this.find({ targetType, targetId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

// Virtual for time ago
auditSchema.virtual('timeAgo').get(function() {
    const seconds = Math.floor((new Date() - this.createdAt) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
    }
    return 'just now';
});

module.exports = mongoose.model('Audit', auditSchema);