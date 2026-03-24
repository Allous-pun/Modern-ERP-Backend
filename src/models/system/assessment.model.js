// src/models/system/assessment.model.js
const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    
    assessmentDate: {
        type: Date,
        default: Date.now
    },
    assessor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    
    scope: String,
    methodology: String,
    
    // Summary stats (cached at assessment time)
    summary: {
        totalRisks: Number,
        criticalRisks: Number,
        highRisks: Number,
        mediumRisks: Number,
        lowRisks: Number
    },
    
    // Findings linked to risks
    findings: [{
        riskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RiskItem',
            required: true
        },
        previousScore: Number,
        newScore: Number,
        observations: String
    }],
    
    // Recommendations
    recommendations: [{
        recommendation: String,
        priority: {
            type: String,
            enum: ['critical', 'high', 'medium', 'low']
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        dueDate: Date,
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'cancelled'],
            default: 'pending'
        },
        completedAt: Date
    }],
    
    // Report file
    reportFile: {
        filename: String,
        fileUrl: String,
        uploadedAt: Date
    },
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    notes: String
}, {
    timestamps: true
});

// Indexes
assessmentSchema.index({ organization: 1, assessmentDate: -1 });
assessmentSchema.index({ organization: 1, 'findings.riskId': 1 });

module.exports = mongoose.model('Assessment', assessmentSchema);