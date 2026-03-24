// src/models/finance/treasury.model.js
const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Account Identification
    accountName: {
        type: String,
        required: [true, 'Account name is required'],
        trim: true
    },
    accountNumber: {
        type: String,
        required: [true, 'Account number is required'],
        trim: true
    },
    bankName: {
        type: String,
        required: [true, 'Bank name is required'],
        trim: true
    },
    bankCode: {
        type: String,
        trim: true
    },
    branchName: {
        type: String,
        trim: true
    },
    swiftCode: {
        type: String,
        trim: true
    },
    iban: {
        type: String,
        trim: true
    },
    
    // Account Type
    accountType: {
        type: String,
        enum: ['checking', 'savings', 'money_market', 'foreign_currency'],
        default: 'checking'
    },
    currency: {
        type: String,
        required: [true, 'Currency is required'],
        default: 'KES'
    },
    
    // Balance
    openingBalance: {
        type: Number,
        default: 0
    },
    currentBalance: {
        type: Number,
        default: 0
    },
    
    // Account Status
    isActive: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    
    // Reconciliation
    lastReconciledAt: {
        type: Date
    },
    lastReconciledBalance: {
        type: Number
    },
    
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
bankAccountSchema.index({ organization: 1, accountNumber: 1 }, { unique: true });
bankAccountSchema.index({ organization: 1, isActive: 1 });

// Virtual for formatted account
bankAccountSchema.virtual('displayName').get(function() {
    return `${this.bankName} - ${this.accountName} (${this.accountNumber})`;
});

// Method to update balance
bankAccountSchema.methods.updateBalance = async function(amount, session) {
    this.currentBalance += amount;
    this.updatedBy = this.updatedBy || this.createdBy;
    return this.save({ session });
};

const reconciliationSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    bankAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount',
        required: [true, 'Bank account is required']
    },
    
    // Reconciliation Period
    statementDate: {
        type: Date,
        required: [true, 'Statement date is required']
    },
    statementBalance: {
        type: Number,
        required: [true, 'Statement balance is required']
    },
    bookBalance: {
        type: Number,
        required: [true, 'Book balance is required']
    },
    difference: {
        type: Number,
        default: 0
    },
    
    // Reconciliation Items
    clearedTransactions: [{
        transactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'JournalEntry'
        },
        amount: Number,
        date: Date
    }],
    outstandingTransactions: [{
        transactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'JournalEntry'
        },
        amount: Number,
        date: Date,
        reason: String
    }],
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'reconciled'],
        default: 'draft'
    },
    
    // Notes
    notes: {
        type: String,
        trim: true
    },
    
    // Audit
    reconciledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    reconciledAt: Date,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: [true, 'Creator is required']
    }
}, {
    timestamps: true
});

// Indexes
reconciliationSchema.index({ organization: 1, bankAccount: 1, statementDate: -1 });

const cashFlowForecastSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Forecast Period
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    periodType: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'monthly'
    },
    
    // Forecast Data
    inflows: [{
        source: String,
        amount: Number,
        date: Date,
        probability: {
            type: Number,
            min: 0,
            max: 100,
            default: 100
        },
        notes: String
    }],
    outflows: [{
        purpose: String,
        amount: Number,
        date: Date,
        required: {
            type: Boolean,
            default: true
        },
        notes: String
    }],
    
    // Calculations
    beginningBalance: Number,
    endingBalance: Number,
    netCashFlow: Number,
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft'
    },
    
    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: [true, 'Creator is required']
    },
    publishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    publishedAt: Date
}, {
    timestamps: true
});

// Indexes
cashFlowForecastSchema.index({ organization: 1, startDate: -1, endDate: -1 });

module.exports = {
    BankAccount: mongoose.model('BankAccount', bankAccountSchema),
    Reconciliation: mongoose.model('Reconciliation', reconciliationSchema),
    CashFlowForecast: mongoose.model('CashFlowForecast', cashFlowForecastSchema)
};
