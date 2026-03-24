// src/models/sales/opportunity.model.js
const mongoose = require('mongoose');

const opportunityProductSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required']
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
        type: Number,
        required: [true, 'Unit price is required'],
        min: [0, 'Unit price cannot be negative']
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative']
    },
    total: {
        type: Number,
        required: [true, 'Total is required'],
        min: [0, 'Total cannot be negative']
    }
}, { _id: true });

const opportunitySchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Basic Information
    name: {
        type: String,
        required: [true, 'Opportunity name is required'],
        trim: true,
        maxlength: [200, 'Opportunity name cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    
    // Related Entities
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: [true, 'Customer is required']
    },
    contact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    },
    lead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead'
    },
    
    // Stage
    stage: {
        type: String,
        required: [true, 'Stage is required'],
        enum: [
            'qualification', 'needs-analysis', 'proposal',
            'negotiation', 'closed-won', 'closed-lost'
        ],
        default: 'qualification',
        index: true
    },
    
    // Amount
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    probability: {
        type: Number,
        min: [0, 'Probability cannot be negative'],
        max: [100, 'Probability cannot exceed 100'],
        default: function() {
            const stageProbabilities = {
                'qualification': 10,
                'needs-analysis': 30,
                'proposal': 60,
                'negotiation': 80
            };
            return stageProbabilities[this.stage] || 10;
        }
    },
    
    // Products
    products: [opportunityProductSchema],
    
    // Dates
    expectedCloseDate: {
        type: Date,
        required: [true, 'Expected close date is required']
    },
    actualCloseDate: Date,
    
    // Assignment
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Assigned user is required']
    },
    assignedAt: Date,
    
    // Team
    team: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: String,
        contribution: {
            type: Number,
            min: 0,
            max: 100
        }
    }],
    
    // Competition
    competitors: [{
        name: String,
        strengths: String,
        weaknesses: String
    }],
    
    // Status
    status: {
        type: String,
        enum: ['open', 'in-progress', 'won', 'lost'],
        default: 'open'
    },
    
    // Closed Details
    closedAt: Date,
    closedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lostReason: String,
    
    // Related Quotes
    quotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quote'
    }],
    
    // Activities
    lastActivityAt: Date,
    nextActivityAt: Date,
    
    // Tags
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    
    // Attachments
    attachments: [{
        filename: String,
        url: String,
        type: String,
        size: Number,
        uploadedAt: Date,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator is required']
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
opportunitySchema.index({ organization: 1, customer: 1 });
opportunitySchema.index({ organization: 1, stage: 1 });
opportunitySchema.index({ organization: 1, assignedTo: 1 });
opportunitySchema.index({ expectedCloseDate: 1 });
opportunitySchema.index({ probability: -1 });

// Virtual for weighted amount
opportunitySchema.virtual('weightedAmount').get(function() {
    return (this.amount * this.probability) / 100;
});

// Virtual for days in stage
opportunitySchema.virtual('daysInStage').get(function() {
    if (!this.updatedAt) return 0;
    return Math.floor((new Date() - this.updatedAt) / (1000 * 60 * 60 * 24));
});

// Method to update stage
opportunitySchema.methods.updateStage = async function(stage, userId) {
    this.stage = stage;
    
    // Update probability based on stage
    const stageProbabilities = {
        'qualification': 10,
        'needs-analysis': 30,
        'proposal': 60,
        'negotiation': 80,
        'closed-won': 100,
        'closed-lost': 0
    };
    
    if (stageProbabilities[stage] !== undefined) {
        this.probability = stageProbabilities[stage];
    }
    
    // Handle closed stages
    if (stage === 'closed-won') {
        this.status = 'won';
        this.actualCloseDate = new Date();
        this.closedAt = new Date();
        this.closedBy = userId;
    } else if (stage === 'closed-lost') {
        this.status = 'lost';
        this.actualCloseDate = new Date();
        this.closedAt = new Date();
        this.closedBy = userId;
    }
    
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Method to add product
opportunitySchema.methods.addProduct = async function(productData) {
    const total = productData.quantity * productData.unitPrice - (productData.discount || 0);
    
    this.products.push({
        ...productData,
        total
    });
    
    // Recalculate opportunity amount
    this.amount = this.products.reduce((sum, p) => sum + p.total, 0);
    
    await this.save();
    return this;
};

// Static method to get pipeline summary
opportunitySchema.statics.getPipelineSummary = async function(organizationId) {
    const pipeline = await this.aggregate([
        {
            $match: {
                organization: mongoose.Types.ObjectId(organizationId),
                stage: { $nin: ['closed-won', 'closed-lost'] }
            }
        },
        {
            $group: {
                _id: '$stage',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                weightedAmount: {
                    $sum: {
                        $multiply: ['$amount', { $divide: ['$probability', 100] }]
                    }
                }
            }
        },
        { $sort: { '_id': 1 } }
    ]);
    
    return pipeline;
};

// Static method to get forecast
opportunitySchema.statics.getForecast = async function(organizationId, months = 3) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);
    
    return this.aggregate([
        {
            $match: {
                organization: mongoose.Types.ObjectId(organizationId),
                expectedCloseDate: { $gte: startDate, $lte: endDate },
                stage: { $nin: ['closed-lost'] }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$expectedCloseDate' },
                    month: { $month: '$expectedCloseDate' },
                    stage: '$stage'
                },
                count: { $sum: 1 },
                amount: { $sum: '$amount' },
                weightedAmount: {
                    $sum: {
                        $multiply: ['$amount', { $divide: ['$probability', 100] }]
                    }
                }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
};

module.exports = mongoose.model('Opportunity', opportunitySchema);