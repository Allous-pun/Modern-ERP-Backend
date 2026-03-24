// src/models/executive/itCompliance.model.js
const mongoose = require('mongoose');

const itComplianceSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Framework identification
    framework: {
        name: {
            type: String,
            enum: ['ISO27001', 'SOC2', 'GDPR', 'HIPAA', 'PCI-DSS', 'COBIT', 'ITIL', 'NIST', 'SOX'],
            required: true
        },
        version: String,
        scope: String,
        status: {
            type: String,
            enum: ['compliant', 'partially_compliant', 'non_compliant', 'not_applicable', 'in_progress'],
            default: 'in_progress'
        }
    },
    
    // Certification details
    certification: {
        certificateId: String,
        issuedBy: String,
        issuedDate: Date,
        expiryDate: Date,
        lastAuditDate: Date,
        nextAuditDate: Date,
        auditor: String
    },
    
    // Control objectives
    controlObjectives: [{
        objectiveId: String,
        description: String,
        category: String,
        weight: Number,
        status: {
            type: String,
            enum: ['compliant', 'partially_compliant', 'non_compliant', 'not_applicable']
        },
        score: Number,
        lastAssessed: Date
    }],
    
    // Controls
    controls: [{
        controlId: String,
        name: String,
        description: String,
        objectiveId: String,
        type: {
            type: String,
            enum: ['preventive', 'detective', 'corrective']
        },
        implementation: {
            status: {
                type: String,
                enum: ['implemented', 'partially_implemented', 'not_implemented', 'not_applicable']
            },
            evidence: [{
                name: String,
                url: String,
                uploadedAt: Date,
                validUntil: Date
            }],
            owner: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            lastReviewed: Date,
            nextReview: Date
        },
        effectiveness: {
            score: Number,
            lastAssessed: Date,
            issues: [String]
        },
        testing: {
            frequency: String,
            lastTested: Date,
            nextTest: Date,
            results: String
        }
    }],
    
    // Compliance assessments
    assessments: [{
        assessmentId: String,
        date: Date,
        assessor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        scope: String,
        methodology: String,
        results: {
            overallScore: Number,
            complianceRate: Number,
            criticalFindings: Number,
            highFindings: Number,
            mediumFindings: Number,
            lowFindings: Number
        },
        findings: [{
            findingId: String,
            controlId: String,
            description: String,
            severity: {
                type: String,
                enum: ['critical', 'high', 'medium', 'low']
            },
            recommendation: String,
            remediation: {
                plan: String,
                owner: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'OrganizationMember'
                },
                dueDate: Date,
                status: {
                    type: String,
                    enum: ['open', 'in_progress', 'closed', 'overdue']
                },
                closedDate: Date,
                notes: String
            }
        }],
        report: {
            url: String,
            generatedAt: Date
        }
    }],
    
    // Compliance metrics
    metrics: {
        overall: {
            score: Number,
            trend: String,
            percentile: Number
        },
        byCategory: [{
            category: String,
            score: Number,
            controls: Number,
            compliant: Number
        }],
        byDomain: [{
            domain: String,
            score: Number,
            weight: Number
        }],
        history: [{
            date: Date,
            score: Number,
            findings: Number
        }]
    },
    
    // Remediation tracking
    remediation: {
        open: Number,
        inProgress: Number,
        closed: Number,
        overdue: Number,
        bySeverity: {
            critical: {
                open: Number,
                closed: Number
            },
            high: {
                open: Number,
                closed: Number
            },
            medium: {
                open: Number,
                closed: Number
            },
            low: {
                open: Number,
                closed: Number
            }
        },
        meanTimeToRemediate: Number,
        aging: [{
            range: String,
            count: Number
        }]
    },
    
    // Compliance costs
    costs: {
        total: Number,
        byType: [{
            type: String,
            amount: Number
        }],
        byFramework: [{
            framework: String,
            amount: Number
        }],
        forecast: Number,
        roi: Number
    },
    
    // Documentation
    documentation: [{
        name: String,
        type: String,
        url: String,
        version: String,
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        approvedAt: Date,
        reviewDate: Date
    }],
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
itComplianceSchema.index({ organization: 1, 'framework.name': 1 });
itComplianceSchema.index({ organization: 1, 'framework.status': 1 });
itComplianceSchema.index({ organization: 1, 'certification.expiryDate': 1 });

// Methods
itComplianceSchema.methods.calculateComplianceScore = function() {
    let totalWeight = 0;
    let weightedScore = 0;
    
    this.controlObjectives.forEach(objective => {
        if (objective.status !== 'not_applicable') {
            totalWeight += objective.weight || 1;
            const scoreMap = {
                'compliant': 100,
                'partially_compliant': 50,
                'non_compliant': 0
            };
            weightedScore += (scoreMap[objective.status] || 0) * (objective.weight || 1);
        }
    });
    
    this.metrics.overall.score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    return this.save();
};

itComplianceSchema.methods.addFinding = function(assessmentId, findingData) {
    const assessment = this.assessments.id(assessmentId);
    if (assessment) {
        assessment.findings.push(findingData);
        
        // Update remediation counts
        if (findingData.severity === 'critical' || findingData.severity === 'high') {
            this.remediation.open += 1;
            this.remediation.bySeverity[findingData.severity].open += 1;
        }
    }
    return this.save();
};

module.exports = mongoose.model('ITCompliance', itComplianceSchema);