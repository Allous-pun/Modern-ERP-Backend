// src/models/organizationMember.model.js
const mongoose = require('mongoose');

const organizationMemberSchema = new mongoose.Schema({
    // ============================================
    // Core References (only Organization)
    // ============================================
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // ============================================
    // EMBEDDED USER INFORMATION (No User model reference)
    // ============================================
    personalInfo: {
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
        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            trim: true,
            match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
        },
        phoneNumber: {
            type: String,
            trim: true
        },
        dateOfBirth: Date,
        gender: {
            type: String,
            enum: ['male', 'female', 'other', 'prefer-not-to-say'],
            default: 'prefer-not-to-say'
        }
    },
    
    // ============================================
    // AVATAR (Cloudinary support)
    // ============================================
    avatar: {
        url: {
            type: String,
            default: null
        },
        publicId: {
            type: String,
            default: null
        },
        uploadedAt: Date
    },
    
    // ============================================
    // Authentication (for organization members)
    // ============================================
    auth: {
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false
        },
        lastLogin: Date,
        loginAttempts: {
            type: Number,
            default: 0
        },
        lockUntil: Date,
        passwordChangedAt: Date,
        passwordResetToken: String,
        passwordResetExpires: Date,
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        emailVerificationToken: String,
        emailVerificationExpires: Date
    },
    
    // ============================================
    // Branch Assignment
    // ============================================
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization.branches'
    },
    isBranchManager: {
        type: Boolean,
        default: false
    },
    
    // ============================================
    // Roles & Permissions
    // ============================================
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }],
    
    // ============================================
    // Job Information
    // ============================================
    jobTitle: {
        type: String,
        trim: true
    },
    department: {
        type: String,
        trim: true
    },
    employeeId: {
        type: String,
        trim: true,
        sparse: true
    },
    reportsTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember' // Self-reference for hierarchy
    },
    
    // ============================================
    // Employment Details
    // ============================================
    employmentType: {
        type: String,
        enum: ['full_time', 'part_time', 'contract', 'intern', 'temporary'],
        default: 'full_time'
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember' // Reference to another member who invited them
    },
    
    // ============================================
    // Organization-Specific Contact (override)
    // ============================================
    organizationContact: {
        email: {
            type: String,
            lowercase: true,
            trim: true
        },
        phone: {
            type: String,
            trim: true
        },
        extension: String
    },
    
    // ============================================
    // Module-Specific Access
    // ============================================
    moduleAccess: [{
        module: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Module'
        },
        settings: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        permissions: [String],
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    
    // ============================================
    // Permissions Override
    // ============================================
    permissionsOverride: [{
        type: String
    }],
    
    // ============================================
    // Status
    // ============================================
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending', 'on_leave'],
        default: 'pending'
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    
    // ============================================
    // Metadata
    // ============================================
    notes: String,
    lastActive: Date
}, {
    timestamps: true,
    toJSON: { 
        virtuals: true,
        transform: (doc, ret) => {
            // Only try to delete auth properties if auth exists
            if (ret.auth) {
                delete ret.auth.password;
                delete ret.auth.passwordResetToken;
                delete ret.auth.passwordResetExpires;
                delete ret.auth.emailVerificationToken;
                delete ret.auth.emailVerificationExpires;
            }
            delete ret.__v;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// ============================================
// INDEXES - UPDATED
// ============================================
// Ensure unique email per organization (THIS IS THE CORRECT UNIQUE CONSTRAINT)
organizationMemberSchema.index({ 'personalInfo.email': 1, organization: 1 }, { unique: true });

// Other indexes (keep these)
organizationMemberSchema.index({ organization: 1, status: 1 });
organizationMemberSchema.index({ branch: 1, status: 1 });
organizationMemberSchema.index({ reportsTo: 1 });
organizationMemberSchema.index({ department: 1 });
organizationMemberSchema.index({ employeeId: 1, organization: 1 }, { sparse: true });

// REMOVE THIS OLD INDEX - it's causing the error
// organizationMemberSchema.index({ user: 1, organization: 1 }, { unique: true }); // ❌ DELETE THIS LINE

// ============================================
// VIRTUALS
// ============================================
organizationMemberSchema.virtual('fullName').get(function() {
    return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`.trim();
});

organizationMemberSchema.virtual('initials').get(function() {
    return `${this.personalInfo.firstName.charAt(0)}${this.personalInfo.lastName.charAt(0)}`.toUpperCase();
});

organizationMemberSchema.virtual('isAdmin').get(function() {
    return this.roles?.some(role => role.name === 'Organization Admin') || false;
});

organizationMemberSchema.virtual('managedBranch').get(async function() {
    if (!this.isBranchManager || !this.branch) return null;
    const Organization = mongoose.model('Organization');
    const org = await Organization.findById(this.organization);
    return org?.branches?.id(this.branch);
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================
organizationMemberSchema.pre('save', function() {
    // Set display name if not provided
    if (!this.personalInfo.displayName) {
        this.personalInfo.displayName =
            `${this.personalInfo.firstName} ${this.personalInfo.lastName}`.trim();
    }
});

// ============================================
// METHODS
// ============================================

/**
 * Check if member has access to a specific module
 */
organizationMemberSchema.methods.hasModuleAccess = function(moduleSlug) {
    return this.moduleAccess?.some(ma => ma.module?.slug === moduleSlug && ma.isActive) || false;
};

/**
 * Get module settings for member
 */
organizationMemberSchema.methods.getModuleSettings = function(moduleSlug) {
    const access = this.moduleAccess?.find(ma => ma.module?.slug === moduleSlug);
    return access?.settings || {};
};

/**
 * Check if member has a specific permission
 */
organizationMemberSchema.methods.hasPermission = function(permission) {
    return this.permissionsOverride?.includes(permission) || false;
};

/**
 * Update avatar
 */
organizationMemberSchema.methods.updateAvatar = function(url, publicId) {
    this.avatar = {
        url,
        publicId,
        uploadedAt: new Date()
    };
    return this.save();
};

/**
 * Remove avatar
 */
organizationMemberSchema.methods.removeAvatar = function() {
    this.avatar = {
        url: null,
        publicId: null,
        uploadedAt: null
    };
    return this.save();
};

/**
 * Verify password (to be used with bcrypt)
 */
organizationMemberSchema.methods.verifyPassword = async function(candidatePassword) {
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(candidatePassword, this.auth.password);
};

// ============================================
// STATICS
// ============================================

/**
 * Find members by organization
 */
organizationMemberSchema.statics.findByOrganization = function(organizationId, status = 'active') {
    return this.find({ 
        organization: organizationId, 
        status 
    }).populate('roles', 'name description');
};

/**
 * Find members by branch
 */
organizationMemberSchema.statics.findByBranch = function(organizationId, branchId, status = 'active') {
    return this.find({ 
        organization: organizationId, 
        branch: branchId,
        status 
    }).populate('roles', 'name description');
};

/**
 * Find member by email in organization
 */
organizationMemberSchema.statics.findByEmail = function(organizationId, email) {
    return this.findOne({ 
        organization: organizationId,
        'personalInfo.email': email 
    });
};

/**
 * Find managers
 */
organizationMemberSchema.statics.findManagers = function(organizationId) {
    return this.find({ 
        organization: organizationId,
        isBranchManager: true,
        status: 'active'
    }).populate('roles', 'name description');
};

module.exports = mongoose.model('OrganizationMember', organizationMemberSchema);