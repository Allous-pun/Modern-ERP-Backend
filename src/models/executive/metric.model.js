// src/models/executive/kpi.model.js
const mongoose = require('mongoose');

const kpiSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // KPI Definition
    name: {
        type: String,
        required: true
    },
    key: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    category: {
        type: String,
        enum: ['financial', 'customer', 'operational', 'employee', 'strategic'],
        required: true
    },
    subCategory: String,
    
    // Measurement
    unit: {
        type: String,
        enum: ['currency', 'percentage', 'number', 'ratio', 'score', 'time'],
        required: true
    },
    format: {
        type: String,
        enum: ['decimal', 'integer', 'percentage', 'currency', 'time'],
        default: 'decimal'
    },
    decimalPlaces: {
        type: Number,
        default: 2
    },
    
    // Calculation
    calculationMethod: {
        type: String,
        enum: ['direct', 'sum', 'average', 'ratio', 'formula'],
        required: true
    },
    formula: String,
    dataSource: {
        type: String,
        enum: ['sales', 'finance', 'hr', 'operations', 'marketing', 'custom'],
        required: true
    },
    query: mongoose.Schema.Types.Mixed, // For custom data sources
    
    // Targets
    targets: {
        annual: Number,
        quarterly: [{
            quarter: Number,
            year: Number,
            value: Number
        }],
        monthly: [{
            month: Number,
            year: Number,
            value: Number
        }],
        stretch: Number,
        minimum: Number,
        maximum: Number
    },
    
    // Current Values
    currentValue: mongoose.Schema.Types.Mixed,
    previousValue: mongoose.Schema.Types.Mixed,
    lastUpdated: Date,
    
    // Trend
    trend: {
        direction: {
            type: String,
            enum: ['up', 'down', 'stable', 'fluctuating']
        },
        percentage: Number,
        period: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
        }
    },
    
    // History
    history: [{
        date: Date,
        value: mongoose.Schema.Types.Mixed,
        period: String
    }],
    
    // Status
    status: {
        type: String,
        enum: ['on_track', 'at_risk', 'behind', 'completed', 'not_started'],
        default: 'not_started'
    },
    
    // Alerts
    alerts: [{
        threshold: Number,
        condition: {
            type: String,
            enum: ['above', 'below', 'equals', 'changes_by']
        },
        message: String,
        severity: {
            type: String,
            enum: ['info', 'warning', 'critical']
        },
        triggered: Boolean,
        lastTriggered: Date
    }],
    
    // Visualization
    visualization: {
        chartType: {
            type: String,
            enum: ['line', 'bar', 'pie', 'gauge', 'number'],
            default: 'number'
        },
        color: String,
        icon: String,
        thresholdColors: {
            good: String,
            warning: String,
            bad: String
        }
    },
    
    // Ownership
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    stakeholders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    }],
    
    // Frequency
    updateFrequency: {
        type: String,
        enum: ['realtime', 'hourly', 'daily', 'weekly', 'monthly'],
        default: 'daily'
    },
    
    // Metadata
    isActive: {
        type: Boolean,
        default: true
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    }
}, {
    timestamps: true
});

// Indexes
kpiSchema.index({ organization: 1, category: 1 });
kpiSchema.index({ organization: 1, dataSource: 1 });
kpiSchema.index({ key: 1 }, { unique: true });

// Methods
kpiSchema.methods.updateValue = async function(value, date = new Date()) {
    // Save current value to history
    this.history.push({
        date: this.lastUpdated || new Date(),
        value: this.currentValue,
        period: 'daily'
    });
    
    // Update current value
    this.previousValue = this.currentValue;
    this.currentValue = value;
    this.lastUpdated = date;
    
    // Calculate trend
    if (this.previousValue && this.currentValue) {
        const change = ((this.currentValue - this.previousValue) / this.previousValue) * 100;
        this.trend = {
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
            percentage: Math.abs(change),
            period: 'daily'
        };
    }
    
    // Check alerts
    this.checkAlerts();
    
    // Update status based on targets
    this.updateStatus();
    
    return this.save();
};

kpiSchema.methods.checkAlerts = function() {
    this.alerts.forEach(alert => {
        let triggered = false;
        
        switch(alert.condition) {
            case 'above':
                triggered = this.currentValue > alert.threshold;
                break;
            case 'below':
                triggered = this.currentValue < alert.threshold;
                break;
            case 'equals':
                triggered = this.currentValue === alert.threshold;
                break;
            case 'changes_by':
                if (this.previousValue) {
                    const change = Math.abs((this.currentValue - this.previousValue) / this.previousValue * 100);
                    triggered = change >= alert.threshold;
                }
                break;
        }
        
        if (triggered && !alert.triggered) {
            alert.triggered = true;
            alert.lastTriggered = new Date();
            // Could emit event here for notifications
        } else if (!triggered) {
            alert.triggered = false;
        }
    });
};

kpiSchema.methods.updateStatus = function() {
    if (!this.targets) return;
    
    const current = this.currentValue;
    const target = this.targets.annual;
    
    if (!target) return;
    
    const progress = (current / target) * 100;
    
    if (progress >= 90) {
        this.status = 'on_track';
    } else if (progress >= 70) {
        this.status = 'at_risk';
    } else {
        this.status = 'behind';
    }
    
    if (progress >= 100) {
        this.status = 'completed';
    }
};

// Statics
kpiSchema.statics.getDashboardKPIs = function(organizationId, categories = []) {
    const query = { organization: organizationId, isActive: true };
    if (categories.length > 0) {
        query.category = { $in: categories };
    }
    
    return this.find(query)
        .populate('owner', 'personalInfo firstName personalInfo lastName email')
        .sort({ category: 1, name: 1 });
};

kpiSchema.statics.getKPIHistory = function(kpiId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(kpiId) } },
        { $unwind: '$history' },
        { $match: { 'history.date': { $gte: startDate } } },
        { $sort: { 'history.date': 1 } },
        { $project: {
            date: '$history.date',
            value: '$history.value',
            _id: 0
        }}
    ]);
};

module.exports = mongoose.model('KPI', kpiSchema);