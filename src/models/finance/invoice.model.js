// src/models/finance/invoice.model.js
const mongoose = require('mongoose');

const invoiceLineItemSchema = new mongoose.Schema({
    description: {
        type: String,
        required: [true, 'Line item description is required'],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: 0,
        default: 1
    },
    unitPrice: {
        type: Number,
        required: [true, 'Unit price is required'],
        min: 0
    },
    amount: {
        type: Number,
        default: 0
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Account is required']
    },
    taxRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    taxAmount: {
        type: Number,
        default: 0
    }
}, { _id: true });

const invoiceSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    invoiceNumber: {
        type: String,
        required: [true, 'Invoice number is required'],
        trim: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['purchase', 'sales'],
        required: [true, 'Invoice type is required'],
        index: true,
        default: 'purchase'
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: [true, 'Due date is required']
    },
    
    partyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Party ID is required'],
        refPath: 'partyModel'
    },
    partyModel: {
        type: String,
        required: [true, 'Party model is required'],
        enum: ['OrganizationMember', 'Vendor', 'Customer']
    },
    partyName: {
        type: String,
        required: [true, 'Party name is required'],
        trim: true
    },
    partyEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    partyPhone: {
        type: String,
        trim: true
    },
    partyAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    
    lineItems: [invoiceLineItemSchema],
    subtotal: {
        type: Number,
        default: 0
    },
    taxTotal: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'fixed'
    },
    shipping: {
        type: Number,
        default: 0,
        min: 0
    },
    total: {
        type: Number,
        default: 0
    },
    
    status: {
        type: String,
        enum: ['draft', 'sent', 'approved', 'partially_paid', 'paid', 'overdue', 'cancelled'],
        default: 'draft',
        index: true
    },
    paidAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    remainingAmount: {
        type: Number,
        default: 0
    },
    paidAt: Date,
    
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    approvedAt: Date,
    
    notes: {
        type: String,
        trim: true
    },
    terms: {
        type: String,
        trim: true
    },
    
    journalEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JournalEntry'
    },
    
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
invoiceSchema.index({ organization: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ organization: 1, type: 1, status: 1 });
invoiceSchema.index({ organization: 1, partyId: 1, partyModel: 1 });
invoiceSchema.index({ organization: 1, dueDate: 1 });
invoiceSchema.index({ organization: 1, status: 1, dueDate: 1 });

// Pre-save middleware without next
invoiceSchema.pre('save', function() {
    let subtotal = 0;
    let taxTotal = 0;
    
    for (const item of this.lineItems) {
        item.amount = item.quantity * item.unitPrice;
        item.taxAmount = item.amount * (item.taxRate / 100);
        subtotal += item.amount;
        taxTotal += item.taxAmount;
    }
    
    this.subtotal = subtotal;
    this.taxTotal = taxTotal;
    
    let total = subtotal + taxTotal + (this.shipping || 0);
    
    if (this.discount > 0) {
        if (this.discountType === 'percentage') {
            total = total * (1 - this.discount / 100);
        } else {
            total = total - this.discount;
        }
    }
    
    this.total = Math.max(0, total);
    this.remainingAmount = this.total - (this.paidAmount || 0);
    
    if (this.status !== 'cancelled' && this.remainingAmount <= 0 && this.total > 0) {
        this.status = 'paid';
        this.paidAt = this.paidAt || new Date();
    } else if (this.remainingAmount > 0 && this.remainingAmount < this.total) {
        this.status = 'partially_paid';
    }
});

// Virtual for days overdue
invoiceSchema.virtual('daysOverdue').get(function() {
    if (this.status !== 'paid' && this.status !== 'cancelled' && this.dueDate < new Date()) {
        const diffTime = Math.abs(new Date() - this.dueDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
});

invoiceSchema.virtual('isOverdue').get(function() {
    return this.daysOverdue > 0;
});

// Method to record payment
invoiceSchema.methods.recordPayment = async function(amount, session) {
    this.paidAmount = (this.paidAmount || 0) + amount;
    this.remainingAmount = this.total - this.paidAmount;
    
    if (this.remainingAmount <= 0) {
        this.status = 'paid';
        this.paidAt = new Date();
    } else if (this.paidAmount > 0) {
        this.status = 'partially_paid';
    }
    
    return this.save({ session });
};

// Static method to generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function(organizationId, type) {
    const prefix = type === 'purchase' ? 'PO' : 'SI';
    const currentYear = new Date().getFullYear();
    const prefixWithYear = `${prefix}-${currentYear}`;
    
    const lastInvoice = await this.findOne({
        organization: organizationId,
        invoiceNumber: { $regex: `^${prefixWithYear}` }
    }).sort({ invoiceNumber: -1 });
    
    let nextNumber = 1;
    if (lastInvoice) {
        const parts = lastInvoice.invoiceNumber.split('-');
        const lastNumber = parseInt(parts[parts.length - 1]);
        nextNumber = lastNumber + 1;
    }
    
    return `${prefixWithYear}-${nextNumber.toString().padStart(4, '0')}`;
};

// Static method to get aging summary
invoiceSchema.statics.getAgingSummary = async function(organizationId) {
    const aging = {
        current: 0,
        days1_30: 0,
        days31_60: 0,
        days61_90: 0,
        days91_plus: 0,
        total: 0
    };
    
    const invoices = await this.find({
        organization: organizationId,
        type: 'purchase',
        status: { $in: ['approved', 'partially_paid'] }
    });
    
    for (const invoice of invoices) {
        const daysOverdue = invoice.daysOverdue;
        const amount = invoice.remainingAmount;
        
        aging.total += amount;
        
        if (daysOverdue === 0) {
            aging.current += amount;
        } else if (daysOverdue <= 30) {
            aging.days1_30 += amount;
        } else if (daysOverdue <= 60) {
            aging.days31_60 += amount;
        } else if (daysOverdue <= 90) {
            aging.days61_90 += amount;
        } else {
            aging.days91_plus += amount;
        }
    }
    
    return aging;
};

module.exports = mongoose.model('Invoice', invoiceSchema);
