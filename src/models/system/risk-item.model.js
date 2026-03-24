// src/models/system/risk-item.model.js
const mongoose = require('mongoose');

const riskItemSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Risk ID
    riskId: {
        type: String,
        required: true
    },
    
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
    riskScore: Number,
    riskLevel: {
        type: String,
        enum: ['very_low', 'low', 'medium', 'high', 'critical']
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
    
    // Dates
    identifiedDate: Date,
    lastReviewDate: Date,
    nextReviewDate: Date,
    targetResolutionDate: Date,
    actualResolutionDate: Date,
    
    // Status
    status: {
        type: String,
        enum: ['identified', 'assessed', 'mitigating', 'monitoring', 'closed', 'archived'],
        default: 'identified'
    },
    
    // Financial Impact
    financialImpact: {
        currency: { type: String, default: 'KSH' },
        minAmount: Number,
        maxAmount: Number,
        expectedAmount: Number
    },
    
    // History
    history: [{
        action: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationMember' },
        performedAt: Date,
        changes: mongoose.Schema.Types.Mixed,
        notes: String
    }],
    
    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationMember' },
    createdAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganizationMember' },
    updatedAt: Date,
    
    notes: String
}, {
    timestamps: true
});

// Indexes for fast queries
riskItemSchema.index({ organization: 1, riskId: 1 });
riskItemSchema.index({ organization: 1, category: 1 });
riskItemSchema.index({ organization: 1, status: 1 });
riskItemSchema.index({ organization: 1, riskLevel: 1 });
riskItemSchema.index({ organization: 1, owner: 1 });
riskItemSchema.index({ organization: 1, nextReviewDate: 1 });

module.exports = mongoose.model('RiskItem', riskItemSchema);