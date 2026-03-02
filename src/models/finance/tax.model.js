// src/models/finance/tax.model.js
const mongoose = require('mongoose');

const taxRateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tax rate name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Tax code is required'],
        uppercase: true,
        trim: true
    },
    rate: {
        type: Number,
        required: [true, 'Tax rate percentage is required'],
        min: [0, 'Tax rate cannot be negative'],
        max: [100, 'Tax rate cannot exceed 100%']
    },
    type: {
        type: String,
        required: [true, 'Tax type is required'],
        enum: [
            'vat', 'gst', 'sales_tax', 'income_tax', 
            'withholding', 'customs', 'excise', 'property_tax'
        ]
    },
    jurisdiction: {
        country: {
            type: String,
            required: [true, 'Country is required'],
            uppercase: true
        },
        state: String,
        city: String,
        region: String
    },
    isCompound: {
        type: Boolean,
        default: false
    },
    isRecoverable: {
        type: Boolean,
        default: true
    },
    appliesTo: [{
        type: String,
        enum: ['sales', 'purchases', 'both']
    }],
    effectiveFrom: {
        type: Date,
        required: [true, 'Effective from date is required']
    },
    effectiveTo: Date,
    isActive: {
        type: Boolean,
        default: true
    }
});

const taxReturnSchema = new mongoose.Schema({
    returnNumber: {
        type: String,
        required: [true, 'Return number is required'],
        unique: true
    },
    type: {
        type: String,
        required: [true, 'Return type is required'],
        enum: ['vat', 'gst', 'sales_tax', 'income_tax', 'payroll_tax']
    },
    period: {
        type: String,
        required: [true, 'Period is required'],
        enum: ['monthly', 'quarterly', 'annual']
    },
    periodStart: {
        type: Date,
        required: [true, 'Period start date is required']
    },
    periodEnd: {
        type: Date,
        required: [true, 'Period end date is required']
    },
    dueDate: {
        type: Date,
        required: [true, 'Due date is required']
    },
    filingDate: Date,
    status: {
        type: String,
        enum: ['draft', 'pending', 'filed', 'amended', 'late', 'paid'],
        default: 'draft'
    },
    taxAmount: {
        type: Number,
        required: [true, 'Tax amount is required'],
        min: [0, 'Tax amount cannot be negative']
    },
    penalties: {
        type: Number,
        default: 0,
        min: [0, 'Penalties cannot be negative']
    },
    interest: {
        type: Number,
        default: 0,
        min: [0, 'Interest cannot be negative']
    },
    totalAmount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    exchangeRate: {
        type: Number,
        default: 1
    },
    transactions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    }],
    attachments: [{
        filename: String,
        url: String,
        type: String,
        size: Number,
        uploadedAt: Date
    }],
    notes: String,
    filedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    metadata: {
        filingMethod: {
            type: String,
            enum: ['online', 'paper', 'eft']
        },
        confirmationNumber: String,
        paymentReference: String
    }
}, { timestamps: true });

const taxSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Tax Registration
    taxId: {
        type: String,
        required: [true, 'Tax ID is required'],
        trim: true,
        unique: true
    },
    legalName: {
        type: String,
        required: [true, 'Legal name is required'],
        trim: true
    },
    tradingName: String,
    
    // Tax Authority
    authority: {
        name: {
            type: String,
            required: [true, 'Tax authority name is required']
        },
        country: {
            type: String,
            required: [true, 'Country is required'],
            uppercase: true
        },
        region: String,
        contactInfo: {
            phone: String,
            email: String,
            website: String,
            address: String
        },
        filingFrequency: {
            type: String,
            enum: ['monthly', 'quarterly', 'semi-annual', 'annual'],
            required: true
        },
        filingMethod: {
            type: String,
            enum: ['online', 'paper', 'eft']
        }
    },
    
    // Tax Rates
    taxRates: [taxRateSchema],
    
    // Default Tax Rates
    defaultSalesTax: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaxRate'
    },
    defaultPurchaseTax: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaxRate'
    },
    
    // Tax Returns
    taxReturns: [taxReturnSchema],
    
    // Tax Accounts
    accounts: {
        taxPayable: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account',
            required: [true, 'Tax payable account is required']
        },
        taxReceivable: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account',
            required: [true, 'Tax receivable account is required']
        },
        taxExpense: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account'
        },
        taxLiability: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account'
        }
    },
    
    // Tax Periods
    currentPeriod: {
        type: String,
        enum: ['monthly', 'quarterly', 'annual'],
        default: 'monthly'
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    lastFiledPeriod: Date,
    nextFilingDue: Date,
    
    // Tax Settings
    settings: {
        taxBasis: {
            type: String,
            enum: ['cash', 'accrual'],
            default: 'accrual'
        },
        roundingMethod: {
            type: String,
            enum: ['round', 'ceil', 'floor'],
            default: 'round'
        },
        decimalPlaces: {
            type: Number,
            min: 0,
            max: 4,
            default: 2
        },
        includeTaxInPrice: {
            type: Boolean,
            default: false
        },
        separateTaxLine: {
            type: Boolean,
            default: true
        },
        autoCalculate: {
            type: Boolean,
            default: true
        },
        autoFile: {
            type: Boolean,
            default: false
        },
        reminders: {
            enabled: {
                type: Boolean,
                default: true
            },
            daysBeforeDue: {
                type: Number,
                default: 7
            }
        }
    },
    
    // Tax History
    history: [{
        date: Date,
        event: String,
        description: String,
        amount: Number,
        reference: String,
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    
    // Status
    status: {
        type: String,
        enum: ['active', 'suspended', 'closed', 'audit'],
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
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    
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
taxSchema.index({ organization: 1, taxId: 1 }, { unique: true });
taxSchema.index({ organization: 1, 'taxRates.code': 1 });
taxSchema.index({ 'taxReturns.periodStart': 1, 'taxReturns.periodEnd': 1 });
taxSchema.index({ nextFilingDue: 1 });

// Virtual for current tax liability
taxSchema.virtual('currentLiability').get(function() {
    // This would be calculated from tax returns
    return 0;
});

// Virtual for overdue returns
taxSchema.virtual('overdueReturns').get(function() {
    const now = new Date();
    return this.taxReturns?.filter(r => 
        r.status !== 'filed' && 
        r.dueDate < now
    ).length || 0;
});

// Method to get applicable tax rate
taxSchema.methods.getTaxRate = function(amount, type, jurisdiction) {
    const now = new Date();
    const applicableRates = this.taxRates.filter(rate => 
        rate.type === type &&
        rate.isActive &&
        rate.effectiveFrom <= now &&
        (!rate.effectiveTo || rate.effectiveTo >= now) &&
        rate.appliesTo.includes(type === 'vat' ? 'both' : type) &&
        rate.jurisdiction.country === (jurisdiction?.country || this.authority.country) &&
        (!rate.jurisdiction.state || rate.jurisdiction.state === jurisdiction?.state) &&
        (!rate.jurisdiction.city || rate.jurisdiction.city === jurisdiction?.city)
    );

    if (applicableRates.length === 0) {
        return null;
    }

    // Return the highest rate (usually the most specific jurisdiction)
    return applicableRates.sort((a, b) => b.rate - a.rate)[0];
};

// Method to calculate tax
taxSchema.methods.calculateTax = function(amount, rateId) {
    const rate = this.taxRates.id(rateId);
    if (!rate) {
        throw new Error('Tax rate not found');
    }

    let taxAmount = amount * (rate.rate / 100);
    
    // Apply rounding
    switch(this.settings.roundingMethod) {
        case 'ceil':
            taxAmount = Math.ceil(taxAmount * 100) / 100;
            break;
        case 'floor':
            taxAmount = Math.floor(taxAmount * 100) / 100;
            break;
        default:
            taxAmount = Math.round(taxAmount * 100) / 100;
    }
    
    return taxAmount;
};

// Method to create tax return
taxSchema.methods.createTaxReturn = async function(period, startDate, endDate, userId) {
    const returnNumber = `TAX-${this.taxId}-${period}-${startDate.getFullYear()}-${startDate.getMonth() + 1}`;
    
    // Get all taxable transactions for the period
    const Invoice = mongoose.model('Invoice');
    const JournalEntry = mongoose.model('JournalEntry');
    
    const transactions = await Invoice.find({
        organization: this.organization,
        issueDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['approved', 'paid'] }
    });

    let totalTax = 0;
    
    for (const invoice of transactions) {
        for (const item of invoice.items) {
            totalTax += item.taxAmount || 0;
        }
    }

    const taxReturn = {
        returnNumber,
        type: period === 'monthly' ? 'vat' : period === 'quarterly' ? 'gst' : 'annual',
        period,
        periodStart: startDate,
        periodEnd: endDate,
        dueDate: new Date(endDate.getFullYear(), endDate.getMonth() + 1, 15),
        taxAmount: totalTax,
        totalAmount: totalTax,
        transactions: transactions.map(t => t._id),
        createdBy: userId
    };

    this.taxReturns.push(taxReturn);
    this.currentPeriodStart = startDate;
    this.currentPeriodEnd = endDate;
    this.nextFilingDue = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 15);
    
    await this.save();
    
    return taxReturn;
};

// Method to file tax return
taxSchema.methods.fileTaxReturn = async function(returnId, filingData, userId) {
    const taxReturn = this.taxReturns.id(returnId);
    if (!taxReturn) {
        throw new Error('Tax return not found');
    }

    taxReturn.status = 'filed';
    taxReturn.filingDate = new Date();
    taxReturn.filedBy = userId;
    taxReturn.metadata = {
        ...taxReturn.metadata,
        ...filingData
    };

    // Update history
    this.history.push({
        date: new Date(),
        event: 'tax_return_filed',
        description: `Filed tax return for period ${taxReturn.periodStart.toISOString().split('T')[0]} to ${taxReturn.periodEnd.toISOString().split('T')[0]}`,
        amount: taxReturn.totalAmount,
        reference: taxReturn.returnNumber,
        user: userId
    });

    await this.save();
    
    return taxReturn;
};

// Method to get tax summary for period
taxSchema.methods.getTaxSummary = async function(startDate, endDate) {
    const Invoice = mongoose.model('Invoice');
    
    const invoices = await Invoice.find({
        organization: this.organization,
        issueDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['approved', 'paid'] }
    }).populate('items.account');

    const summary = {
        period: { startDate, endDate },
        byRate: {},
        sales: {
            taxable: 0,
            tax: 0,
            exempt: 0
        },
        purchases: {
            taxable: 0,
            tax: 0,
            exempt: 0
        },
        total: {
            taxable: 0,
            tax: 0
        }
    };

    for (const invoice of invoices) {
        const type = invoice.invoiceType === 'sales' ? 'sales' : 'purchases';
        
        for (const item of invoice.items) {
            if (item.taxRate === 0) {
                summary[type].exempt += item.amount;
                continue;
            }

            const rateKey = `${item.taxRate}%`;
            
            if (!summary.byRate[rateKey]) {
                summary.byRate[rateKey] = {
                    rate: item.taxRate,
                    taxable: 0,
                    tax: 0
                };
            }

            summary.byRate[rateKey].taxable += item.amount;
            summary.byRate[rateKey].tax += item.taxAmount;
            
            summary[type].taxable += item.amount;
            summary[type].tax += item.taxAmount;
            
            summary.total.taxable += item.amount;
            summary.total.tax += item.taxAmount;
        }
    }

    return summary;
};

// Static method to get entities with upcoming filings
taxSchema.statics.getUpcomingFilings = async function(days = 30) {
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    return this.find({
        status: 'active',
        nextFilingDue: { $lte: cutoff }
    }).populate('organization');
};

module.exports = mongoose.model('Tax', taxSchema);