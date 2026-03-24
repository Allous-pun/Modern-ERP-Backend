// src/models/finance/account.model.js
const mongoose = require('mongoose');

// Account Types
const ACCOUNT_TYPES = {
    ASSET: 'asset',
    LIABILITY: 'liability',
    EQUITY: 'equity',
    REVENUE: 'revenue',
    EXPENSE: 'expense'
};

// Account Categories within each type
const ACCOUNT_CATEGORIES = {
    // Assets
    CURRENT_ASSET: 'current_asset',
    FIXED_ASSET: 'fixed_asset',
    INTANGIBLE_ASSET: 'intangible_asset',
    BANK: 'bank',
    CASH: 'cash',
    RECEIVABLE: 'receivable',
    INVENTORY: 'inventory',
    
    // Liabilities
    CURRENT_LIABILITY: 'current_liability',
    LONG_TERM_LIABILITY: 'long_term_liability',
    PAYABLE: 'payable',
    
    // Equity
    CAPITAL: 'capital',
    RETAINED_EARNINGS: 'retained_earnings',
    DRAWINGS: 'drawings',
    
    // Revenue
    OPERATING_REVENUE: 'operating_revenue',
    NON_OPERATING_REVENUE: 'non_operating_revenue',
    
    // Expense
    OPERATING_EXPENSE: 'operating_expense',
    COST_OF_GOODS_SOLD: 'cogs',
    DEPRECIATION: 'depreciation',
    TAX: 'tax'
};

const accountSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Account Identification
    code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    
    // Account Classification
    type: {
        type: String,
        enum: Object.values(ACCOUNT_TYPES),
        required: true
    },
    category: {
        type: String,
        enum: Object.values(ACCOUNT_CATEGORIES),
        required: true
    },
    
    // Parent Account (for hierarchical charts)
    parentAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        default: null
    },
    
    // Financial Reporting
    isActive: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isControlAccount: {
        type: Boolean,
        default: false
    },
    isReconcilable: {
        type: Boolean,
        default: false
    },
    
    // Currency
    currency: {
        type: String,
        default: 'KSH'
    },
    
    // Opening Balance
    openingBalance: {
        amount: {
            type: Number,
            default: 0
        },
        date: {
            type: Date,
            default: Date.now
        }
    },
    
    // Bank Account Details (for bank accounts)
    bankDetails: {
        bankName: String,
        accountNumber: String,
        branchCode: String,
        swiftCode: String,
        iban: String
    },
    
    // Tax Settings
    taxCode: {
        type: String,
        default: null
    },
    isTaxApplicable: {
        type: Boolean,
        default: false
    },
    
    // Reporting
    reportCode: String,
    displayOrder: {
        type: Number,
        default: 0
    },
    
    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    
    // Soft Delete
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    }
}, {
    timestamps: true
});

// Compound index for organization + code uniqueness
accountSchema.index({ organization: 1, code: 1 }, { unique: true });
accountSchema.index({ organization: 1, type: 1 });
accountSchema.index({ organization: 1, category: 1 });
accountSchema.index({ organization: 1, isActive: 1 });
accountSchema.index({ organization: 1, parentAccount: 1 });

// FIXED: Pre-save middleware using async/await instead of next
accountSchema.pre('save', async function() {
    if (this.isModified('code')) {
        this.code = this.code.toUpperCase().trim();
    }
    if (this.isModified('name')) {
        this.name = this.name.trim();
    }
});

// Virtual for full account name (code + name)
accountSchema.virtual('fullName').get(function() {
    return `${this.code} - ${this.name}`;
});

// Method to get account balance (to be implemented with journal entries)
accountSchema.methods.getBalance = async function(asOfDate = new Date()) {
    // This will be implemented when we build the journal module
    return 0;
};

// Static method to get chart of accounts
accountSchema.statics.getChart = async function(organizationId) {
    const accounts = await this.find({
        organization: organizationId,
        deletedAt: null
    }).sort({ displayOrder: 1, code: 1 });
    
    // Build hierarchical structure
    const buildTree = (parentId = null) => {
        return accounts
            .filter(acc => {
                const parentMatch = parentId === null 
                    ? !acc.parentAccount 
                    : acc.parentAccount && acc.parentAccount.toString() === parentId.toString();
                return parentMatch;
            })
            .map(acc => ({
                ...acc.toObject(),
                children: buildTree(acc._id)
            }));
    };
    
    return buildTree();
};

// Static method to get accounts by type
accountSchema.statics.getByType = async function(organizationId, type) {
    return await this.find({
        organization: organizationId,
        type,
        isActive: true,
        deletedAt: null
    }).sort({ code: 1 });
};

module.exports = {
    Account: mongoose.model('Account', accountSchema),
    ACCOUNT_TYPES,
    ACCOUNT_CATEGORIES
};