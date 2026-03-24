// src/models/invoice.model.js
const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
    description: {
        type: String,
        required: [true, 'Item description is required'],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative']
    },
    unitPrice: {
        type: Number,
        required: [true, 'Unit price is required'],
        min: [0, 'Unit price cannot be negative']
    },
    taxRate: {
        type: Number,
        default: 0,
        min: [0, 'Tax rate cannot be negative'],
        max: [100, 'Tax rate cannot exceed 100%']
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative']
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount cannot be negative']
    },
    taxAmount: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    }
});

const paymentSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Payment amount cannot be negative']
    },
    method: {
        type: String,
        enum: ['cash', 'bank_transfer', 'credit_card', 'debit_card', 'check', 'mobile_money'],
        required: true
    },
    reference: {
        type: String,
        trim: true
    },
    notes: String,
    receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

const invoiceSchema = new mongoose.Schema({
    // Organization (multi-tenant)
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    
    // Invoice Identity
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    invoiceType: {
        type: String,
        enum: ['sales', 'purchase', 'credit_note', 'debit_note'],
        required: true,
        default: 'sales'
    },
    
    // Parties
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
    },
    customerName: String,
    customerEmail: String,
    customerAddress: String,
    customerTaxId: String,
    
    // Dates
    issueDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true
    },
    deliveryDate: Date,
    
    // Financial
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    exchangeRate: {
        type: Number,
        default: 1
    },
    
    // Items
    items: [invoiceItemSchema],
    
    // Totals
    subtotal: {
        type: Number,
        required: true,
        default: 0
    },
    taxTotal: {
        type: Number,
        default: 0
    },
    discountTotal: {
        type: Number,
        default: 0
    },
    shippingCost: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    amountDue: {
        type: Number,
        required: true
    },
    
    // Payments
    payments: [paymentSchema],
    paymentStatus: {
        type: String,
        enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
        default: 'pending'
    },
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'sent', 'approved', 'rejected', 'paid', 'cancelled'],
        default: 'draft'
    },
    
    // Approvals
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    notes: String,
    terms: String,
    
    // Soft delete
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date,
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
invoiceSchema.index({ organization: 1, invoiceNumber: 1 });
invoiceSchema.index({ organization: 1, customer: 1 });
invoiceSchema.index({ organization: 1, issueDate: 1 });
invoiceSchema.index({ organization: 1, dueDate: 1 });
invoiceSchema.index({ organization: 1, paymentStatus: 1 });
invoiceSchema.index({ organization: 1, status: 1 });

// Calculate totals before saving
invoiceSchema.pre('save', function(next) {
    // Calculate item amounts
    this.items.forEach(item => {
        item.amount = item.quantity * item.unitPrice;
        item.taxAmount = item.amount * (item.taxRate / 100);
        item.totalAmount = item.amount + item.taxAmount - item.discount;
    });
    
    // Calculate invoice totals
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
    this.taxTotal = this.items.reduce((sum, item) => sum + item.taxAmount, 0);
    this.discountTotal = this.items.reduce((sum, item) => sum + item.discount, 0);
    this.totalAmount = this.subtotal + this.taxTotal + this.shippingCost - this.discountTotal;
    
    // Calculate amount due
    this.amountDue = this.totalAmount - this.amountPaid;
    
    // Update payment status
    if (this.amountDue === 0) {
        this.paymentStatus = 'paid';
    } else if (this.amountPaid > 0) {
        this.paymentStatus = 'partial';
    } else if (new Date() > this.dueDate) {
        this.paymentStatus = 'overdue';
    }
    
    next();
});

// Virtual for age of invoice
invoiceSchema.virtual('ageInDays').get(function() {
    return Math.floor((new Date() - this.issueDate) / (1000 * 60 * 60 * 24));
});

// Virtual for overdue days
invoiceSchema.virtual('overdueDays').get(function() {
    if (this.paymentStatus === 'paid') return 0;
    const today = new Date();
    if (today > this.dueDate) {
        return Math.floor((today - this.dueDate) / (1000 * 60 * 60 * 24));
    }
    return 0;
});

module.exports = mongoose.model('Invoice', invoiceSchema);