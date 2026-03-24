// src/models/executive/dashboard.model.js
const mongoose = require('mongoose');

const widgetSchema = new mongoose.Schema({
    widgetId: {
        type: String,
        required: [true, 'Widget ID is required'],
        trim: true
    },
    type: {
        type: String,
        required: [true, 'Widget type is required'],
        enum: ['kpi', 'chart', 'table', 'metric', 'trend', 'comparison'],
        index: true
    },
    title: {
        type: String,
        required: [true, 'Widget title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    subtitle: {
        type: String,
        trim: true,
        maxlength: [200, 'Subtitle cannot exceed 200 characters']
    },
    metricKey: {
        type: String,
        required: function() { return ['kpi', 'metric', 'trend'].includes(this.type); },
        trim: true
    },
    chartType: {
        type: String,
        enum: ['line', 'bar', 'pie', 'doughnut', 'area', 'radar', 'scatter', null],
        default: null
    },
    dataSource: {
        collection: {
            type: String,
            required: [true, 'Data source collection is required'],
            enum: ['kpis', 'metrics', 'financials', 'operations', 'hr', 'sales']
        },
        query: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        aggregation: [mongoose.Schema.Types.Mixed]
    },
    refreshInterval: {
        type: Number,
        enum: [0, 5, 15, 30, 60, 360, 1440],
        default: 15, // minutes, 0 = manual refresh
        min: 0
    },
    config: {
        colors: {
            primary: {
                type: String,
                match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'],
                default: '#3498db'
            },
            secondary: {
                type: String,
                match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'],
                default: '#2ecc71'
            },
            accent: {
                type: String,
                match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'],
                default: '#e74c3c'
            }
        },
        thresholds: {
            warning: { type: Number, min: 0, max: 100, default: 70 },
            danger: { type: Number, min: 0, max: 100, default: 50 }
        },
        displayUnits: {
            type: String,
            enum: ['number', 'currency', 'percentage', 'hours', 'days', 'custom'],
            default: 'number'
        },
        customUnit: {
            type: String,
            trim: true,
            maxlength: [20, 'Custom unit cannot exceed 20 characters']
        },
        decimalPlaces: {
            type: Number,
            min: 0,
            max: 4,
            default: 0
        },
        showTrend: {
            type: Boolean,
            default: true
        },
        comparison: {
            enabled: { type: Boolean, default: false },
            period: {
                type: String,
                enum: ['previous_period', 'previous_year', 'target', 'custom']
            },
            customValue: Number
        }
    },
    position: {
        x: {
            type: Number,
            required: [true, 'X position is required'],
            min: 0,
            default: 0
        },
        y: {
            type: Number,
            required: [true, 'Y position is required'],
            min: 0,
            default: 0
        },
        width: {
            type: Number,
            required: [true, 'Width is required'],
            min: 1,
            max: 12,
            default: 4
        },
        height: {
            type: Number,
            required: [true, 'Height is required'],
            min: 1,
            max: 12,
            default: 3
        }
    },
    permissions: {
        view: [{
            type: String,
            enum: ['board', 'executive', 'c_level', 'management']
        }],
        edit: [{
            type: String,
            enum: ['admin', 'executive_admin']
        }]
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: false });

const dashboardSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    name: {
        type: String,
        required: [true, 'Dashboard name is required'],
        trim: true,
        minlength: [3, 'Dashboard name must be at least 3 characters'],
        maxlength: [100, 'Dashboard name cannot exceed 100 characters']
    },
    slug: {
        type: String,
        required: [true, 'Dashboard slug is required'],
        lowercase: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    type: {
        type: String,
        required: [true, 'Dashboard type is required'],
        enum: ['strategic', 'governance', 'full_analytics', 'operations', 'custom'],
        index: true
    },
    audience: {
        type: [String],
        required: [true, 'Audience is required'],
        enum: ['board', 'chairman', 'ceo', 'coo', 'cfo', 'cto', 'cio', 'cro', 'chro', 'strategy_director', 'executive'],
        index: true
    },
    widgets: [widgetSchema],
    layout: {
        type: {
            type: String,
            enum: ['grid', 'freeform', 'columns'],
            default: 'grid'
        },
        columns: {
            type: Number,
            min: 1,
            max: 12,
            default: 12
        },
        gap: {
            type: Number,
            min: 0,
            max: 50,
            default: 16
        }
    },
    settings: {
        autoRefresh: {
            enabled: { type: Boolean, default: true },
            interval: {
                type: Number,
                min: 5,
                max: 1440,
                default: 15 // minutes
            }
        },
        defaultDateRange: {
            type: String,
            enum: ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'this_quarter', 'last_quarter', 'this_year', 'last_year', 'custom'],
            default: 'this_month'
        },
        theme: {
            type: String,
            enum: ['light', 'dark', 'system'],
            default: 'system'
        },
        exportEnabled: {
            type: Boolean,
            default: true
        },
        exportFormats: [{
            type: String,
            enum: ['pdf', 'excel', 'csv', 'image'],
            default: ['pdf', 'excel']
        }]
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    version: {
        type: String,
        default: '1.0.0',
        match: [/^\d+\.\d+\.\d+$/, 'Invalid version format']
    },
    metadata: {
        lastAccessed: Date,
        accessCount: {
            type: Number,
            default: 0
        },
        lastExported: Date,
        exportCount: {
            type: Number,
            default: 0
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator is required']
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
dashboardSchema.index({ organization: 1, type: 1 });
dashboardSchema.index({ organization: 1, audience: 1 });
dashboardSchema.index({ isDefault: 1, organization: 1 });

// Pre-save middleware to generate slug
dashboardSchema.pre('save', function(next) {
    if (!this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    next();
});

// Virtual for widget count
dashboardSchema.virtual('widgetCount').get(function() {
    return this.widgets?.length || 0;
});

// Method to increment access count
dashboardSchema.methods.incrementAccess = async function() {
    this.metadata.accessCount += 1;
    this.metadata.lastAccessed = new Date();
    return this.save();
};

// Method to check if user has access
dashboardSchema.methods.userHasAccess = function(userRoles) {
    const requiredRoles = this.permissions?.view || ['board', 'executive'];
    return userRoles.some(role => requiredRoles.includes(role));
};

// Static method to get default dashboard
dashboardSchema.statics.getDefaultDashboard = async function(organizationId, userRoles) {
    const dashboard = await this.findOne({ 
        organization: organizationId,
        isDefault: true,
        isActive: true
    });
    
    if (!dashboard) {
        return this.findOne({ 
            organization: organizationId,
            isActive: true,
            audience: { $in: userRoles }
        }).sort({ createdAt: -1 });
    }
    
    return dashboard;
};

module.exports = mongoose.model('Dashboard', dashboardSchema);