// src/models/module.model.js
const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
    // Basic Identity
    name: {
        type: String,
        required: [true, 'Module name is required'],
        unique: true,
        trim: true
    },
    slug: {
        type: String,
        required: [true, 'Module slug is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Module description is required']
    },
    category: {
        type: String,
        required: true,
        enum: [
            'core',           // System, Security & Governance
            'executive',       // Executive & Strategic Management
            'financial',       // Finance, Accounting & Treasury
            'hr',             // Human Resources (HCM)
            'sales',          // Sales, Marketing & CRM
            'procurement',     // Procurement, Inventory & Supply Chain
            'manufacturing',   // Manufacturing & Production
            'projects',        // Project & Operations Management
            'industry',        // Industry-Specific Extensions
            'external',        // External & Portal Users
            'operations',      // Additional Operations (POS, etc.)
            'reporting'        // Analytics & Reports
        ]
    },
    
    // Versioning
    version: {
        type: String,
        required: true,
        default: '1.0.0'
    },
    releaseDate: {
        type: Date,
        default: Date.now
    },
    isStable: {
        type: Boolean,
        default: true
    },
    isDeprecated: {
        type: Boolean,
        default: false
    },
    
    // Module Type
    isCore: {
        type: Boolean,
        default: false  // Core modules cannot be uninstalled
    },
    isSystem: {
        type: Boolean,
        default: false  // Internal system modules
    },
    
    // Dependencies
    dependencies: [{
        type: String,  // Array of module slugs this module depends on
        ref: 'Module'
    }],
    
    // Permission Mapping (Integration with Phase 3)
    permissionPrefix: {
        type: String,
        required: true,
        description: 'Prefix for all permissions in this module (e.g., "finance")'
    },
    
    // UI Metadata (for frontend)
    icon: {
        type: String,
        default: 'default-module-icon'
    },
    color: {
        type: String,
        default: '#3498db'
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    routeBase: {
        type: String,
        description: 'Base route for module (e.g., "/finance")'
    },
    sidebarGroup: {
        type: String,
        enum: ['main', 'financial', 'hr', 'operations', 'reports', 'admin', 'industry', 'external'],
        default: 'main'
    },
    
    // SaaS Strategy (Future)
    tier: {
        type: String,
        enum: ['free', 'standard', 'premium', 'enterprise'],
        default: 'standard'
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    trialAvailable: {
        type: Boolean,
        default: true
    },
    trialDays: {
        type: Number,
        default: 14
    },
    
    // Features available in this module
    features: [{
        name: {
            type: String,
            required: true
        },
        key: {
            type: String,
            required: true
        },
        description: String,
        isEnabled: {
            type: Boolean,
            default: true
        }
    }],
    
    // Metadata
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
moduleSchema.index({ category: 1 });
moduleSchema.index({ isCore: 1 });
moduleSchema.index({ permissionPrefix: 1 });

// Virtual to check if module has dependencies
moduleSchema.virtual('hasDependencies').get(function() {
    return this.dependencies && this.dependencies.length > 0;
});

// Virtual to get all feature keys
moduleSchema.virtual('featureKeys').get(function() {
    return this.features.map(f => f.key);
});

// Method to check if feature exists
moduleSchema.methods.hasFeature = function(featureKey) {
    return this.features.some(f => f.key === featureKey);
};

module.exports = mongoose.model('Module', moduleSchema);