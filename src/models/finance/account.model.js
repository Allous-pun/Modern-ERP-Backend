// src/models/finance/account.model.js
const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Account Identity
    code: {
        type: String,
        required: [true, 'Account code is required'],
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: [true, 'Account name is required'],
        trim: true,
        maxlength: [100, 'Account name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // Account Type
    type: {
        type: String,
        required: [true, 'Account type is required'],
        enum: [
            'asset', 'liability', 'equity', 
            'revenue', 'expense', 'contra_asset', 
            'contra_liability', 'contra_equity'
        ],
        index: true
    },
    category: {
        type: String,
        required: [true, 'Account category is required'],
        enum: [
            'current_asset', 'fixed_asset', 'other_asset',
            'current_liability', 'long_term_liability', 'other_liability',
            'owners_equity', 'retained_earnings',
            'operating_revenue', 'other_revenue',
            'operating_expense', 'administrative_expense', 'selling_expense',
            'other_expense', 'cost_of_goods_sold',
            'contra_asset', 'contra_liability', 'contra_equity'
        ]
    },
    subcategory: {
        type: String,
        trim: true
    },
    
    // Hierarchy
    parentAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    isHeader: {
        type: Boolean,
        default: false
    },
    level: {
        type: Number,
        default: 1,
        min: 1,
        max: 5
    },
    
    // Normal Balance
    normalBalance: {
        type: String,
        required: [true, 'Normal balance is required'],
        enum: ['debit', 'credit']
    },
    
    // Currency
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    allowMultiCurrency: {
        type: Boolean,
        default: false
    },
    
    // Tax
    taxCode: String,
    taxRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    isTaxable: {
        type: Boolean,
        default: false
    },
    
    // Reconciliation
    reconcile: {
        type: Boolean,
        default: false
    },
    lastReconciledDate: Date,
    lastReconciledBalance: Number,
    
    // Opening Balance
    openingBalance: {
        type: Number,
        default: 0
    },
    openingBalanceDate: Date,
    
    // Current Balance (calculated, not stored)
    // This will be computed via aggregation
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    isSystem: {
        type: Boolean,
        default: false
    },
    
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
    
    // Custom Fields
    customFields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Ensure unique account code per organization
accountSchema.index({ organization: 1, code: 1 }, { unique: true });
accountSchema.index({ organization: 1, name: 1 });
accountSchema.index({ organization: 1, type: 1 });
accountSchema.index({ organization: 1, category: 1 });
accountSchema.index({ organization: 1, parentAccount: 1 });

// Virtual for full path
accountSchema.virtual('fullPath').get(function() {
    return `${this.code} - ${this.name}`;
});

// Virtual for balance (to be populated via aggregation)
accountSchema.virtual('balance').get(function() {
    return this._balance || 0;
});

// Method to get current balance with period filter
accountSchema.methods.getBalance = async function(startDate, endDate) {
    const JournalEntry = mongoose.model('JournalEntry');
    
    const match = {
        organization: this.organization,
        status: 'posted',
        'lines.account': this._id
    };
    
    if (startDate || endDate) {
        match.date = {};
        if (startDate) match.date.$gte = startDate;
        if (endDate) match.date.$lte = endDate;
    }
    
    const result = await JournalEntry.aggregate([
        { $match: match },
        { $unwind: '$lines' },
        { $match: { 'lines.account': this._id } },
        { 
            $group: {
                _id: null,
                totalDebit: { $sum: '$lines.debit' },
                totalCredit: { $sum: '$lines.credit' }
            }
        }
    ]);
    
    const totals = result[0] || { totalDebit: 0, totalCredit: 0 };
    
    // Add opening balance if startDate is provided
    let openingBalance = 0;
    if (startDate) {
        const openingResult = await JournalEntry.aggregate([
            {
                $match: {
                    organization: this.organization,
                    status: 'posted',
                    'lines.account': this._id,
                    date: { $lt: startDate }
                }
            },
            { $unwind: '$lines' },
            { $match: { 'lines.account': this._id } },
            {
                $group: {
                    _id: null,
                    totalDebit: { $sum: '$lines.debit' },
                    totalCredit: { $sum: '$lines.credit' }
                }
            }
        ]);
        
        const openingTotals = openingResult[0] || { totalDebit: 0, totalCredit: 0 };
        
        if (this.normalBalance === 'debit') {
            openingBalance = openingTotals.totalDebit - openingTotals.totalCredit;
        } else {
            openingBalance = openingTotals.totalCredit - openingTotals.totalDebit;
        }
    } else {
        openingBalance = this.openingBalance || 0;
    }
    
    if (this.normalBalance === 'debit') {
        return openingBalance + totals.totalDebit - totals.totalCredit;
    } else {
        return openingBalance + totals.totalCredit - totals.totalDebit;
    }
};

// Method to get child accounts
accountSchema.methods.getChildren = async function() {
    return this.model('Account').find({ parentAccount: this._id });
};

// Method to get all descendants
accountSchema.methods.getDescendants = async function() {
    const descendants = [];
    const children = await this.getChildren();
    
    for (const child of children) {
        descendants.push(child);
        const grandChildren = await child.getDescendants();
        descendants.push(...grandChildren);
    }
    
    return descendants;
};

// Static method to get chart of accounts
accountSchema.statics.getChartOfAccounts = async function(organizationId) {
    const accounts = await this.find({ 
        organization: organizationId,
        isActive: true 
    }).sort('code');
    
    // Build tree structure
    const accountMap = {};
    const rootAccounts = [];
    
    accounts.forEach(account => {
        accountMap[account._id] = {
            ...account.toObject(),
            children: []
        };
    });
    
    accounts.forEach(account => {
        if (account.parentAccount && accountMap[account.parentAccount]) {
            accountMap[account.parentAccount].children.push(accountMap[account._id]);
        } else {
            rootAccounts.push(accountMap[account._id]);
        }
    });
    
    return rootAccounts;
};

// Static method to get trial balance
accountSchema.statics.getTrialBalance = async function(organizationId, asOfDate) {
    const accounts = await this.find({ 
        organization: organizationId,
        isActive: true 
    }).sort('code');
    
    const trialBalance = [];
    let totalDebit = 0;
    let totalCredit = 0;
    
    for (const account of accounts) {
        const balance = await account.getBalance(null, asOfDate);
        
        const entry = {
            code: account.code,
            name: account.name,
            type: account.type,
            normalBalance: account.normalBalance,
            balance,
            debit: account.normalBalance === 'debit' ? balance : 0,
            credit: account.normalBalance === 'credit' ? balance : 0
        };
        
        trialBalance.push(entry);
        
        if (account.normalBalance === 'debit') {
            totalDebit += balance;
        } else {
            totalCredit += balance;
        }
    }
    
    return {
        accounts: trialBalance,
        totals: {
            debit: totalDebit,
            credit: totalCredit,
            difference: totalDebit - totalCredit
        },
        asOfDate: asOfDate || new Date()
    };
};

// Static method to get income statement accounts
accountSchema.statics.getIncomeStatementAccounts = async function(organizationId) {
    return this.find({
        organization: organizationId,
        type: { $in: ['revenue', 'expense'] },
        isActive: true
    }).sort('code');
};

// Static method to get balance sheet accounts
accountSchema.statics.getBalanceSheetAccounts = async function(organizationId) {
    return this.find({
        organization: organizationId,
        type: { $in: ['asset', 'liability', 'equity'] },
        isActive: true
    }).sort('code');
};

module.exports = mongoose.model('Account', accountSchema);