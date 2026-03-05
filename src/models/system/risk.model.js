// src/models/system/risk.model.js
const mongoose = require('mongoose');

const riskSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },

    // ============================================
    // RISK REGISTER (DEPRECATED - kept for backward compatibility)
    // ============================================
    risks: [{
        // Basic Info
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        riskId: {
            type: String,
            unique: true,
            sparse: true
        },
        
        // Categorization
        category: {
            type: String,
            enum: [
                'operational', 'financial', 'strategic', 'compliance',
                'reputational', 'cybersecurity', 'hr', 'environmental',
                'project', 'market', 'legal', 'technology'
            ],
            required: true
        },
        subCategory: String,
        
        // Risk Assessment
        impact: {
            type: String,
            enum: ['very_low', 'low', 'medium', 'high', 'critical'],
            required: true
        },
        probability: {
            type: String,
            enum: ['very_low', 'low', 'medium', 'high', 'very_high'],
            required: true
        },
        riskScore: {
            type: Number,
            min: 1,
            max: 25,
            default: 1
        },
        
        // Risk Level (calculated)
        riskLevel: {
            type: String,
            enum: ['very_low', 'low', 'medium', 'high', 'critical'],
            default: 'low'
        },
        
        // Mitigation
        mitigationStrategy: {
            type: String,
            enum: ['avoid', 'reduce', 'transfer', 'accept', 'exploit'],
            default: 'reduce'
        },
        mitigationPlan: String,
        contingencyPlan: String,
        
        // Ownership
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        stakeholders: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        }],
        
        // Timeline
        identifiedDate: {
            type: Date,
            default: Date.now
        },
        reviewDate: Date,
        targetResolutionDate: Date,
        actualResolutionDate: Date,
        
        // Status
        status: {
            type: String,
            enum: ['identified', 'assessed', 'mitigating', 'monitoring', 'closed', 'archived'],
            default: 'identified'
        },
        
        // Monitoring
        monitoringFrequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'],
            default: 'monthly'
        },
        lastReviewDate: Date,
        nextReviewDate: Date,
        
        // Financial Impact
        financialImpact: {
            currency: {
                type: String,
                default: 'KSH'
            },
            minAmount: Number,
            maxAmount: Number,
            expectedAmount: Number
        },
        
        // Related Risks
        relatedRisks: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Risk.risks'
        }],
        
        // Dependencies
        dependencies: [String],
        
        // Attachments
        attachments: [{
            title: String,
            description: String,
            fileUrl: String,
            uploadedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }],
        
        // History
        history: [{
            action: {
                type: String,
                enum: ['created', 'updated', 'reviewed', 'mitigated', 'closed', 'reopened']
            },
            performedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            performedAt: {
                type: Date,
                default: Date.now
            },
            changes: mongoose.Schema.Types.Mixed,
            notes: String
        }],
        
        // Metadata
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        updatedAt: Date,
        
        // Notes
        notes: String
    }],

    // ============================================
    // RISK ASSESSMENTS
    // ============================================
    assessments: [{
        title: {
            type: String,
            required: true
        },
        description: String,
        assessmentDate: {
            type: Date,
            default: Date.now
        },
        assessor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember',
            required: true
        },
        scope: String,
        methodology: String,
        
        // Summary
        totalRisks: {
            type: Number,
            default: 0
        },
        criticalRisks: {
            type: Number,
            default: 0
        },
        highRisks: {
            type: Number,
            default: 0
        },
        mediumRisks: {
            type: Number,
            default: 0
        },
        lowRisks: {
            type: Number,
            default: 0
        },
        
        // Findings - UPDATED to reference RiskItem model
        findings: [{
            riskId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'RiskItem',  // Reference to the RiskItem model (separate collection)
                required: true
            },
            previousScore: Number,
            newScore: Number,
            observations: String
        }],
        
        // Recommendations
        recommendations: [{
            recommendation: {
                type: String,
                required: true
            },
            priority: {
                type: String,
                enum: ['critical', 'high', 'medium', 'low'],
                default: 'medium'
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
            }
        }],
        
        // Report
        reportFile: {
            filename: String,
            fileUrl: String,
            uploadedAt: Date
        },
        
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember',
            required: true
        },
        notes: String
    }],

    // ============================================
    // RISK METRICS
    // ============================================
    metrics: {
        totalRisks: {
            type: Number,
            default: 0
        },
        byCategory: {
            type: Map,
            of: Number,
            default: {}
        },
        byStatus: {
            type: Map,
            of: Number,
            default: {}
        },
        byLevel: {
            type: Map,
            of: Number,
            default: {}
        },
        averageScore: {
            type: Number,
            default: 0
        },
        topRisks: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RiskItem'  // Reference to RiskItem model
        }],
        lastUpdated: Date
    }
}, {
    timestamps: true
});

// Indexes
riskSchema.index({ organization: 1, 'assessments.assessmentDate': -1 });
riskSchema.index({ organization: 1, 'assessments.assessor': 1 });
riskSchema.index({ 'assessments.findings.riskId': 1 });  // Index for finding lookups

// ============================================
// PRE-SAVE MIDDLEWARE - FIXED
// ============================================
riskSchema.pre('save', async function() {
    // Remove the 'next' parameter and don't call next()
    
    if (this.risks && this.risks.length > 0) {
        for (const risk of this.risks) {
            // Calculate risk score if impact and probability are set
            if (risk.impact && risk.probability) {
                const impactMap = { very_low: 1, low: 2, medium: 3, high: 4, critical: 5 };
                const probMap = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 };
                
                const impactValue = impactMap[risk.impact] || 1;
                const probValue = probMap[risk.probability] || 1;
                
                risk.riskScore = impactValue * probValue;
                
                // Determine risk level
                if (risk.riskScore <= 4) risk.riskLevel = 'very_low';
                else if (risk.riskScore <= 8) risk.riskLevel = 'low';
                else if (risk.riskScore <= 12) risk.riskLevel = 'medium';
                else if (risk.riskScore <= 16) risk.riskLevel = 'high';
                else risk.riskLevel = 'critical';
            }
            
            // Set next review date
            if (risk.monitoringFrequency && risk.lastReviewDate) {
                const nextDate = new Date(risk.lastReviewDate);
                switch(risk.monitoringFrequency) {
                    case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
                    case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
                    case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
                    case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
                    case 'annually': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
                }
                risk.nextReviewDate = nextDate;
            }
            
            // Set updatedAt for individual risk if it's being modified
            risk.updatedAt = new Date();
        }
    }
});

// ============================================
// POST-SAVE MIDDLEWARE - FIXED
// ============================================
riskSchema.post('save', async function() {
    // Don't use next() here either
    await this.constructor.updateMetrics(this.organization);
});

// Static method to update metrics
riskSchema.statics.updateMetrics = async function(organizationId) {
    const Risk = this;
    const riskDoc = await Risk.findOne({ organization: organizationId });
    
    if (!riskDoc) return;
    
    const risks = riskDoc.risks || [];
    
    // Calculate metrics
    const metrics = {
        totalRisks: risks.length,
        byCategory: {},
        byStatus: {},
        byLevel: {},
        averageScore: 0,
        topRisks: [],
        lastUpdated: new Date()
    };
    
    let totalScore = 0;
    
    risks.forEach(risk => {
        // Count by category
        const category = risk.category || 'uncategorized';
        metrics.byCategory[category] = (metrics.byCategory[category] || 0) + 1;
        
        // Count by status
        const status = risk.status || 'unknown';
        metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
        
        // Count by level
        const level = risk.riskLevel || 'unknown';
        metrics.byLevel[level] = (metrics.byLevel[level] || 0) + 1;
        
        totalScore += risk.riskScore || 0;
    });
    
    metrics.averageScore = risks.length > 0 ? totalScore / risks.length : 0;
    
    // Get top 5 risks by score
    metrics.topRisks = risks
        .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
        .slice(0, 5)
        .map(r => r._id);
    
    riskDoc.metrics = metrics;
    await riskDoc.save();
};

// Virtual for risk heat map value
riskSchema.virtual('heatMapValue').get(function() {
    const impactMap = { very_low: 1, low: 2, medium: 3, high: 4, critical: 5 };
    const probMap = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 };
    
    return {
        impact: impactMap[this.impact] || 1,
        probability: probMap[this.probability] || 1,
        score: this.riskScore
    };
});

module.exports = mongoose.model('Risk', riskSchema);