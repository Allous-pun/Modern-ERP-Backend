// src/models/executive/strategicDashboard.model.js
const mongoose = require('mongoose');

const strategicDashboardSchema = new mongoose.Schema({
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
    type: {
        type: String,
        enum: ['board', 'executive', 'custom'],
        default: 'board'
    },
    
    categories: [{
        name: String,
        order: Number,
        kpis: [{
            name: String,
            key: String,
            value: mongoose.Schema.Types.Mixed,
            target: mongoose.Schema.Types.Mixed,
            unit: String,
            status: {
                type: String,
                enum: ['on_track', 'at_risk', 'behind', 'completed'],
                default: 'on_track'
            },
            trend: {
                direction: String,
                percentage: Number
            },
            lastUpdated: Date,
            history: [{
                date: Date,
                value: mongoose.Schema.Types.Mixed
            }]
        }]
    }],
    
    settings: {
        theme: String,
        defaultView: String,
        favorite: Boolean
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
    lastViewed: Date,
    viewCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

strategicDashboardSchema.index({ organization: 1, type: 1 });

module.exports = mongoose.model('StrategicDashboard', strategicDashboardSchema);
