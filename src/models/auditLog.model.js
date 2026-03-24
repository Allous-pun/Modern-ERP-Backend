// src/models/auditLog.model.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'user_created', 'user_updated', 'user_deleted',
            'role_created', 'role_updated', 'role_deleted',
            'roles_assigned',
            'config_updated',
            'backup_created', 'backup_restored', 'backup_deleted',
            'security_policy_updated',
            'risk_created', 'risk_updated', 'risk_deleted',
            'compliance_check_run',
            'data_privacy_updated',
            'encryption_updated', 'encryption_rotated'
        ]
    },
    target: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'targetModel'
    },
    targetModel: {
        type: String,
        enum: ['User', 'Role', 'Backup', 'Risk', 'Compliance']
    },
    details: {
        type: mongoose.Schema.Types.Mixed
    },
    ipAddress: String,
    userAgent: String
}, {
    timestamps: true
});

auditLogSchema.index({ organization: 1, createdAt: -1 });
auditLogSchema.index({ organization: 1, user: 1 });
auditLogSchema.index({ organization: 1, action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);