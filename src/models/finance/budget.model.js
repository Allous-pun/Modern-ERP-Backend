// src/models/finance/budget.model.js
const mongoose = require('mongoose');

const budgetCategorySchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Account is required']
    },
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true
    },
    description: String,
    type: {
        type: String,
        enum: ['revenue', 'expense', 'asset', 'liability', 'equity'],
        required: [true, 'Category type is required']
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BudgetCategory'
    },
    amount: {
        type: Number,
        required: [true, 'Budget amount is required'],
        min: [0, 'Budget amount cannot be negative']
    },
    monthlyDistribution: [{
        month: {
            type: Number,
            min: 1,
            max: 12,
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: [0, 'Monthly amount cannot be negative']
        }
    }],
    notes: String
}, { _id: true });

const budgetVersionSchema = new mongoose.Schema({
    version: {
        type: Number,
        required: true
    },
    changes: {
        type: String,
        maxlength: [1000, 'Changes description cannot exceed 1000 characters']
    },
    data: mongoose.Schema.Types.Mixed,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const budgetSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Basic Information
    name: {
        type: String,
        required: [true, 'Budget name is required'],
        trim: true,
        minlength: [3, 'Budget name must be at least 3 characters'],
        maxlength: [200, 'Budget name cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // Budget Period
    fiscalYear: {
        type: Number,
        required: [true, 'Fiscal year is required'],
        min: [2000, 'Invalid fiscal year'],
        max: [2100, 'Invalid fiscal year']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    type: {
        type: String,
        required: [true, 'Budget type is required'],
        enum: ['operating', 'capital', 'cash', 'master', 'departmental'],
        default: 'operating'
    },
    
    // Scope
    department: {
        type: String,
        trim: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    location: String,
    
    // Budget Categories
    categories: [budgetCategorySchema],
    
    // Totals
    totalAmount: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Total amount cannot be negative']
    },
    totalRevenue: {
        type: Number,
        default: 0,
        min: [0, 'Total revenue cannot be negative']
    },
    totalExpense: {
        type: Number,
        default: 0,
        min: [0, 'Total expense cannot be negative']
    },
    netBudget: {
        type: Number,
        default: 0
    },
    
    // Currency
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    
    // Version Control
    version: {
        type: Number,
        default: 1
    },
    versions: [budgetVersionSchema],
    isLatest: {
        type: Boolean,
        default: true
    },
    
    // Status
    status: {
        type: String,
        required: [true, 'Budget status is required'],
        enum: ['draft', 'pending', 'approved', 'rejected', 'active', 'closed', 'archived'],
        default: 'draft'
    },
    
    // Approval
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    submittedAt: Date,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    approvalComments: String,
    rejectionReason: String,
    
    // Actuals Tracking
    actuals: {
        revenue: {
            type: Number,
            default: 0
        },
        expense: {
            type: Number,
            default: 0
        },
        net: {
            type: Number,
            default: 0
        },
        lastUpdated: Date
    },
    
    // Variance Analysis
    variances: {
        amount: Number,
        percentage: Number,
        byCategory: mongoose.Schema.Types.Mixed
    },
    
    // Notes and Attachments
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    assumptions: {
        type: String,
        trim: true,
        maxlength: [2000, 'Assumptions cannot exceed 2000 characters']
    },
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
    },
    
    // Settings
    settings: {
        rolloverUnused: {
            type: Boolean,
            default: false
        },
        allowOverspend: {
            type: Boolean,
            default: false
        },
        notifyOnThreshold: {
            type: Number,
            min: 0,
            max: 100,
            default: 80
        },
        requireApprovalForOverspend: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
budgetSchema.index({ organization: 1, fiscalYear: 1, type: 1 });
budgetSchema.index({ organization: 1, status: 1 });
budgetSchema.index({ organization: 1, department: 1 });
budgetSchema.index({ startDate: 1, endDate: 1 });

// Calculate totals before saving
budgetSchema.pre('save', function(next) {
    // Calculate totals
    this.totalRevenue = this.categories
        .filter(c => c.type === 'revenue')
        .reduce((sum, c) => sum + c.amount, 0);
    
    this.totalExpense = this.categories
        .filter(c => c.type === 'expense')
        .reduce((sum, c) => sum + c.amount, 0);
    
    this.totalAmount = this.categories.reduce((sum, c) => sum + c.amount, 0);
    this.netBudget = this.totalRevenue - this.totalExpense;
    
    next();
});

// Virtual for progress
budgetSchema.virtual('progress').get(function() {
    if (!this.actuals || this.totalAmount === 0) return 0;
    const totalActual = this.actuals.revenue + this.actuals.expense;
    return (totalActual / this.totalAmount) * 100;
});

// Virtual for variance percentage
budgetSchema.virtual('variancePercentage').get(function() {
    if (!this.actuals || this.totalAmount === 0) return 0;
    const totalActual = this.actuals.revenue + this.actuals.expense;
    return ((totalActual - this.totalAmount) / this.totalAmount) * 100;
});

// Method to get actual vs budget
budgetSchema.methods.getActualVsBudget = async function() {
    const JournalEntry = mongoose.model('JournalEntry');
    const Account = mongoose.model('Account');
    
    const result = {
        budget: this.totalAmount,
        actual: 0,
        variance: 0,
        variancePercentage: 0,
        byCategory: []
    };

    // Get all accounts in this budget
    const accountIds = this.categories.map(c => c.account);
    
    // Get actuals from journal entries
    for (const category of this.categories) {
        const account = await Account.findById(category.account);
        
        const match = {
            organization: this.organization,
            status: 'posted',
            date: { $gte: this.startDate, $lte: this.endDate },
            'lines.account': account._id
        };
        
        const pipeline = [
            { $match: match },
            { $unwind: '$lines' },
            { $match: { 'lines.account': account._id } },
            {
                $group: {
                    _id: null,
                    totalDebit: { $sum: '$lines.debit' },
                    totalCredit: { $sum: '$lines.credit' }
                }
            }
        ];
        
        const data = await JournalEntry.aggregate(pipeline);
        const totals = data[0] || { totalDebit: 0, totalCredit: 0 };
        
        let actual = 0;
        if (account.normalBalance === 'debit') {
            actual = totals.totalDebit - totals.totalCredit;
        } else {
            actual = totals.totalCredit - totals.totalDebit;
        }
        
        result.actual += actual;
        
        result.byCategory.push({
            categoryId: category._id,
            name: category.name,
            budget: category.amount,
            actual,
            variance: actual - category.amount,
            variancePercentage: category.amount ? ((actual - category.amount) / category.amount) * 100 : 0
        });
    }
    
    result.variance = result.actual - result.budget;
    result.variancePercentage = this.totalAmount ? (result.variance / this.totalAmount) * 100 : 0;
    
    return result;
};

// Method to get monthly breakdown
budgetSchema.methods.getMonthlyBreakdown = async function() {
    const JournalEntry = mongoose.model('JournalEntry');
    const Account = mongoose.model('Account');
    
    const months = [];
    const startMonth = this.startDate.getMonth();
    const startYear = this.startDate.getFullYear();
    
    for (let i = 0; i < 12; i++) {
        const month = (startMonth + i) % 12;
        const year = startYear + Math.floor((startMonth + i) / 12);
        
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        
        const monthData = {
            month: month + 1,
            year,
            budget: 0,
            actual: 0,
            byCategory: []
        };
        
        // Get budget for this month
        for (const category of this.categories) {
            const monthlyBudget = category.monthlyDistribution.find(
                m => m.month === month + 1
            )?.amount || (category.amount / 12);
            
            monthData.budget += monthlyBudget;
            
            // Get actual for this month
            const account = await Account.findById(category.account);
            
            const match = {
                organization: this.organization,
                status: 'posted',
                date: { $gte: monthStart, $lte: monthEnd },
                'lines.account': account._id
            };
            
            const pipeline = [
                { $match: match },
                { $unwind: '$lines' },
                { $match: { 'lines.account': account._id } },
                {
                    $group: {
                        _id: null,
                        totalDebit: { $sum: '$lines.debit' },
                        totalCredit: { $sum: '$lines.credit' }
                    }
                }
            ];
            
            const data = await JournalEntry.aggregate(pipeline);
            const totals = data[0] || { totalDebit: 0, totalCredit: 0 };
            
            let actual = 0;
            if (account.normalBalance === 'debit') {
                actual = totals.totalDebit - totals.totalCredit;
            } else {
                actual = totals.totalCredit - totals.totalDebit;
            }
            
            monthData.actual += actual;
            
            monthData.byCategory.push({
                categoryId: category._id,
                name: category.name,
                budget: monthlyBudget,
                actual
            });
        }
        
        months.push(monthData);
    }
    
    return months;
};

// Method to create new version
budgetSchema.methods.createVersion = async function(changes, userId) {
    this.versions.push({
        version: this.version + 1,
        changes,
        data: this.toObject(),
        createdBy: userId
    });
    
    this.version += 1;
    this.isLatest = true;
    this.updatedBy = userId;
    
    await this.save();
};

// Method to check if budget is on track
budgetSchema.methods.isOnTrack = async function() {
    const now = new Date();
    const progress = (now - this.startDate) / (this.endDate - this.startDate) * 100;
    const actualVsBudget = await this.getActualVsBudget();
    
    return {
        timeProgress: Math.min(100, progress),
        budgetProgress: actualVsBudget.variancePercentage,
        isOnTrack: Math.abs(actualVsBudget.variancePercentage) < 10,
        warning: Math.abs(actualVsBudget.variancePercentage) > this.settings.notifyOnThreshold
    };
};

// Static method to get active budgets
budgetSchema.statics.getActiveBudgets = async function(organizationId) {
    const now = new Date();
    return this.find({
        organization: organizationId,
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now }
    });
};

// Static method to get budget summary by fiscal year
budgetSchema.statics.getSummaryByYear = async function(organizationId, fiscalYear) {
    const budgets = await this.find({
        organization: organizationId,
        fiscalYear
    });
    
    return {
        fiscalYear,
        totalBudgets: budgets.length,
        totalAmount: budgets.reduce((sum, b) => sum + b.totalAmount, 0),
        approvedAmount: budgets
            .filter(b => b.status === 'approved')
            .reduce((sum, b) => sum + b.totalAmount, 0),
        byType: budgets.reduce((acc, b) => {
            if (!acc[b.type]) {
                acc[b.type] = { count: 0, amount: 0 };
            }
            acc[b.type].count++;
            acc[b.type].amount += b.totalAmount;
            return acc;
        }, {})
    };
};

module.exports = mongoose.model('Budget', budgetSchema);