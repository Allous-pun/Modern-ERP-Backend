// src/models/backup.model.js
const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    type: {
        type: String,
        enum: ['full', 'incremental', 'differential'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed'],
        default: 'pending'
    },
    size: Number,
    path: String,
    filename: String,
    description: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    completedAt: Date,
    errorMessage: String,
    metadata: {
        collections: [String],
        records: Number,
        duration: Number
    }
}, {
    timestamps: true
});

backupSchema.index({ organization: 1, createdAt: -1 });
backupSchema.index({ status: 1 });

module.exports = mongoose.model('Backup', backupSchema);