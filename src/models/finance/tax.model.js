// src/models/finance/tax.model.js
const mongoose = require('mongoose');

const taxRateSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Tax Identification
    name: {
        type: String,
        required: [true, 'Tax name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Tax code is required'],
        trim: true,
        uppercase: true
    },
    type: {
        type: String,
        enum: ['vat', 'gst', 'income_tax', 'withholding_tax', 'excise', 'customs'],
        required: [true, 'Tax type is required']
    },
    
    // Tax Rate
    rate: {
        type: Number,
        required: [true, 'Tax rate is required'],
        min: 0,
        max: 100
    },
    
    // Applicability
    appliesTo: {
        type: [String],
        enum: ['sales', 'purchases', 'both'],
        default: ['both']
    },
    isCompound: {
        type: Boolean,
        default: false,
        description: 'Whether this tax is applied on top of other taxes'
    },
    
    // Thresholds
    threshold: {
        amount: {
            type: Number,
            default: 0
        },
        isExclusive: {
            type: Boolean,
            default: false
        }
    },
    
    // Account Mapping
    taxPayableAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Tax payable account is required']
    },
    taxExpenseAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    effectiveFrom: {
        type: Date,
        required: [true, 'Effective from date is required'],
        default: Date.now
    },
    effectiveTo: {
        type: Date
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
taxRateSchema.index({ organization: 1, code: 1 }, { unique: true });
taxRateSchema.index({ organization: 1, type: 1 });
taxRateSchema.index({ organization: 1, isActive: 1 });
taxRateSchema.index({ organization: 1, effectiveFrom: -1 });

// Virtual for is currently effective
taxRateSchema.virtual('isEffective').get(function() {
    const now = new Date();
    return this.isActive && 
           this.effectiveFrom <= now && 
           (!this.effectiveTo || this.effectiveTo >= now);
});

// Method to calculate tax amount
taxRateSchema.methods.calculateTax = function(amount) {
    if (!this.isEffective) return 0;
    return amount * (this.rate / 100);
};

const taxReturnSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Return Identification
    returnNumber: {
        type: String,
        required: [true, 'Return number is required'],
        trim: true,
        unique: true
    },
    taxType: {
        type: String,
        enum: ['vat', 'gst', 'income_tax', 'withholding_tax'],
        required: [true, 'Tax type is required']
    },
    
    // Period
    periodStart: {
        type: Date,
        required: [true, 'Period start is required']
    },
    periodEnd: {
        type: Date,
        required: [true, 'Period end is required']
    },
    filingDate: {
        type: Date,
        required: [true, 'Filing date is required']
    },
    
    // Calculations
    taxableSales: {
        type: Number,
        default: 0
    },
    taxCollected: {
        type: Number,
        default: 0
    },
    taxablePurchases: {
        type: Number,
        default: 0
    },
    taxPaid: {
        type: Number,
        default: 0
    },
    netTaxPayable: {
        type: Number,
        default: 0
    },
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'submitted', 'filed', 'paid', 'audited'],
        default: 'draft'
    },
    
    // Payments
    paymentAmount: {
        type: Number,
        default: 0
    },
    paymentDate: Date,
    paymentReference: String,
    
    // Notes
    notes: String,
    
    // Audit
    filedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    filedAt: Date,
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
    timestamps: true
});

// Indexes
taxReturnSchema.index({ organization: 1, returnNumber: 1 }, { unique: true });
taxReturnSchema.index({ organization: 1, taxType: 1, periodStart: -1, periodEnd: -1 });

// Static method to generate return number
taxReturnSchema.statics.generateReturnNumber = async function(organizationId, taxType) {
    const prefix = taxType === 'vat' ? 'VAT' : taxType === 'gst' ? 'GST' : 'TAX';
    const currentYear = new Date().getFullYear();
    const prefixWithYear = `${prefix}-${currentYear}`;
    
    const lastReturn = await this.findOne({
        organization: organizationId,
        returnNumber: { $regex: `^${prefixWithYear}` }
    }).sort({ returnNumber: -1 });
    
    let nextNumber = 1;
    if (lastReturn) {
        const parts = lastReturn.returnNumber.split('-');
        const lastNumber = parseInt(parts[parts.length - 1]);
        nextNumber = lastNumber + 1;
    }
    
    return `${prefixWithYear}-${nextNumber.toString().padStart(4, '0')}`;
};

module.exports = {
    TaxRate: mongoose.model('TaxRate', taxRateSchema),
    TaxReturn: mongoose.model('TaxReturn', taxReturnSchema)
};
