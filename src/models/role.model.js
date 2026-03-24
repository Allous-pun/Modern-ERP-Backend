// src/models/role.model.js
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Role name is required'],
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Role description is required']
    },
    category: {
        type: String,
        required: [true, 'Role category is required'],
        enum: [
            'system', 'executive', 'finance', 'hr',
            'sales', 'procurement', 'manufacturing',
            'projects', 'external'
        ]
    },
    permissions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission'
    }],
    isDefault: {
        type: Boolean,
        default: false  // For seeding default roles
    },
    isActive: {
        type: Boolean,
        default: true
    },
    hierarchy: {
        type: Number,
        default: 0  // Higher number = more privileges
    }
}, {
    timestamps: true
});

// Virtual for permission count
roleSchema.virtual('permissionCount').get(function() {
    return this.permissions.length;
});

// Method to check if role has specific permission
roleSchema.methods.hasPermission = function(permissionString) {
    // This will be populated with permissions
    return this.permissions.some(p => p.permissionString === permissionString);
};

module.exports = mongoose.model('Role', roleSchema);