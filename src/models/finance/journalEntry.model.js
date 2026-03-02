// src/models/finance/journalEntry.model.js
const mongoose = require('mongoose');

const journalLineSchema = new mongoose.Schema({
    lineNumber: {
        type: Number,
        required: true
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Account is required']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    debit: {
        type: Number,
        default: 0,
        min: [0, 'Debit cannot be negative']
    },
    credit: {
        type: Number,
        default: 0,
        min: [0, 'Credit cannot be negative']
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    exchangeRate: {
        type: Number,
        default: 1,
        min: [0.0001, 'Exchange rate must be positive']
    },
    dimension1: String,
    dimension2: String,
    dimension3: String,
    reference: String,
    notes: String
}, { _id: true });

const journalEntrySchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Journal Identity
    journalNumber: {
        type: String,
        required: [true, 'Journal number is required'],
        unique: true,
        trim: true
    },
    journalType: {
        type: String,
        required: [true, 'Journal type is required'],
        enum: [
            'general', 'sales', 'purchase', 'cash_receipt', 
            'cash_disbursement', 'payroll', 'adjusting', 'closing',
            'reversing', 'opening', 'transfer', 'depreciation',
            'accrual', 'prepayment', 'amortization', 'other'
        ],
        default: 'general',
        index: true
    },
    
    // Reference (link to source document)
    referenceType: {
        type: String,
        enum: ['invoice', 'payment', 'purchase', 'expense', 'deposit', 'transfer', 'other']
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'referenceType'
    },
    referenceNumber: String,
    
    // Dates
    date: {
        type: Date,
        required: [true, 'Journal entry date is required'],
        default: Date.now,
        index: true
    },
    postingDate: Date,
    fiscalYear: {
        type: Number,
        required: true
    },
    fiscalPeriod: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    fiscalQuarter: {
        type: Number,
        min: 1,
        max: 4
    },
    
    // Lines
    lines: [journalLineSchema],
    
    // Totals
    totalDebit: {
        type: Number,
        required: true,
        default: 0
    },
    totalCredit: {
        type: Number,
        required: true,
        default: 0
    },
    
    // Status
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: ['draft', 'posted', 'reversed', 'void'],
        default: 'draft',
        index: true
    },
    postedAt: Date,
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Reversal (for correcting entries)
    reversedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JournalEntry'
    },
    reversedAt: Date,
    reversalReason: String,
    reversalEntry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JournalEntry'
    },
    
    // Description
    description: {
        type: String,
        required: [true, 'Journal entry description is required'],
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
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
    
    // Audit Trail
    auditTrail: [{
        action: {
            type: String,
            enum: ['created', 'updated', 'posted', 'reversed', 'voided']
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        changes: mongoose.Schema.Types.Mixed,
        ipAddress: String,
        userAgent: String
    }],
    
    // Tags
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
journalEntrySchema.index({ organization: 1, journalNumber: 1 }, { unique: true });
journalEntrySchema.index({ organization: 1, date: 1 });
journalEntrySchema.index({ organization: 1, fiscalYear: 1, fiscalPeriod: 1 });
journalEntrySchema.index({ organization: 1, status: 1 });
journalEntrySchema.index({ organization: 1, referenceType: 1, referenceId: 1 });
journalEntrySchema.index({ 'lines.account': 1 });

// Validate that debits equal credits before saving
journalEntrySchema.pre('save', function(next) {
    // Set line numbers
    this.lines.forEach((line, index) => {
        line.lineNumber = index + 1;
    });
    
    // Calculate totals
    this.totalDebit = this.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    this.totalCredit = this.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    
    // Validate that debits equal credits
    if (Math.abs(this.totalDebit - this.totalCredit) > 0.01) {
        next(new Error('Journal entry must have equal debits and credits'));
    }
    
    // Validate that each line has either debit or credit, not both
    for (const line of this.lines) {
        if (line.debit > 0 && line.credit > 0) {
            next(new Error('A journal line cannot have both debit and credit'));
        }
        if (line.debit === 0 && line.credit === 0) {
            next(new Error('A journal line must have either debit or credit'));
        }
    }
    
    next();
});

// Set fiscal year and period before saving
journalEntrySchema.pre('save', function(next) {
    const date = this.date || new Date();
    this.fiscalYear = date.getFullYear();
    this.fiscalPeriod = date.getMonth() + 1; // 1-12
    this.fiscalQuarter = Math.floor(date.getMonth() / 3) + 1;
    next();
});

// Virtual to check if entry is balanced
journalEntrySchema.virtual('isBalanced').get(function() {
    return Math.abs(this.totalDebit - this.totalCredit) < 0.01;
});

// Virtual for line count
journalEntrySchema.virtual('lineCount').get(function() {
    return this.lines?.length || 0;
});

// Method to post the entry
journalEntrySchema.methods.post = async function(userId) {
    if (this.status !== 'draft') {
        throw new Error('Only draft entries can be posted');
    }
    
    this.status = 'posted';
    this.postedAt = new Date();
    this.postedBy = userId;
    
    // Add to audit trail
    this.auditTrail.push({
        action: 'posted',
        user: userId,
        timestamp: new Date()
    });
    
    return this.save();
};

// Method to reverse the entry
journalEntrySchema.methods.reverse = async function(userId, reason) {
    if (this.status !== 'posted') {
        throw new Error('Only posted entries can be reversed');
    }
    
    // Create reversal entry
    const reversalLines = this.lines.map(line => ({
        account: line.account,
        description: `Reversal: ${line.description || this.description}`,
        debit: line.credit,
        credit: line.debit,
        currency: line.currency,
        exchangeRate: line.exchangeRate,
        dimension1: line.dimension1,
        dimension2: line.dimension2,
        dimension3: line.dimension3,
        reference: line.reference
    }));
    
    const JournalEntry = mongoose.model('JournalEntry');
    const reversal = new JournalEntry({
        organization: this.organization,
        journalType: 'reversing',
        date: new Date(),
        lines: reversalLines,
        description: `Reversal of ${this.journalNumber}: ${reason}`,
        reversedFrom: this._id,
        createdBy: userId,
        status: 'posted',
        postedAt: new Date(),
        postedBy: userId,
        referenceType: this.referenceType,
        referenceId: this.referenceId,
        referenceNumber: this.referenceNumber
    });
    
    await reversal.save();
    
    // Mark original as reversed
    this.status = 'reversed';
    this.reversedAt = new Date();
    this.reversalReason = reason;
    this.reversalEntry = reversal._id;
    
    // Add to audit trail
    this.auditTrail.push({
        action: 'reversed',
        user: userId,
        timestamp: new Date(),
        changes: { reason }
    });
    
    await this.save();
    
    return reversal;
};

// Method to void entry (only for drafts)
journalEntrySchema.methods.void = async function(userId, reason) {
    if (this.status !== 'draft') {
        throw new Error('Only draft entries can be voided');
    }
    
    this.status = 'void';
    this.notes = `VOIDED: ${reason || 'No reason provided'}\n${this.notes || ''}`;
    
    // Add to audit trail
    this.auditTrail.push({
        action: 'voided',
        user: userId,
        timestamp: new Date(),
        changes: { reason }
    });
    
    return this.save();
};

// Method to add audit entry
journalEntrySchema.methods.addAuditEntry = function(action, userId, changes = null, req = null) {
    this.auditTrail.push({
        action,
        user: userId,
        timestamp: new Date(),
        changes,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent')
    });
};

// Static method to get entries by account
journalEntrySchema.statics.getEntriesByAccount = async function(organizationId, accountId, startDate, endDate) {
    const match = {
        organization: organizationId,
        status: 'posted',
        'lines.account': mongoose.Types.ObjectId(accountId)
    };
    
    if (startDate || endDate) {
        match.date = {};
        if (startDate) match.date.$gte = startDate;
        if (endDate) match.date.$lte = endDate;
    }
    
    return this.aggregate([
        { $match: match },
        { $unwind: '$lines' },
        { $match: { 'lines.account': mongoose.Types.ObjectId(accountId) } },
        {
            $project: {
                date: 1,
                journalNumber: 1,
                description: 1,
                lineDescription: '$lines.description',
                debit: '$lines.debit',
                credit: '$lines.credit',
                reference: '$lines.reference'
            }
        },
        { $sort: { date: 1 } }
    ]);
};

// Static method to get trial balance by period
journalEntrySchema.statics.getTrialBalanceByPeriod = async function(organizationId, fiscalYear, fiscalPeriod) {
    const Account = mongoose.model('Account');
    
    const accounts = await Account.find({ 
        organization: organizationId,
        isActive: true 
    }).sort('code');
    
    const match = {
        organization: organizationId,
        status: 'posted',
        fiscalYear,
        fiscalPeriod
    };
    
    const entries = await this.aggregate([
        { $match: match },
        { $unwind: '$lines' },
        {
            $group: {
                _id: '$lines.account',
                totalDebit: { $sum: '$lines.debit' },
                totalCredit: { $sum: '$lines.credit' }
            }
        }
    ]);
    
    const entryMap = {};
    entries.forEach(e => {
        entryMap[e._id] = e;
    });
    
    const trialBalance = [];
    let totalDebit = 0;
    let totalCredit = 0;
    
    for (const account of accounts) {
        const entry = entryMap[account._id] || { totalDebit: 0, totalCredit: 0 };
        const balance = account.normalBalance === 'debit' 
            ? entry.totalDebit - entry.totalCredit 
            : entry.totalCredit - entry.totalDebit;
        
        trialBalance.push({
            account: {
                _id: account._id,
                code: account.code,
                name: account.name,
                type: account.type,
                normalBalance: account.normalBalance
            },
            debit: entry.totalDebit,
            credit: entry.totalCredit,
            balance
        });
        
        totalDebit += entry.totalDebit;
        totalCredit += entry.totalCredit;
    }
    
    return {
        fiscalYear,
        fiscalPeriod,
        accounts: trialBalance,
        totals: { debit: totalDebit, credit: totalCredit }
    };
};

module.exports = mongoose.model('JournalEntry', journalEntrySchema);