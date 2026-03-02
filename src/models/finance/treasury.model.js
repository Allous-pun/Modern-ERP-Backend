// src/models/finance/treasury.model.js
const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
    accountNumber: {
        type: String,
        required: [true, 'Account number is required'],
        trim: true
    },
    accountName: {
        type: String,
        required: [true, 'Account name is required'],
        trim: true
    },
    bankName: {
        type: String,
        required: [true, 'Bank name is required'],
        trim: true
    },
    bankCode: String,
    branchName: String,
    branchCode: String,
    swiftCode: String,
    iban: String,
    routingNumber: String,
    currency: {
        type: String,
        required: [true, 'Currency is required'],
        uppercase: true
    },
    openingBalance: {
        type: Number,
        default: 0
    },
    currentBalance: {
        type: Number,
        default: 0
    },
    availableBalance: {
        type: Number,
        default: 0
    },
    lastReconciledDate: Date,
    lastReconciledBalance: Number,
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: true });

const cashFlowProjectionSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: [true, 'Date is required']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required']
    },
    type: {
        type: String,
        enum: ['inflow', 'outflow'],
        required: true
    },
    category: {
        type: String,
        enum: ['receivable', 'payable', 'payroll', 'tax', 'loan', 'investment']
    },
    description: String,
    probability: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
    },
    source: {
        type: String,
        enum: ['invoice', 'bill', 'forecast', 'manual']
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'sourceModel'
    },
    sourceModel: String
}, { _id: true });

const reconciliationSchema = new mongoose.Schema({
    reconciliationDate: {
        type: Date,
        required: [true, 'Reconciliation date is required']
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
        required: true
    },
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'discrepancy'],
        default: 'in_progress'
    },
    adjustments: [{
        date: Date,
        description: String,
        amount: Number,
        type: {
            type: String,
            enum: ['bank_charge', 'interest', 'correction', 'other']
        }
    }],
    reconciledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reconciledAt: Date,
    notes: String
}, { _id: true });

const treasurySchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Basic Information
    name: {
        type: String,
        required: [true, 'Treasury account name is required'],
        trim: true
    },
    type: {
        type: String,
        required: [true, 'Account type is required'],
        enum: [
            'bank', 'cash', 'investment', 'credit_card',
            'loan', 'petty_cash', 'digital_wallet'
        ],
        index: true
    },
    
    // Bank Accounts
    bankAccounts: [bankAccountSchema],
    
    // Primary Account
    primaryBankAccount: {
        type: mongoose.Schema.Types.ObjectId
    },
    
    // Cash Flow
    cashFlowProjections: [cashFlowProjectionSchema],
    
    // Reconciliation History
    reconciliationHistory: [reconciliationSchema],
    
    // Current Reconciliation
    currentReconciliation: reconciliationSchema,
    
    // Liquidity
    liquidity: {
        current: {
            type: Number,
            default: 0
        },
        quick: {
            type: Number,
            default: 0
        },
        cash: {
            type: Number,
            default: 0
        },
        lastCalculated: Date
    },
    
    // Working Capital
    workingCapital: {
        amount: {
            type: Number,
            default: 0
        },
        ratio: {
            type: Number,
            default: 0
        },
        lastCalculated: Date
    },
    
    // Cash Position
    cashPosition: {
        opening: Number,
        inflows: Number,
        outflows: Number,
        net: Number,
        closing: Number,
        asOfDate: Date
    },
    
    // Forecast Settings
    forecastSettings: {
        horizonDays: {
            type: Number,
            default: 90
        },
        confidenceLevel: {
            type: Number,
            min: 0,
            max: 100,
            default: 80
        },
        includeReceivables: {
            type: Boolean,
            default: true
        },
        includePayables: {
            type: Boolean,
            default: true
        },
        includeRecurring: {
            type: Boolean,
            default: true
        }
    },
    
    // Bank Reconciliation Settings
    reconciliationSettings: {
        toleranceAmount: {
            type: Number,
            default: 0.01
        },
        autoMatch: {
            type: Boolean,
            default: true
        },
        requireApproval: {
            type: Boolean,
            default: true
        },
        notifyOnDiscrepancy: {
            type: Boolean,
            default: true
        }
    },
    
    // Accounting Integration
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'General ledger account is required']
    },
    
    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'frozen', 'closed'],
        default: 'active'
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
    
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
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
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
treasurySchema.index({ organization: 1, type: 1 });
treasurySchema.index({ 'bankAccounts.accountNumber': 1 });
treasurySchema.index({ status: 1 });

// Virtual for total cash
treasurySchema.virtual('totalCash').get(function() {
    if (!this.bankAccounts) return 0;
    return this.bankAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
});

// Virtual for total available
treasurySchema.virtual('totalAvailable').get(function() {
    if (!this.bankAccounts) return 0;
    return this.bankAccounts.reduce((sum, acc) => sum + (acc.availableBalance || 0), 0);
});

// Method to get bank account
treasurySchema.methods.getBankAccount = function(accountId) {
    return this.bankAccounts.id(accountId);
};

// Method to add bank account
treasurySchema.methods.addBankAccount = async function(accountData, userId) {
    const newAccount = {
        ...accountData,
        openingBalance: accountData.openingBalance || 0,
        currentBalance: accountData.openingBalance || 0,
        availableBalance: accountData.openingBalance || 0
    };

    this.bankAccounts.push(newAccount);
    this.updatedBy = userId;
    await this.save();

    return this.bankAccounts[this.bankAccounts.length - 1];
};

// Method to update bank account balance
treasurySchema.methods.updateBalance = async function(accountId, amount, type, userId) {
    const account = this.bankAccounts.id(accountId);
    if (!account) {
        throw new Error('Bank account not found');
    }

    if (type === 'inflow') {
        account.currentBalance += amount;
        account.availableBalance += amount;
    } else {
        account.currentBalance -= amount;
        account.availableBalance -= amount;
    }

    account.lastReconciledDate = new Date();
    this.updatedBy = userId;
    await this.save();

    return account;
};

// Method to add cash flow projection
treasurySchema.methods.addCashFlowProjection = async function(projectionData, userId) {
    const projection = {
        ...projectionData,
        date: new Date(projectionData.date)
    };

    this.cashFlowProjections.push(projection);
    this.updatedBy = userId;
    await this.save();

    // Sort projections by date
    this.cashFlowProjections.sort((a, b) => a.date - b.date);

    return projection;
};

// Method to get cash flow forecast
treasurySchema.methods.getCashFlowForecast = async function(days = 90) {
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const projections = this.cashFlowProjections.filter(p => 
        p.date >= now && p.date <= endDate
    ).sort((a, b) => a.date - b.date);

    let runningBalance = this.totalCash;
    const forecast = [];

    for (const proj of projections) {
        if (proj.type === 'inflow') {
            runningBalance += proj.amount;
        } else {
            runningBalance -= proj.amount;
        }

        forecast.push({
            date: proj.date,
            inflow: proj.type === 'inflow' ? proj.amount : 0,
            outflow: proj.type === 'outflow' ? proj.amount : 0,
            net: proj.type === 'inflow' ? proj.amount : -proj.amount,
            balance: runningBalance,
            probability: proj.probability,
            description: proj.description
        });
    }

    return forecast;
};

// Method to start reconciliation
treasurySchema.methods.startReconciliation = async function(accountId, statementData, userId) {
    const account = this.bankAccounts.id(accountId);
    if (!account) {
        throw new Error('Bank account not found');
    }

    const bookBalance = account.currentBalance;
    const difference = statementData.statementBalance - bookBalance;

    this.currentReconciliation = {
        reconciliationDate: new Date(),
        statementBalance: statementData.statementBalance,
        bookBalance,
        difference,
        status: difference === 0 ? 'completed' : 'in_progress',
        reconciledBy: userId,
        reconciledAt: new Date()
    };

    this.updatedBy = userId;
    await this.save();

    return this.currentReconciliation;
};

// Method to complete reconciliation
treasurySchema.methods.completeReconciliation = async function(reconciliationData, userId) {
    if (!this.currentReconciliation) {
        throw new Error('No reconciliation in progress');
    }

    // Add to history
    this.reconciliationHistory.push({
        ...this.currentReconciliation.toObject(),
        ...reconciliationData,
        completedAt: new Date()
    });

    // Update bank account
    if (reconciliationData.adjustments) {
        const account = this.bankAccounts.id(reconciliationData.accountId);
        if (account) {
            for (const adj of reconciliationData.adjustments) {
                if (adj.type === 'bank_charge' || adj.type === 'correction') {
                    account.currentBalance += adj.amount;
                    account.availableBalance += adj.amount;
                }
            }
            account.lastReconciledDate = new Date();
            account.lastReconciledBalance = this.currentReconciliation.statementBalance;
        }
    }

    this.currentReconciliation = null;
    this.updatedBy = userId;
    await this.save();

    return this.reconciliationHistory[this.reconciliationHistory.length - 1];
};

// Method to calculate liquidity ratios
treasurySchema.methods.calculateLiquidity = async function() {
    // This would typically query current assets and liabilities
    // For now, use mock calculations
    const currentAssets = this.totalCash * 2; // Mock value
    const currentLiabilities = this.totalCash * 1.2; // Mock value
    const inventory = this.totalCash * 0.3; // Mock value

    this.liquidity = {
        current: currentAssets / currentLiabilities,
        quick: (currentAssets - inventory) / currentLiabilities,
        cash: this.totalCash / currentLiabilities,
        lastCalculated: new Date()
    };

    await this.save();
    return this.liquidity;
};

// Static method to get organizations with low liquidity
treasurySchema.statics.getLowLiquidity = async function(threshold = 1.2) {
    await this.updateMany({}, { $set: { 'liquidity.current': 0 } }); // Reset
    
    const treasuries = await this.find({
        'liquidity.current': { $lt: threshold }
    }).populate('organization');

    return treasuries;
};

module.exports = mongoose.model('Treasury', treasurySchema);