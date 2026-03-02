// src/models/executive/report.model.js
const mongoose = require('mongoose');

const reportSectionSchema = new mongoose.Schema({
    sectionId: {
        type: String,
        required: [true, 'Section ID is required'],
        trim: true
    },
    title: {
        type: String,
        required: [true, 'Section title is required'],
        trim: true,
        maxlength: [200, 'Section title cannot exceed 200 characters']
    },
    type: {
        type: String,
        required: [true, 'Section type is required'],
        enum: [
            'summary', 'kpi', 'chart', 'table', 'narrative',
            'financial', 'operational', 'strategic', 'appendix'
        ]
    },
    content: {
        type: mongoose.Schema.Types.Mixed,
        required: [true, 'Section content is required']
    },
    dataSource: {
        collection: String,
        query: mongoose.Schema.Types.Mixed,
        aggregation: [mongoose.Schema.Types.Mixed]
    },
    order: {
        type: Number,
        required: [true, 'Section order is required'],
        min: 0
    },
    pageBreak: {
        type: Boolean,
        default: false
    }
}, { _id: false });

const reportParameterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Parameter name is required'],
        trim: true
    },
    type: {
        type: String,
        required: [true, 'Parameter type is required'],
        enum: ['date', 'dateRange', 'text', 'number', 'select', 'multiSelect', 'boolean']
    },
    required: {
        type: Boolean,
        default: false
    },
    defaultValue: mongoose.Schema.Types.Mixed,
    options: [mongoose.Schema.Types.Mixed],
    validation: {
        min: Number,
        max: Number,
        pattern: String
    }
}, { _id: false });

const reportVersionSchema = new mongoose.Schema({
    versionNumber: {
        type: String,
        required: [true, 'Version number is required'],
        match: [/^\d+\.\d+\.\d+$/, 'Invalid version format']
    },
    changes: {
        type: String,
        maxlength: [1000, 'Changes description cannot exceed 1000 characters']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const reportSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    code: {
        type: String,
        required: [true, 'Report code is required'],
        uppercase: true,
        trim: true,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'Report name is required'],
        trim: true,
        minlength: [3, 'Report name must be at least 3 characters'],
        maxlength: [200, 'Report name cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Report description is required'],
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    type: {
        type: String,
        required: [true, 'Report type is required'],
        enum: [
            'board', 'executive', 'shareholder', 'regulatory',
            'financial', 'operational', 'strategic', 'compliance',
            'annual', 'quarterly', 'monthly', 'weekly', 'ad_hoc'
        ],
        index: true
    },
    category: {
        type: String,
        enum: [
            'board_package', 'management_review', 'financial_statement',
            'performance_report', 'risk_report', 'compliance_report',
            'investor_presentation', 'strategy_document'
        ],
        required: [true, 'Report category is required']
    },
    audience: [{
        type: String,
        enum: [
            'board', 'chairman', 'ceo', 'cfo', 'coo', 'cto', 'cio',
            'cro', 'chro', 'strategy_director', 'investors', 'regulators',
            'auditors', 'management'
        ]
    }],
    parameters: [reportParameterSchema],
    sections: [reportSectionSchema],
    template: {
        id: String,
        name: String,
        version: String
    },
    schedule: {
        enabled: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual']
        },
        dayOfWeek: {
            type: Number,
            min: 0,
            max: 6
        },
        dayOfMonth: {
            type: Number,
            min: 1,
            max: 31
        },
        time: {
            type: String,
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
        },
        recipients: [{
            email: {
                type: String,
                lowercase: true,
                match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
            },
            name: String,
            role: String
        }],
        lastRun: Date,
        nextRun: Date
    },
    format: {
        primary: {
            type: String,
            enum: ['pdf', 'excel', 'csv', 'html', 'json'],
            default: 'pdf'
        },
        allowedFormats: [{
            type: String,
            enum: ['pdf', 'excel', 'csv', 'html', 'json']
        }],
        options: {
            orientation: {
                type: String,
                enum: ['portrait', 'landscape'],
                default: 'portrait'
            },
            pageSize: {
                type: String,
                enum: ['A4', 'Letter', 'Legal', 'A3'],
                default: 'A4'
            },
            font: {
                type: String,
                default: 'Arial'
            },
            fontSize: {
                type: Number,
                min: 8,
                max: 14,
                default: 11
            },
            includeLogo: {
                type: Boolean,
                default: true
            },
            includeFooter: {
                type: Boolean,
                default: true
            },
            includePageNumbers: {
                type: Boolean,
                default: true
            },
            watermark: {
                text: String,
                opacity: {
                    type: Number,
                    min: 0,
                    max: 1,
                    default: 0.3
                }
            }
        }
    },
    versions: [reportVersionSchema],
    currentVersion: {
        type: String,
        default: '1.0.0'
    },
    status: {
        type: String,
        enum: ['draft', 'active', 'archived', 'deprecated'],
        default: 'draft'
    },
    isTemplate: {
        type: Boolean,
        default: false
    },
    generatedInstances: [{
        instanceId: String,
        generatedAt: Date,
        parameters: mongoose.Schema.Types.Mixed,
        fileUrl: String,
        fileSize: Number,
        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        downloadCount: {
            type: Number,
            default: 0
        }
    }],
    permissions: {
        view: [String],
        edit: [String],
        export: [String],
        schedule: [String]
    },
    tags: [{
        type: String,
        trim: true
    }],
    metadata: {
        lastGenerated: Date,
        lastModified: Date,
        generationCount: {
            type: Number,
            default: 0
        },
        averageGenerationTime: Number,
        totalDownloads: {
            type: Number,
            default: 0
        },
        dataVolume: {
            rows: Number,
            size: Number
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
        uploadedAt: Date,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
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
reportSchema.index({ organization: 1, code: 1 }, { unique: true });
reportSchema.index({ organization: 1, type: 1 });
reportSchema.index({ organization: 1, category: 1 });
reportSchema.index({ organization: 1, status: 1 });
reportSchema.index({ 'schedule.enabled': 1, 'schedule.nextRun': 1 });

// Pre-save middleware to generate code
reportSchema.pre('save', function(next) {
    if (!this.code) {
        const prefix = this.type.substring(0, 3).toUpperCase();
        const timestamp = Date.now().toString(36).toUpperCase();
        this.code = `${prefix}-${timestamp}`;
    }
    next();
});

// Virtual for section count
reportSchema.virtual('sectionCount').get(function() {
    return this.sections?.length || 0;
});

// Virtual for instance count
reportSchema.virtual('instanceCount').get(function() {
    return this.generatedInstances?.length || 0;
});

// Method to generate report instance
reportSchema.methods.generate = async function(parameters = {}, userId) {
    const instanceId = new mongoose.Types.ObjectId().toString();
    const startTime = Date.now();
    
    // Create instance record
    const instance = {
        instanceId,
        generatedAt: new Date(),
        parameters,
        generatedBy: userId,
        downloadCount: 0
    };
    
    this.generatedInstances.push(instance);
    this.metadata.lastGenerated = new Date();
    this.metadata.generationCount += 1;
    
    // Calculate average generation time
    const generationTime = Date.now() - startTime;
    if (this.metadata.averageGenerationTime) {
        this.metadata.averageGenerationTime = 
            (this.metadata.averageGenerationTime * (this.metadata.generationCount - 1) + generationTime) / 
            this.metadata.generationCount;
    } else {
        this.metadata.averageGenerationTime = generationTime;
    }
    
    await this.save();
    
    return instance;
};

// Method to increment download count
reportSchema.methods.incrementDownload = async function(instanceId) {
    const instance = this.generatedInstances.find(i => i.instanceId === instanceId);
    if (instance) {
        instance.downloadCount += 1;
        this.metadata.totalDownloads += 1;
        await this.save();
    }
};

// Static method to get scheduled reports
reportSchema.statics.getScheduledReports = async function() {
    const now = new Date();
    return this.find({
        'schedule.enabled': true,
        'schedule.nextRun': { $lte: now },
        status: 'active'
    });
};

// Static method to search reports
reportSchema.statics.search = async function(organizationId, searchTerm, filters = {}) {
    const query = { organization: organizationId };
    
    if (searchTerm) {
        query.$or = [
            { name: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { code: { $regex: searchTerm, $options: 'i' } }
        ];
    }
    
    return this.find({ ...query, ...filters })
        .sort({ updatedAt: -1 })
        .populate('createdBy', 'firstName lastName email');
};

module.exports = mongoose.model('Report', reportSchema);