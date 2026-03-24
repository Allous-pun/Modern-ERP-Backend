// src/models/system/compliance.model.js
const mongoose = require('mongoose');

const complianceSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },

    // ============================================
    // COMPLIANCE FRAMEWORKS
    // ============================================
    frameworks: [{
        name: {
            type: String,
            enum: ['GDPR', 'ISO27001', 'ISO9001', 'PCI_DSS', 'HIPAA', 'SOC2', 'CCPA', 'OTHER']
        },
        customName: String, // For 'OTHER' framework
        status: {
            type: String,
            enum: ['not_started', 'in_progress', 'compliant', 'non_compliant', 'audit_required'],
            default: 'not_started'
        },
        certificationDate: Date,
        expiryDate: Date,
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        notes: String
    }],

    // ============================================
    // COMPLIANCE CHECKLISTS
    // ============================================
    checklists: [{
        framework: String,
        category: String,
        items: [{
            requirement: String,
            description: String,
            status: {
                type: String,
                enum: ['pending', 'in_progress', 'compliant', 'non_compliant', 'not_applicable'],
                default: 'pending'
            },
            evidence: [{
                title: String,
                description: String,
                fileUrl: String,
                uploadedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'OrganizationMember'
                },
                uploadedAt: Date,
                expiryDate: Date
            }],
            assignedTo: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            dueDate: Date,
            completedAt: Date,
            notes: String
        }],
        overallProgress: {
            type: Number,
            default: 0, // Percentage
            min: 0,
            max: 100
        },
        lastReviewed: Date,
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        }
    }],

    // ============================================
    // AUDIT REPORTS
    // ============================================
    audits: [{
        title: String,
        type: {
            type: String,
            enum: ['internal', 'external', 'regulatory', 'customer'],
            required: true
        },
        framework: String,
        auditor: String,
        auditorContact: String,
        auditDate: Date,
        reportDate: Date,
        scope: String,
        findings: [{
            finding: String,
            severity: {
                type: String,
                enum: ['critical', 'high', 'medium', 'low', 'observation']
            },
            status: {
                type: String,
                enum: ['open', 'in_progress', 'resolved', 'accepted'],
                default: 'open'
            },
            remediation: String,
            dueDate: Date,
            resolvedAt: Date,
            resolvedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            }
        }],
        overallStatus: {
            type: String,
            enum: ['passed', 'failed', 'partial', 'pending'],
            default: 'pending'
        },
        reportFile: {
            filename: String,
            fileUrl: String,
            uploadedAt: Date
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        notes: String
    }],

    // ============================================
    // REGULATORY REQUIREMENTS
    // ============================================
    regulatoryRequirements: [{
        regulation: String,
        jurisdiction: String,
        requirements: [{
            requirement: String,
            description: String,
            status: {
                type: String,
                enum: ['compliant', 'non_compliant', 'partial', 'not_applicable'],
                default: 'not_applicable'
            },
            evidence: [String],
            lastReviewed: Date,
            nextReviewDate: Date
        }]
    }],

    // ============================================
    // METADATA
    // ============================================
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    lastAuditDate: Date,
    nextAuditDate: Date,
    overallComplianceScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes
complianceSchema.index({ organization: 1, 'frameworks.name': 1 });
complianceSchema.index({ organization: 1, 'audits.auditDate': -1 });
complianceSchema.index({ organization: 1, 'checklists.lastReviewed': -1 });

// Virtual for compliance status summary
complianceSchema.virtual('summary').get(function() {
    const frameworks = this.frameworks || [];
    const checklists = this.checklists || [];
    const audits = this.audits || [];

    return {
        totalFrameworks: frameworks.length,
        compliantFrameworks: frameworks.filter(f => f.status === 'compliant').length,
        inProgressFrameworks: frameworks.filter(f => f.status === 'in_progress').length,
        totalChecklistItems: checklists.reduce((acc, c) => acc + (c.items?.length || 0), 0),
        completedChecklistItems: checklists.reduce((acc, c) => 
            acc + (c.items?.filter(i => i.status === 'compliant').length || 0), 0),
        totalAudits: audits.length,
        passedAudits: audits.filter(a => a.overallStatus === 'passed').length,
        lastAuditDate: this.lastAuditDate,
        nextAuditDate: this.nextAuditDate,
        overallScore: this.overallComplianceScore
    };
});

module.exports = mongoose.model('Compliance', complianceSchema);