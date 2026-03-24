// src/models/executive/governanceReport.model.js
const mongoose = require('mongoose');

const governanceReportSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Report details
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['board_summary', 'governance_audit', 'compliance_report', 'annual_governance'],
        required: true
    },
    period: {
        start: Date,
        end: Date,
        quarter: Number,
        year: Number
    },
    
    // Content
    executive: String,
    introduction: String,
    
    // Sections
    sections: [{
        title: String,
        content: String,
        order: Number,
        attachments: [{
            name: String,
            url: String
        }]
    }],
    
    // Statistics
    statistics: {
        meetings: {
            total: Number,
            held: Number,
            attendance: Number
        },
        resolutions: {
            total: Number,
            passed: Number,
            defeated: Number,
            implemented: Number
        },
        attendance: [{
            member: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            meetingsAttended: Number,
            meetingsTotal: Number,
            percentage: Number
        }]
    },
    
    // Findings and recommendations
    findings: [{
        area: String,
        issue: String,
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
        },
        recommendation: String,
        status: {
            type: String,
            enum: ['open', 'in_progress', 'resolved'],
            default: 'open'
        }
    }],
    
    // Compliance metrics
    compliance: {
        overall: Number,
        byArea: [{
            area: String,
            score: Number,
            status: String
        }]
    },
    
    // Review and approval
    review: {
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        reviewedAt: Date,
        comments: String
    },
    
    approval: {
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        approvedAt: Date,
        status: {
            type: String,
            enum: ['draft', 'under_review', 'approved', 'rejected'],
            default: 'draft'
        }
    },
    
    // Distribution
    distribution: [{
        member: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        sentAt: Date,
        readAt: Date
    }],
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

// Indexes
governanceReportSchema.index({ organization: 1, type: 1 });
governanceReportSchema.index({ organization: 1, 'period.year': 1, 'period.quarter': 1 });

module.exports = mongoose.model('GovernanceReport', governanceReportSchema);