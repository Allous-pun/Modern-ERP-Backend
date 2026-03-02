// src/models/user.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Core Authentication Fields
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
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
    displayName: {
        type: String,
        trim: true
    },
    avatar: {
        type: String,
        default: null
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer-not-to-say'],
        default: 'prefer-not-to-say'
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
    },
    
    // Organization & Role Assignment
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: false  // Make it optional for migration
    },
        organizations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    }],
    
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }],
    
    // Account Status
    isActive: {
        type: Boolean,
        default: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    
    // Security & Tracking
    lastLogin: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    passwordChangedAt: {
        type: Date
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // Department/Team within organization (optional)
    department: {
        type: String,
        trim: true
    },
    
    // Job Title (optional)
    jobTitle: {
        type: String,
        trim: true
    },
    
    // Employee/Staff ID (optional, for HR purposes)
    employeeId: {
        type: String,
        trim: true
    }
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

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`.trim();
});

// Pre-save middleware to set display name
userSchema.pre('save', function() {
    if (!this.displayName) {
        this.displayName = `${this.firstName} ${this.lastName}`.trim();
    }
});

// Method to check if user has a specific permission
userSchema.methods.hasPermission = async function(permissionString) {
    await this.populate({
        path: 'roles',
        populate: {
            path: 'permissions',
            model: 'Permission'
        }
    });
    
    for (const role of this.roles) {
        for (const permission of role.permissions) {
            const permString = `${permission.module}.${permission.resource}_${permission.action}`;
            if (permString === permissionString) {
                return true;
            }
        }
    }
    return false;
};

// Method to check if user has any of the specified permissions
userSchema.methods.hasAnyPermission = async function(permissionStrings) {
    for (const permString of permissionStrings) {
        if (await this.hasPermission(permString)) {
            return true;
        }
    }
    return false;
};

// Method to check if user has all specified permissions
userSchema.methods.hasAllPermissions = async function(permissionStrings) {
    for (const permString of permissionStrings) {
        if (!(await this.hasPermission(permString))) {
            return false;
        }
    }
    return true;
};

// Method to check if user's organization has a module installed
userSchema.methods.organizationHasModule = async function(moduleSlug) {
    try {
        const InstalledModule = mongoose.model('InstalledModule');
        const Module = mongoose.model('Module');
        
        const module = await Module.findOne({ slug: moduleSlug });
        if (!module) return false;
        
        const installed = await InstalledModule.findOne({
            organization: this.organization,
            module: module._id,
            status: 'active'
        });
        
        return !!installed;
    } catch (error) {
        console.error('Error checking organization module:', error);
        return false;
    }
};

// Method to get user's effective permissions (considering organization modules)
userSchema.methods.getEffectivePermissions = async function() {
    await this.populate({
        path: 'roles',
        populate: {
            path: 'permissions',
            model: 'Permission'
        }
    });
    
    // Get all permissions from roles
    const permissions = new Set();
    for (const role of this.roles) {
        for (const permission of role.permissions) {
            permissions.add(permission);
        }
    }
    
    // Filter permissions based on installed modules
    const effectivePermissions = [];
    for (const permission of permissions) {
        const hasModule = await this.organizationHasModule(permission.module);
        if (hasModule) {
            effectivePermissions.push(permission);
        }
    }
    
    return effectivePermissions;
};

// Index for faster queries
userSchema.index({ organization: 1 });
userSchema.index({ organization: 1, roles: 1 });
userSchema.index({ employeeId: 1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);