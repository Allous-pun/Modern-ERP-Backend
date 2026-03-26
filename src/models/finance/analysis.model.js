// src/models/finance/analysis.model.js (updated)
const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    name: {
        type: String,
        required: true
    },
    
    description: String,
    
    analysisType: {
        type: String,
        enum: ['ratio', 'trend', 'variance'],
        required: true
    },
    
    period: {
        startDate: Date,
        endDate: Date,
        periods: Number // For trend analysis
    },
    
    // Store results as JSON
    results: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('FinancialAnalysis', analysisSchema);
