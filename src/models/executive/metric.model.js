// src/models/executive/metric.model.js
const mongoose = require('mongoose');

const metricDimensionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Dimension name is required'],
        trim: true
    },
    value: {
        type: String,
        required: [true, 'Dimension value is required'],
        trim: true
    }
}, { _id: false });

const metricValueSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        required: [true, 'Timestamp is required'],
        default: Date.now
    },
    value: {
        type: Number,
        required: [true, 'Value is required']
    },
    delta: Number,
    deltaPercentage: Number,
    dimensions: [metricDimensionSchema],
    note: {
        type: String,
        trim: true,
        maxlength: [500, 'Note cannot exceed 500 characters']
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    source: {
        type: String,
        enum: ['manual', 'system', 'integration', 'api'],
        default: 'manual'
    }
}, { _id: true });

const metricAlertSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['threshold_breach', 'anomaly', 'trend_change', 'stale_data'],
        required: true
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'warning'
    },
    threshold: Number,
    condition: {
        operator: {
            type: String,
            enum: ['gt', 'lt', 'gte', 'lte', 'eq', 'ne']
        },
        value: Number
    },
    message: {
        type: String,
        required: [true, 'Alert message is required'],
        maxlength: [500, 'Alert message cannot exceed 500 characters']
    },
    triggeredAt: Date,
    resolvedAt: Date,
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: true });

const metricSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    code: {
        type: String,
        required: [true, 'Metric code is required'],
        uppercase: true,
        trim: true,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'Metric name is required'],
        trim: true,
        minlength: [3, 'Metric name must be at least 3 characters'],
        maxlength: [100, 'Metric name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Metric description is required'],
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    category: {
        type: String,
        required: [true, 'Metric category is required'],
        enum: [
            'financial', 'operational', 'strategic', 'hr', 'technology',
            'sales', 'marketing', 'customer', 'quality', 'compliance',
            'risk', 'sustainability', 'innovation', 'productivity',
            'efficiency', 'growth', 'profitability', 'liquidity',
            'leverage', 'activity', 'valuation', 'market'
        ],
        index: true
    },
    subCategory: {
        type: String,
        trim: true,
        maxlength: [50, 'Sub-category cannot exceed 50 characters']
    },
    metricType: {
        type: String,
        required: [true, 'Metric type is required'],
        enum: [
            'counter', 'gauge', 'percentage', 'ratio', 'average',
            'sum', 'minimum', 'maximum', 'median', 'mode',
            'standard_deviation', 'variance', 'cumulative', 'rate'
        ],
        default: 'gauge'
    },
    valueType: {
        type: String,
        required: [true, 'Value type is required'],
        enum: [
            'integer', 'decimal', 'currency', 'percentage',
            'time_duration', 'count', 'score', 'index', 'boolean'
        ],
        default: 'decimal'
    },
    unit: {
        type: String,
        required: [true, 'Unit is required'],
        enum: [
            'number', 'usd', 'eur', 'gbp', 'jpy', 'cny',
            'percent', 'ratio', 'hours', 'days', 'minutes',
            'seconds', 'count', 'score', 'index', 'bps',
            'custom'
        ],
        default: 'number'
    },
    customUnit: {
        type: String,
        required: function() { return this.unit === 'custom'; },
        trim: true,
        maxlength: [20, 'Custom unit cannot exceed 20 characters']
    },
    decimalPlaces: {
        type: Number,
        min: 0,
        max: 6,
        default: 2
    },
    format: {
        prefix: {
            type: String,
            maxlength: [10, 'Prefix cannot exceed 10 characters']
        },
        suffix: {
            type: String,
            maxlength: [10, 'Suffix cannot exceed 10 characters']
        },
        thousandSeparator: {
            type: Boolean,
            default: true
        },
        decimalSeparator: {
            type: String,
            enum: ['.', ','],
            default: '.'
        }
    },
    aggregation: {
        method: {
            type: String,
            enum: ['sum', 'avg', 'min', 'max', 'count', 'last', 'first', 'custom'],
            default: 'last'
        },
        period: {
            type: String,
            enum: ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'annual'],
            default: 'daily'
        },
        customMethod: {
            type: String,
            required: function() { return this.aggregation.method === 'custom'; }
        }
    },
    dimensions: [{
        name: {
            type: String,
            required: [true, 'Dimension name is required'],
            trim: true
        },
        description: String,
        values: [String],
        required: {
            type: Boolean,
            default: false
        }
    }],
    currentValue: {
        type: Number,
        default: 0
    },
    previousValue: {
        type: Number,
        default: 0
    },
    minimum: {
        type: Number,
        default: 0
    },
    maximum: {
        type: Number,
        default: 0
    },
    average: {
        type: Number,
        default: 0
    },
    targets: {
        minimum: Number,
        maximum: Number,
        target: Number,
        stretch: Number,
        threshold: {
            warning: {
                value: Number,
                direction: {
                    type: String,
                    enum: ['above', 'below', 'outside']
                }
            },
            critical: {
                value: Number,
                direction: {
                    type: String,
                    enum: ['above', 'below', 'outside']
                }
            }
        }
    },
    trends: {
        daily: [{
            date: Date,
            value: Number
        }],
        weekly: [{
            week: Number,
            year: Number,
            value: Number
        }],
        monthly: [{
            month: Number,
            year: Number,
            value: Number
        }],
        quarterly: [{
            quarter: Number,
            year: Number,
            value: Number
        }],
        yearly: [{
            year: Number,
            value: Number
        }]
    },
    history: [metricValueSchema],
    alerts: [metricAlertSchema],
    dataSource: {
        type: {
            type: String,
            enum: ['manual', 'system', 'database', 'api', 'file', 'integration'],
            required: true,
            default: 'manual'
        },
        connection: {
            url: String,
            database: String,
            collection: String,
            query: mongoose.Schema.Types.Mixed,
            field: String
        },
        api: {
            endpoint: String,
            method: {
                type: String,
                enum: ['GET', 'POST', 'PUT', 'DELETE'],
                default: 'GET'
            },
            headers: mongoose.Schema.Types.Mixed,
            body: mongoose.Schema.Types.Mixed,
            path: String
        },
        integration: {
            name: String,
            version: String,
            config: mongoose.Schema.Types.Mixed
        },
        schedule: {
            enabled: {
                type: Boolean,
                default: false
            },
            frequency: {
                type: String,
                enum: ['minutes', 'hourly', 'daily', 'weekly', 'monthly']
            },
            interval: Number,
            timeOfDay: String,
            dayOfWeek: Number,
            dayOfMonth: Number,
            lastRun: Date,
            nextRun: Date
        }
    },
    owners: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['primary', 'secondary', 'reviewer', 'approver', 'viewer'],
            default: 'viewer'
        },
        notifications: {
            enabled: {
                type: Boolean,
                default: true
            },
            channels: [{
                type: String,
                enum: ['email', 'slack', 'teams', 'in_app']
            }]
        }
    }],
    dashboardIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Dashboard'
    }],
    kpiIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'KPI'
    }],
    reportIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report'
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived', 'draft', 'pending_review'],
        default: 'active'
    },
    visibility: {
        type: String,
        enum: ['public', 'private', 'team', 'executive', 'board'],
        default: 'executive'
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    metadata: {
        createdAt: {
            type: Date,
            default: Date.now
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        updatedAt: Date,
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        lastCalculated: Date,
        lastAlertSent: Date,
        dataPoints: {
            type: Number,
            default: 0
        },
        quality: {
            completeness: {
                type: Number,
                min: 0,
                max: 100,
                default: 100
            },
            accuracy: {
                type: Number,
                min: 0,
                max: 100,
                default: 100
            },
            timeliness: {
                type: Number,
                min: 0,
                max: 100,
                default: 100
            }
        },
        sourceReliability: {
            type: String,
            enum: ['high', 'medium', 'low'],
            default: 'high'
        }
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    attachments: [{
        filename: String,
        url: String,
        type: String,
        size: Number,
        uploadedAt: Date,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
metricSchema.index({ organization: 1, code: 1 }, { unique: true });
metricSchema.index({ organization: 1, category: 1 });
metricSchema.index({ organization: 1, status: 1 });
metricSchema.index({ organization: 1, 'owners.userId': 1 });
metricSchema.index({ 'history.timestamp': -1 });
metricSchema.index({ tags: 1 });

// Virtual for change percentage
metricSchema.virtual('changePercentage').get(function() {
    if (this.previousValue === 0) return 100;
    return ((this.currentValue - this.previousValue) / Math.abs(this.previousValue)) * 100;
});

// Virtual for trend direction
metricSchema.virtual('trendDirection').get(function() {
    if (this.history.length < 2) return 'stable';
    const lastTwo = this.history.slice(-2);
    if (lastTwo[1].value > lastTwo[0].value) return 'up';
    if (lastTwo[1].value < lastTwo[0].value) return 'down';
    return 'stable';
});

// Virtual for status level based on targets (renamed from 'status' to 'statusLevel')
metricSchema.virtual('statusLevel').get(function() {
    if (!this.targets) return 'normal';
    
    if (this.targets.threshold?.critical) {
        if (this.targets.threshold.critical.direction === 'above' && this.currentValue > this.targets.threshold.critical.value) {
            return 'critical';
        }
        if (this.targets.threshold.critical.direction === 'below' && this.currentValue < this.targets.threshold.critical.value) {
            return 'critical';
        }
    }
    
    if (this.targets.threshold?.warning) {
        if (this.targets.threshold.warning.direction === 'above' && this.currentValue > this.targets.threshold.warning.value) {
            return 'warning';
        }
        if (this.targets.threshold.warning.direction === 'below' && this.currentValue < this.targets.threshold.warning.value) {
            return 'warning';
        }
    }
    
    if (this.targets.target) {
        const tolerance = this.targets.target * 0.1; // 10% tolerance
        if (Math.abs(this.currentValue - this.targets.target) <= tolerance) {
            return 'on_target';
        }
    }
    
    return 'normal';
});

// Method to update metric value
metricSchema.methods.updateValue = async function(value, options = {}) {
    const {
        userId,
        note,
        source = 'manual',
        dimensions = [],
        timestamp = new Date()
    } = options;

    // Update current and previous values
    this.previousValue = this.currentValue;
    this.currentValue = value;

    // Update min/max
    if (value < this.minimum || this.history.length === 0) this.minimum = value;
    if (value > this.maximum || this.history.length === 0) this.maximum = value;

    // Update average
    const total = this.history.reduce((sum, entry) => sum + entry.value, value);
    this.average = total / (this.history.length + 1);

    // Add to history
    this.history.push({
        timestamp,
        value,
        delta: value - this.previousValue,
        deltaPercentage: this.previousValue ? ((value - this.previousValue) / this.previousValue) * 100 : 0,
        dimensions,
        note,
        recordedBy: userId,
        source
    });

    // Update trends
    await this.updateTrends(value, timestamp);

    this.metadata.lastCalculated = new Date();
    this.metadata.dataPoints = this.history.length;
    this.metadata.updatedBy = userId;
    this.metadata.updatedAt = new Date();

    // Check for alerts
    const alerts = this.checkAlerts();
    
    await this.save();
    
    return { metric: this, alerts };
};

// Method to update trend data
metricSchema.methods.updateTrends = async function(value, timestamp) {
    const date = new Date(timestamp);
    
    // Daily trend
    const dayKey = date.toISOString().split('T')[0];
    const dailyIndex = this.trends.daily.findIndex(d => d.date.toISOString().split('T')[0] === dayKey);
    if (dailyIndex >= 0) {
        this.trends.daily[dailyIndex].value = value;
    } else {
        this.trends.daily.push({ date, value });
    }

    // Keep only last 30 days
    if (this.trends.daily.length > 30) {
        this.trends.daily = this.trends.daily.slice(-30);
    }

    // Weekly trend
    const week = Math.ceil(date.getDate() / 7);
    const year = date.getFullYear();
    const weeklyIndex = this.trends.weekly.findIndex(w => w.week === week && w.year === year);
    if (weeklyIndex >= 0) {
        this.trends.weekly[weeklyIndex].value = value;
    } else {
        this.trends.weekly.push({ week, year, value });
    }

    // Keep only last 12 weeks
    if (this.trends.weekly.length > 12) {
        this.trends.weekly = this.trends.weekly.slice(-12);
    }

    // Monthly trend
    const month = date.getMonth() + 1;
    const monthlyIndex = this.trends.monthly.findIndex(m => m.month === month && m.year === year);
    if (monthlyIndex >= 0) {
        this.trends.monthly[monthlyIndex].value = value;
    } else {
        this.trends.monthly.push({ month, year, value });
    }

    // Keep only last 12 months
    if (this.trends.monthly.length > 12) {
        this.trends.monthly = this.trends.monthly.slice(-12);
    }

    // Quarterly trend
    const quarter = Math.floor((date.getMonth() + 3) / 3);
    const quarterlyIndex = this.trends.quarterly.findIndex(q => q.quarter === quarter && q.year === year);
    if (quarterlyIndex >= 0) {
        this.trends.quarterly[quarterlyIndex].value = value;
    } else {
        this.trends.quarterly.push({ quarter, year, value });
    }

    // Keep only last 8 quarters
    if (this.trends.quarterly.length > 8) {
        this.trends.quarterly = this.trends.quarterly.slice(-8);
    }

    // Yearly trend
    const yearlyIndex = this.trends.yearly.findIndex(y => y.year === year);
    if (yearlyIndex >= 0) {
        this.trends.yearly[yearlyIndex].value = value;
    } else {
        this.trends.yearly.push({ year, value });
    }

    // Keep only last 5 years
    if (this.trends.yearly.length > 5) {
        this.trends.yearly = this.trends.yearly.slice(-5);
    }
};

// Method to check for alerts
metricSchema.methods.checkAlerts = function() {
    const alerts = [];
    const now = new Date();

    // Check threshold alerts
    if (this.targets?.threshold) {
        const { warning, critical } = this.targets.threshold;
        
        if (critical && (
            (critical.direction === 'above' && this.currentValue > critical.value) ||
            (critical.direction === 'below' && this.currentValue < critical.value)
        )) {
            alerts.push({
                type: 'threshold_breach',
                severity: 'critical',
                threshold: critical.value,
                condition: { operator: critical.direction === 'above' ? 'gt' : 'lt', value: critical.value },
                message: `Metric ${this.name} has breached critical threshold: ${this.currentValue} ${this.unit}`,
                triggeredAt: now
            });
        } else if (warning && (
            (warning.direction === 'above' && this.currentValue > warning.value) ||
            (warning.direction === 'below' && this.currentValue < warning.value)
        )) {
            alerts.push({
                type: 'threshold_breach',
                severity: 'warning',
                threshold: warning.value,
                condition: { operator: warning.direction === 'above' ? 'gt' : 'lt', value: warning.value },
                message: `Metric ${this.name} has breached warning threshold: ${this.currentValue} ${this.unit}`,
                triggeredAt: now
            });
        }
    }

    // Check for stale data
    const lastUpdate = this.history.length > 0 ? this.history[this.history.length - 1].timestamp : null;
    if (lastUpdate) {
        const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate > 7) {
            alerts.push({
                type: 'stale_data',
                severity: 'warning',
                message: `Metric ${this.name} has not been updated for ${Math.round(daysSinceUpdate)} days`,
                triggeredAt: now
            });
        }
    }

    // Check for unusual changes
    if (this.history.length >= 3) {
        const lastThree = this.history.slice(-3).map(h => h.value);
        const avg = lastThree.reduce((a, b) => a + b, 0) / 3;
        const stdDev = Math.sqrt(lastThree.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b, 0) / 3);
        
        if (stdDev > 0 && Math.abs(this.currentValue - avg) > stdDev * 3) {
            alerts.push({
                type: 'anomaly',
                severity: 'warning',
                message: `Unusual change detected in metric ${this.name}`,
                triggeredAt: now
            });
        }
    }

    // Save alerts
    if (alerts.length > 0) {
        this.alerts.push(...alerts);
        this.metadata.lastAlertSent = now;
    }

    return alerts;
};

// Method to get historical data with aggregation
metricSchema.methods.getHistory = function(period = 'daily', limit = 30) {
    switch(period) {
        case 'daily':
            return this.trends.daily.slice(-limit);
        case 'weekly':
            return this.trends.weekly.slice(-limit);
        case 'monthly':
            return this.trends.monthly.slice(-limit);
        case 'quarterly':
            return this.trends.quarterly.slice(-limit);
        case 'yearly':
            return this.trends.yearly.slice(-limit);
        default:
            return this.history.slice(-limit);
    }
};

// Method to export metric data
metricSchema.methods.export = function(format = 'json', period = 'all') {
    const data = {
        metadata: {
            code: this.code,
            name: this.name,
            category: this.category,
            unit: this.unit,
            currentValue: this.currentValue,
            minimum: this.minimum,
            maximum: this.maximum,
            average: this.average,
            dataPoints: this.metadata.dataPoints
        },
        history: period === 'all' ? this.history : this.getHistory(period)
    };

    if (format === 'csv') {
        // Convert to CSV format
        const headers = ['timestamp', 'value', 'delta', 'deltaPercentage', 'note', 'source'];
        const rows = data.history.map(h => [
            h.timestamp,
            h.value,
            h.delta || '',
            h.deltaPercentage || '',
            h.note || '',
            h.source || ''
        ]);
        return { headers, rows };
    }

    return data;
};

// Static method to get metrics by category
metricSchema.statics.getByCategory = async function(organizationId, category) {
    return this.find({
        organization: organizationId,
        category,
        status: 'active'
    }).select('code name currentValue unit format targets owners');
};

// Static method to get dashboard metrics
metricSchema.statics.getDashboardMetrics = async function(organizationId, metricIds = []) {
    const query = { organization: organizationId, status: 'active' };
    if (metricIds.length > 0) {
        query._id = { $in: metricIds };
    }
    
    return this.find(query)
        .select('code name category currentValue previousValue unit format targets trends alerts')
        .populate('owners.userId', 'firstName lastName email');
};

// Static method to search metrics
metricSchema.statics.search = async function(organizationId, searchTerm, filters = {}) {
    const query = { organization: organizationId };
    
    if (searchTerm) {
        query.$or = [
            { name: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { code: { $regex: searchTerm, $options: 'i' } },
            { tags: { $regex: searchTerm, $options: 'i' } }
        ];
    }
    
    return this.find({ ...query, ...filters })
        .sort({ category: 1, name: 1 })
        .populate('owners.userId', 'firstName lastName email');
};

module.exports = mongoose.model('Metric', metricSchema);