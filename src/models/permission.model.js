// src/models/permission.model.js
const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Permission name is required'],
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Permission description is required']
    },
    module: {
        type: String,
        required: [true, 'Module name is required'],
        enum: [
            'system', 'security', 'governance',
            'finance', 'hr', 'sales', 'crm',
            'procurement', 'inventory', 'manufacturing',
            'projects', 'operations', 'analytics',
            'pos', 'external'
        ]
    },
    resource: {
        type: String,
        required: [true, 'Resource name is required']
    },
    action: {
        type: String,
        required: [true, 'Action is required'],
        enum: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'export', 'import', 'manage', 'perform', 'schedule', 'reconcile', 'view']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index for unique permission combination
permissionSchema.index({ module: 1, resource: 1, action: 1 }, { unique: true });

// Virtual for permission string (module.resource_action)
permissionSchema.virtual('permissionString').get(function() {
    return `${this.module}.${this.resource}_${this.action}`;
});

// Pre-save middleware - WITHOUT 'next' parameter since we're not using it
permissionSchema.pre('save', function() {
    if (!this.name) {
        this.name = `${this.module}.${this.resource}_${this.action}`;
    }
});

module.exports = mongoose.model('Permission', permissionSchema);