// src/models/executive/kpi.model.js
const mongoose = require('mongoose');

const kpiHistorySchema = new mongoose.Schema({
    value: {
        type: Number,
        required: [true, 'Value is required']
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
        default: Date.now
    },
    note: {
        type: String,
        trim: true,
        maxlength: [500, 'Note cannot exceed 500 characters']
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: true, timestamps: true });

const kpiThresholdSchema = new mongoose.Schema({
    level: {
        type: String,
        required: [true, 'Threshold level is required'],
        enum: ['critical', 'warning', 'target', 'excellent']
    },
    value: {
        type: Number,
        required: [true, 'Threshold value is required']
    },
    color: {
        type: String,
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format']
    },
    actionRequired: {
        type: Boolean,
        default: false
    },
    notificationTemplate: String
}, { _id: false });

const kpiSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    code: {
        type: String,
        required: [true, 'KPI code is required'],
        uppercase: true,
        trim: true,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'KPI name is required'],
        trim: true,
        minlength: [3, 'KPI name must be at least 3 characters'],
        maxlength: [100, 'KPI name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'KPI description is required'],
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    category: {
        type: String,
        required: [true, 'KPI category is required'],
        enum: [
            'financial', 'operational', 'strategic', 'hr', 'technology',
            'sales', 'marketing', 'customer', 'quality', 'compliance',
            'risk', 'sustainability', 'innovation'
        ],
        index: true
    },
    subCategory: {
        type: String,
        trim: true
    },
    formula: {
        type: String,
        required: [true, 'Formula is required'],
        enum: [
            'direct', 'percentage', 'ratio', 'average', 'sum',
            'count', 'growth_rate', 'custom'
        ]
    },
    customFormula: {
        type: String,
        required: function() { return this.formula === 'custom'; },
        trim: true
    },
    unit: {
        type: String,
        required: [true, 'Unit is required'],
        enum: [
            'number', 'currency', 'percentage', 'hours', 'days',
            'rate', 'score', 'index', 'ratio', 'custom'
        ],
        default: 'number'
    },
    customUnit: {
        type: String,
        required: function() { return this.unit === 'custom'; },
        trim: true,
        maxlength: [20, 'Custom unit cannot exceed 20 characters']
    },
    decimals: {
        type: Number,
        min: 0,
        max: 4,
        default: 0
    },
    direction: {
        type: String,
        required: [true, 'Direction is required'],
        enum: ['higher_is_better', 'lower_is_better', 'target_is_best'],
        default: 'higher_is_better'
    },
    frequency: {
        type: String,
        required: [true, 'Measurement frequency is required'],
        enum: ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'annual'],
        default: 'monthly'
    },
    thresholds: {
        critical: kpiThresholdSchema,
        warning: kpiThresholdSchema,
        target: kpiThresholdSchema,
        excellent: kpiThresholdSchema
    },
    targets: {
        current: {
            type: Number,
            required: [true, 'Current target is required']
        },
        minimum: Number,
        maximum: Number,
        stretch: Number,
        previous: Number,
        next: Number
    },
    currentValue: {
        type: Number,
        default: 0
    },
    previousValue: {
        type: Number,
        default: 0
    },
    trend: {
        type: String,
        enum: ['up', 'down', 'stable', 'volatile'],
        default: 'stable'
    },
    history: [kpiHistorySchema],
    owners: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['primary', 'secondary', 'reviewer', 'approver'],
            default: 'primary'
        }
    }],
    dataSource: {
        type: {
            type: String,
            enum: ['manual', 'system', 'integration', 'external'],
            required: [true, 'Data source type is required']
        },
        collection: String,
        field: String,
        query: mongoose.Schema.Types.Mixed,
        integration: {
            provider: String,
            endpoint: String,
            apiKey: String,
            schedule: String
        },
        lastUpdated: Date
    },
    dashboardIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Dashboard'
    }],
    alerts: [{
        type: {
            type: String,
            enum: ['threshold', 'deviation', 'anomaly', 'missed_target']
        },
        channel: {
            type: String,
            enum: ['email', 'slack', 'teams', 'webhook', 'in_app']
        },
        recipients: [String],
        template: String,
        enabled: {
            type: Boolean,
            default: true
        }
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived', 'draft'],
        default: 'active'
    },
    tags: [{
        type: String,
        trim: true
    }],
    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    attachments: [{
        filename: String,
        url: String,
        uploadedAt: Date,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    metadata: {
        lastCalculated: Date,
        lastAlertSent: Date,
        calculationDuration: Number,
        dataPoints: Number
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator is required']
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
kpiSchema.index({ organization: 1, code: 1 }, { unique: true });
kpiSchema.index({ organization: 1, category: 1 });
kpiSchema.index({ organization: 1, status: 1 });
kpiSchema.index({ organization: 1, owners: 1 });
kpiSchema.index({ 'history.date': -1 });

// Virtual for achievement percentage
kpiSchema.virtual('achievement').get(function() {
    if (!this.targets.current) return 0;
    if (this.direction === 'higher_is_better') {
        return Math.min(100, (this.currentValue / this.targets.current) * 100);
    } else if (this.direction === 'lower_is_better') {
        return Math.min(100, (this.targets.current / this.currentValue) * 100);
    }
    return 0;
});

// Virtual for status based on thresholds
kpiSchema.virtual('statusLevel').get(function() {
    if (this.thresholds.critical && this.currentValue <= this.thresholds.critical.value) {
        return 'critical';
    }
    if (this.thresholds.warning && this.currentValue <= this.thresholds.warning.value) {
        return 'warning';
    }
    if (this.thresholds.target && this.currentValue >= this.thresholds.target.value) {
        return 'target';
    }
    if (this.thresholds.excellent && this.currentValue >= this.thresholds.excellent.value) {
        return 'excellent';
    }
    return 'normal';
});

// Method to update value with history
kpiSchema.methods.updateValue = async function(newValue, userId, note = null) {
    this.previousValue = this.currentValue;
    this.currentValue = newValue;
    
    this.history.push({
        value: newValue,
        date: new Date(),
        note,
        recordedBy: userId
    });
    
    // Calculate trend
    const lastTwo = this.history.slice(-2);
    if (lastTwo.length === 2) {
        const trend = lastTwo[1].value - lastTwo[0].value;
        if (trend > 0) this.trend = 'up';
        else if (trend < 0) this.trend = 'down';
        else this.trend = 'stable';
    }
    
    this.metadata.lastCalculated = new Date();
    return this.save();
};

// Method to check if alert needed
kpiSchema.methods.checkAlerts = function() {
    const level = this.statusLevel;
    const alerts = [];
    
    this.alerts.forEach(alert => {
        if (alert.enabled) {
            alerts.push({
                kpiId: this._id,
                kpiName: this.name,
                level,
                currentValue: this.currentValue,
                threshold: this.thresholds[level]?.value,
                type: alert.type,
                channel: alert.channel,
                recipients: alert.recipients,
                timestamp: new Date()
            });
        }
    });
    
    return alerts;
};

// Static method to get KPI by category with latest values
kpiSchema.statics.getDashboardKPIs = async function(organizationId, categories = []) {
    const query = { organization: organizationId, status: 'active' };
    if (categories.length) query.category = { $in: categories };
    
    return this.find(query)
        .select('code name category currentValue previousValue targets thresholds unit decimals direction')
        .sort({ category: 1, name: 1 });
};

module.exports = mongoose.model('KPI', kpiSchema);