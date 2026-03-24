// src/models/executive/reportTemplate.model.js
const mongoose = require('mongoose');

const reportTemplateSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Template identification
    name: {
        type: String,
        required: true
    },
    description: String,
    templateType: {
        type: String,
        enum: ['board', 'investor', 'esg', 'executive_summary', 'financial', 'operational', 'strategic', 'custom'],
        default: 'custom',
        required: true
    },
    
    // Target audience
    targetRoles: [{
        type: String,
        enum: [
            'board_member', 'chairman', 'ceo', 'coo', 'cfo', 
            'cto', 'cio', 'cro', 'chro', 'strategy_director', 'all_executives'
        ]
    }],
    
    // Template structure
    structure: {
        sections: [{
            name: String,
            title: String,
            description: String,
            order: Number,
            required: {
                type: Boolean,
                default: true
            },
            dataSource: {
                module: {
                    type: String,
                    enum: ['finance', 'sales', 'hr', 'operations', 'marketing', 'executive', 'custom'],
                    default: 'custom'
                },
                metrics: [String],
                aggregation: {
                    type: String,
                    enum: ['sum', 'avg', 'count', 'min', 'max', 'custom']
                }
            },
            visualization: {
                type: {
                    type: String,
                    enum: ['metric', 'chart', 'table', 'text']
                },
                chartType: {
                    type: String,
                    enum: ['line', 'bar', 'pie', 'donut', 'area', 'metric', 'table', 'text']
                },
                config: mongoose.Schema.Types.Mixed
            }
        }]
    },
    
    // Default content
    defaultContent: {
        executive: String,
        introduction: String,
        conclusion: String,
        placeholders: [{
            key: String,
            description: String,
            defaultValue: String
        }]
    },
    
    // Visualization defaults
    visualization: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'brand'],
            default: 'light'
        },
        logo: String,
        colors: [String],
        font: String,
        pageSize: {
            type: String,
            enum: ['A4', 'Letter', 'Legal'],
            default: 'A4'
        },
        orientation: {
            type: String,
            enum: ['portrait', 'landscape'],
            default: 'portrait'
        }
    },
    
    // Schedule defaults
    schedule: {
        enabled: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly']
        },
        dayOfWeek: Number,
        dayOfMonth: Number,
        time: String,
        defaultRecipients: [String]
    },
    
    // Export defaults
    exportDefaults: {
        formats: [{
            type: String,
            enum: ['pdf', 'excel', 'csv', 'json', 'ppt']
        }],
        pdf: {
            password: String,
            watermark: String
        }
    },
    
    // Usage statistics
    usage: {
        timesUsed: {
            type: Number,
            default: 0
        },
        lastUsed: Date,
        reports: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExecutiveReport'
        }],
        averageRating: {
            type: Number,
            min: 0,
            max: 5,
            default: 0
        }
    },
    
    // Metadata
    isActive: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    version: {
        type: Number,
        default: 1
    },
    tags: [String]
}, {
    timestamps: true
});

// Indexes
reportTemplateSchema.index({ organization: 1, templateType: 1 });
reportTemplateSchema.index({ organization: 1, isDefault: 1 });
reportTemplateSchema.index({ targetRoles: 1 });

// Methods
reportTemplateSchema.methods.incrementUsage = function(reportId) {
    this.usage.timesUsed += 1;
    this.usage.lastUsed = new Date();
    this.usage.reports.push(reportId);
    return this.save();
};

// Statics
reportTemplateSchema.statics.getDefaultTemplate = function(organizationId, templateType) {
    return this.findOne({
        organization: organizationId,
        templateType,
        isDefault: true,
        isActive: true
    });
};

module.exports = mongoose.model('ReportTemplate', reportTemplateSchema);
