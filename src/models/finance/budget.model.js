// src/models/finance/budget.model.js
const mongoose = require('mongoose');

const budgetLineItemSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Account is required']
    },
    amount: {
        type: Number,
        required: [true, 'Budget amount is required'],
        min: 0
    },
    actualAmount: {
        type: Number,
        default: 0
    },
    variance: {
        type: Number,
        default: 0
    },
    variancePercentage: {
        type: Number,
        default: 0
    }
}, { _id: false });

const budgetSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Budget Identification
    name: {
        type: String,
        required: [true, 'Budget name is required'],
        trim: true,
        maxlength: [100, 'Budget name cannot exceed 100 characters']
    },
    budgetNumber: {
        type: String,
        required: [true, 'Budget number is required'],
        trim: true,
        unique: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // Period
    fiscalYear: {
        type: Number,
        required: [true, 'Fiscal year is required'],
        min: 2000,
        max: 2100
    },
    periodType: {
        type: String,
        enum: ['annual', 'quarterly', 'monthly'],
        required: [true, 'Period type is required'],
        default: 'annual'
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    
    // Budget Items
    lineItems: [budgetLineItemSchema],
    
    // Totals
    totalBudget: {
        type: Number,
        default: 0
    },
    totalActual: {
        type: Number,
        default: 0
    },
    totalVariance: {
        type: Number,
        default: 0
    },
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'review', 'approved', 'active', 'archived'],
        default: 'draft',
        index: true
    },
    
    // Approval
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    approvedAt: Date,
    
    // Notes
    notes: [{
        content: {
            type: String,
            required: true,
            trim: true
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
    }],
    
    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: [true, 'Creator is required']
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
budgetSchema.index({ organization: 1, budgetNumber: 1 }, { unique: true });
budgetSchema.index({ organization: 1, fiscalYear: 1 });
budgetSchema.index({ organization: 1, status: 1 });
budgetSchema.index({ organization: 1, startDate: 1, endDate: 1 });

// Virtual for total budget
budgetSchema.virtual('totalBudgetCalculated').get(function() {
    return this.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
});

// Virtual for total actual
budgetSchema.virtual('totalActualCalculated').get(function() {
    return this.lineItems.reduce((sum, item) => sum + (item.actualAmount || 0), 0);
});

// Virtual for total variance
budgetSchema.virtual('totalVarianceCalculated').get(function() {
    return this.totalBudgetCalculated - this.totalActualCalculated;
});

// Method to check if budget can be approved
budgetSchema.methods.canApprove = function() {
    return this.status === 'review';
};

// Method to check if budget can be activated
budgetSchema.methods.canActivate = function() {
    return this.status === 'approved';
};

// Method to approve budget
budgetSchema.methods.approve = function(userId) {
    if (!this.canApprove()) {
        throw new Error(`Cannot approve budget with status: ${this.status}`);
    }
    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
    return this;
};

// Method to activate budget
budgetSchema.methods.activate = function(userId) {
    if (!this.canActivate()) {
        throw new Error(`Cannot activate budget with status: ${this.status}`);
    }
    this.status = 'active';
    this.updatedBy = userId;
    return this;
};

// Method to archive budget
budgetSchema.methods.archive = function(userId) {
    this.status = 'archived';
    this.updatedBy = userId;
    return this;
};

// Static method to generate budget number
budgetSchema.statics.generateBudgetNumber = async function(organizationId) {
    const currentYear = new Date().getFullYear();
    const prefix = `BGT-${currentYear}`;
    
    const lastBudget = await this.findOne({
        organization: organizationId,
        budgetNumber: { $regex: `^${prefix}` }
    }).sort({ budgetNumber: -1 });
    
    let nextNumber = 1;
    if (lastBudget) {
        const parts = lastBudget.budgetNumber.split('-');
        const lastNumber = parseInt(parts[parts.length - 1]);
        nextNumber = lastNumber + 1;
    }
    
    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
};

// Static method to get budgets by fiscal year
budgetSchema.statics.getByFiscalYear = async function(organizationId, fiscalYear, status = null) {
    const query = {
        organization: organizationId,
        fiscalYear: fiscalYear
    };
    if (status) query.status = status;
    
    return await this.find(query)
        .populate('lineItems.account', 'code name type category')
        .populate('createdBy', 'personalInfo.firstName personalInfo.lastName')
        .populate('approvedBy', 'personalInfo.firstName personalInfo.lastName')
        .sort({ createdAt: -1 });
};

// Static method to get budget summary
budgetSchema.statics.getSummary = async function(organizationId, fiscalYear) {
    const budgets = await this.find({
        organization: organizationId,
        fiscalYear: fiscalYear,
        status: { $in: ['approved', 'active'] }
    });
    
    const summary = {
        totalBudget: 0,
        totalActual: 0,
        totalVariance: 0,
        byAccount: {},
        byPeriod: {}
    };
    
    for (const budget of budgets) {
        summary.totalBudget += budget.totalBudget;
        summary.totalActual += budget.totalActual;
        
        for (const item of budget.lineItems) {
            const accountId = item.account.toString();
            if (!summary.byAccount[accountId]) {
                summary.byAccount[accountId] = {
                    budget: 0,
                    actual: 0,
                    variance: 0
                };
            }
            summary.byAccount[accountId].budget += item.amount;
            summary.byAccount[accountId].actual += item.actualAmount || 0;
            summary.byAccount[accountId].variance = summary.byAccount[accountId].budget - summary.byAccount[accountId].actual;
        }
    }
    
    summary.totalVariance = summary.totalBudget - summary.totalActual;
    
    return summary;
};

module.exports = mongoose.model('Budget', budgetSchema);
