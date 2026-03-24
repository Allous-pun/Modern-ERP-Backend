// src/models/executive/scheduledReport.model.js
const mongoose = require('mongoose');

const scheduledReportSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Schedule identification
    name: {
        type: String,
        required: true
    },
    description: String,
    
    // Report configuration
    report: {
        template: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ReportTemplate',
            required: true
        },
        config: mongoose.Schema.Types.Mixed, // Custom configuration overrides
        parameters: mongoose.Schema.Types.Mixed // Query parameters
    },
    
    // Schedule settings - ONE TIME ONLY
    scheduledDate: {
        type: Date,
        required: true
    },
    
    // Status
    status: {
        type: String,
        enum: ['pending', 'generated', 'failed'],
        default: 'pending'
    },
    
    // Execution result
    generatedReportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExecutiveReport'
    },
    error: String,
    generatedAt: Date,
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    tags: [String]
}, {
    timestamps: true
});

// Index for finding pending reports by scheduled date
scheduledReportSchema.index({ organization: 1, status: 1, scheduledDate: 1 });

module.exports = mongoose.model('ScheduledReport', scheduledReportSchema);
