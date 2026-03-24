// src/models/finance/journalEntry.model.js
const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Journal Identification
    journalNumber: {
        type: String,
        required: [true, 'Journal number is required'],
        trim: true,
        unique: true
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
        default: Date.now
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    reference: {
        type: String,
        trim: true,
        maxlength: [100, 'Reference cannot exceed 100 characters']
    },
    
    // Journal Entries (debits and credits)
    entries: [{
        account: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account',
            required: [true, 'Account is required']
        },
        debit: {
            type: Number,
            default: 0,
            min: 0
        },
        credit: {
            type: Number,
            default: 0,
            min: 0
        },
        description: {
            type: String,
            trim: true,
            maxlength: [200, 'Entry description cannot exceed 200 characters']
        }
    }],
    
    // Totals
    totalDebit: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    totalCredit: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'approved', 'posted', 'reversed', 'void'],
        default: 'draft',
        index: true
    },
    
    // Approval
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    approvedAt: Date,
    
    // Posting
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    postedAt: Date,
    
    // Reversal
    reversedEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JournalEntry'
    },
    reversalReason: {
        type: String,
        trim: true,
        maxlength: [500, 'Reversal reason cannot exceed 500 characters']
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
journalEntrySchema.index({ organization: 1, journalNumber: 1 }, { unique: true });
journalEntrySchema.index({ organization: 1, date: -1 });
journalEntrySchema.index({ organization: 1, status: 1 });
journalEntrySchema.index({ organization: 1, 'entries.account': 1 });

// Validate before save
journalEntrySchema.pre('save', function() {
    // Calculate totals
    let totalDebit = 0;
    let totalCredit = 0;
    
    for (const entry of this.entries) {
        totalDebit += entry.debit || 0;
        totalCredit += entry.credit || 0;
    }
    
    this.totalDebit = totalDebit;
    this.totalCredit = totalCredit;
    
    // Validate debits = credits
    if (totalDebit !== totalCredit) {
        throw new Error('Total debits must equal total credits');
    }
});

// Virtual for entry count
journalEntrySchema.virtual('entryCount').get(function() {
    return this.entries?.length || 0;
});

// Method to check if entry can be approved
journalEntrySchema.methods.canApprove = function() {
    return this.status === 'draft';
};

// Method to check if entry can be posted
journalEntrySchema.methods.canPost = function() {
    return this.status === 'approved';
};

// Method to check if entry can be reversed
journalEntrySchema.methods.canReverse = function() {
    return this.status === 'posted';
};

// Method to approve entry
journalEntrySchema.methods.approve = function(userId) {
    if (!this.canApprove()) {
        throw new Error(`Cannot approve entry with status: ${this.status}`);
    }
    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
    return this;
};

// Method to post entry
journalEntrySchema.methods.post = function(userId) {
    if (!this.canPost()) {
        throw new Error(`Cannot post entry with status: ${this.status}`);
    }
    this.status = 'posted';
    this.postedBy = userId;
    this.postedAt = new Date();
    return this;
};

// Static method to get journal statistics
journalEntrySchema.statics.getStatistics = async function(organizationId, startDate, endDate) {
    const match = {
        organization: organizationId,
        status: 'posted'
    };
    
    if (startDate || endDate) {
        match.date = {};
        if (startDate) match.date.$gte = new Date(startDate);
        if (endDate) match.date.$lte = new Date(endDate);
    }
    
    const stats = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalEntries: { $sum: 1 },
                totalDebit: { $sum: '$totalDebit' },
                totalCredit: { $sum: '$totalCredit' }
            }
        }
    ]);
    
    return stats[0] || { totalEntries: 0, totalDebit: 0, totalCredit: 0 };
};

// Static method to generate journal number
journalEntrySchema.statics.generateJournalNumber = async function(organizationId) {
    const currentYear = new Date().getFullYear();
    const prefix = `JE-${currentYear}`;
    
    const lastEntry = await this.findOne({
        organization: organizationId,
        journalNumber: { $regex: `^${prefix}` }
    }).sort({ journalNumber: -1 });
    
    let nextNumber = 1;
    if (lastEntry) {
        const parts = lastEntry.journalNumber.split('-');
        const lastNumber = parseInt(parts[parts.length - 1]);
        nextNumber = lastNumber + 1;
    }
    
    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
};

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
