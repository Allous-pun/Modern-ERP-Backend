// src/models/finance/invoice.model.js
const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
    lineNumber: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: [true, 'Item description is required'],
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
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
    discountRate: {
        type: Number,
        default: 0,
        min: [0, 'Discount rate cannot be negative'],
        max: [100, 'Discount rate cannot exceed 100%']
    },
    discountAmount: {
        type: Number,
        default: 0,
        min: [0, 'Discount amount cannot be negative']
    },
    taxRate: {
        type: Number,
        default: 0,
        min: [0, 'Tax rate cannot be negative'],
        max: [100, 'Tax rate cannot exceed 100%']
    },
    taxAmount: {
        type: Number,
        default: 0,
        min: [0, 'Tax amount cannot be negative']
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount cannot be negative']
    },
    totalAmount: {
        type: Number,
        required: true,
        min: [0, 'Total amount cannot be negative']
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Account is required']
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    productCode: String,
    productName: String,
    warehouse: String,
    location: String,
    notes: String
}, { _id: true });

const paymentSchema = new mongoose.Schema({
    paymentNumber: {
        type: String,
        required: true,
        unique: true
    },
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
        required: true,
        enum: ['cash', 'bank_transfer', 'credit_card', 'debit_card', 'check', 'mobile_money', 'other']
    },
    reference: {
        type: String,
        trim: true
    },
    bankAccount: String,
    checkNumber: String,
    cardNumber: String,
    cardType: String,
    authorizationCode: String,
    notes: String,
    receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    allocatedTo: [{
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice'
        },
        amount: Number
    }]
}, { _id: true, timestamps: true });

const invoiceSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Invoice Identity
    invoiceNumber: {
        type: String,
        required: [true, 'Invoice number is required'],
        unique: true,
        trim: true
    },
    invoiceType: {
        type: String,
        required: [true, 'Invoice type is required'],
        enum: ['sales', 'purchase', 'credit_note', 'debit_note', 'proforma'],
        default: 'sales',
        index: true
    },
    invoiceStatus: {
        type: String,
        enum: ['draft', 'sent', 'approved', 'rejected', 'paid', 'overdue', 'cancelled', 'void'],
        default: 'draft',
        index: true
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
    customerNumber: String,
    customerName: {
        type: String,
        required: [true, 'Customer/vendor name is required'],
        trim: true
    },
    customerEmail: {
        type: String,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
    },
    customerPhone: String,
    customerAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    customerTaxId: String,
    customerRegistrationNumber: String,
    
    // Dates
    issueDate: {
        type: Date,
        required: [true, 'Issue date is required'],
        default: Date.now,
        index: true
    },
    dueDate: {
        type: Date,
        required: [true, 'Due date is required'],
        index: true
    },
    deliveryDate: Date,
    period: {
        month: Number,
        year: Number,
        quarter: Number
    },
    
    // Financial
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
    
    // Items
    items: [invoiceItemSchema],
    
    // Totals
    subtotal: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Subtotal cannot be negative']
    },
    discountTotal: {
        type: Number,
        default: 0,
        min: [0, 'Discount total cannot be negative']
    },
    taxTotal: {
        type: Number,
        default: 0,
        min: [0, 'Tax total cannot be negative']
    },
    shippingCost: {
        type: Number,
        default: 0,
        min: [0, 'Shipping cost cannot be negative']
    },
    shippingTax: {
        type: Number,
        default: 0,
        min: [0, 'Shipping tax cannot be negative']
    },
    totalAmount: {
        type: Number,
        required: true,
        min: [0, 'Total amount cannot be negative']
    },
    
    // Payments
    payments: [paymentSchema],
    amountPaid: {
        type: Number,
        default: 0,
        min: [0, 'Amount paid cannot be negative']
    },
    amountDue: {
        type: Number,
        required: true,
        min: [0, 'Amount due cannot be negative']
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partial', 'paid', 'overpaid'],
        default: 'unpaid'
    },
    paymentTerms: {
        type: String,
        trim: true
    },
    
    // Shipping
    shippingMethod: String,
    shippingTracking: String,
    shippingDate: Date,
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    terms: {
        type: String,
        trim: true,
        maxlength: [2000, 'Terms cannot exceed 2000 characters']
    },
    internalNotes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Internal notes cannot exceed 2000 characters']
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
    
    // Approvals
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    approvalNotes: String,
    
    // Rejection
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: String,
    
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
    
    // Soft delete
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date,
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Recurring
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual']
    },
    recurringEndDate: Date,
    recurringParentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
invoiceSchema.index({ organization: 1, invoiceNumber: 1 });
invoiceSchema.index({ organization: 1, customer: 1 });
invoiceSchema.index({ organization: 1, vendor: 1 });
invoiceSchema.index({ organization: 1, issueDate: 1 });
invoiceSchema.index({ organization: 1, dueDate: 1 });
invoiceSchema.index({ organization: 1, paymentStatus: 1 });
invoiceSchema.index({ organization: 1, invoiceStatus: 1 });
invoiceSchema.index({ 'period.year': 1, 'period.month': 1 });
invoiceSchema.index({ 'period.year': 1, 'period.quarter': 1 });

// Calculate totals before saving
invoiceSchema.pre('save', function(next) {
    // Calculate item amounts
    this.items.forEach((item, index) => {
        item.lineNumber = index + 1;
        item.amount = item.quantity * item.unitPrice;
        item.discountAmount = item.amount * (item.discountRate / 100);
        const amountAfterDiscount = item.amount - item.discountAmount;
        item.taxAmount = amountAfterDiscount * (item.taxRate / 100);
        item.totalAmount = amountAfterDiscount + item.taxAmount;
    });
    
    // Calculate invoice totals
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
    this.discountTotal = this.items.reduce((sum, item) => sum + item.discountAmount, 0);
    this.taxTotal = this.items.reduce((sum, item) => sum + item.taxAmount, 0) + (this.shippingTax || 0);
    this.totalAmount = this.subtotal - this.discountTotal + this.taxTotal + (this.shippingCost || 0);
    
    // Calculate amount due
    this.amountDue = this.totalAmount - this.amountPaid;
    
    // Update payment status
    if (this.amountDue <= 0) {
        this.paymentStatus = Math.abs(this.amountDue) < 0.01 ? 'paid' : 'overpaid';
    } else if (this.amountPaid > 0) {
        this.paymentStatus = 'partial';
    }
    
    // Set period
    if (this.issueDate) {
        const date = new Date(this.issueDate);
        this.period = {
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            quarter: Math.floor(date.getMonth() / 3) + 1
        };
    }
    
    next();
});

// Virtual for age in days
invoiceSchema.virtual('ageInDays').get(function() {
    return Math.floor((new Date() - this.issueDate) / (1000 * 60 * 60 * 24));
});

// Virtual for overdue days
invoiceSchema.virtual('overdueDays').get(function() {
    if (this.paymentStatus === 'paid' || this.paymentStatus === 'overpaid') return 0;
    const today = new Date();
    if (today > this.dueDate) {
        return Math.floor((today - this.dueDate) / (1000 * 60 * 60 * 24));
    }
    return 0;
});

// Virtual for is overdue
invoiceSchema.virtual('isOverdue').get(function() {
    return this.paymentStatus !== 'paid' && 
           this.paymentStatus !== 'overpaid' && 
           new Date() > this.dueDate;
});

// Method to add payment
invoiceSchema.methods.addPayment = async function(paymentData, userId) {
    const Payment = mongoose.model('Payment');
    
    const payment = await Payment.create({
        ...paymentData,
        organization: this.organization,
        invoice: this._id,
        createdBy: userId
    });
    
    this.payments.push(payment);
    this.amountPaid += payment.amount;
    this.amountDue = this.totalAmount - this.amountPaid;
    
    if (this.amountDue <= 0) {
        this.paymentStatus = 'paid';
        this.invoiceStatus = 'paid';
    } else if (this.amountPaid > 0) {
        this.paymentStatus = 'partial';
    }
    
    await this.save();
    
    return payment;
};

// Method to approve invoice
invoiceSchema.methods.approve = async function(userId, notes) {
    this.invoiceStatus = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
    this.approvalNotes = notes;
    this.updatedBy = userId;
    
    await this.save();
    return this;
};

// Method to reject invoice
invoiceSchema.methods.reject = async function(userId, reason) {
    this.invoiceStatus = 'rejected';
    this.rejectedBy = userId;
    this.rejectedAt = new Date();
    this.rejectionReason = reason;
    this.updatedBy = userId;
    
    await this.save();
    return this;
};

// Method to void invoice
invoiceSchema.methods.void = async function(userId, reason) {
    this.invoiceStatus = 'void';
    this.notes = `VOIDED: ${reason || 'No reason provided'}\n${this.notes || ''}`;
    this.updatedBy = userId;
    
    await this.save();
    return this;
};

// Method to send invoice
invoiceSchema.methods.send = async function(userId, emailData) {
    this.invoiceStatus = 'sent';
    this.updatedBy = userId;
    
    await this.save();
    
    // TODO: Trigger email sending
    return this;
};

// Static method to get overdue invoices
invoiceSchema.statics.getOverdueInvoices = async function(organizationId, asOfDate = new Date()) {
    return this.find({
        organization: organizationId,
        paymentStatus: { $nin: ['paid', 'overpaid'] },
        dueDate: { $lt: asOfDate },
        invoiceStatus: { $nin: ['cancelled', 'void'] },
        isDeleted: { $ne: true }
    }).populate('customer vendor');
};

// Static method to get invoices by period
invoiceSchema.statics.getInvoicesByPeriod = async function(organizationId, year, month) {
    const query = {
        organization: organizationId,
        'period.year': year,
        isDeleted: { $ne: true }
    };
    
    if (month) {
        query['period.month'] = month;
    }
    
    return this.find(query).sort('-issueDate');
};

// Static method to get aging summary
invoiceSchema.statics.getAgingSummary = async function(organizationId, asOfDate = new Date()) {
    const invoices = await this.find({
        organization: organizationId,
        paymentStatus: { $nin: ['paid', 'overpaid'] },
        invoiceStatus: { $nin: ['cancelled', 'void'] },
        isDeleted: { $ne: true }
    });

    const aging = {
        current: { count: 0, amount: 0 },
        days1to30: { count: 0, amount: 0 },
        days31to60: { count: 0, amount: 0 },
        days61to90: { count: 0, amount: 0 },
        over90: { count: 0, amount: 0 },
        total: { count: invoices.length, amount: 0 }
    };

    for (const invoice of invoices) {
        const daysOverdue = Math.max(0, Math.floor((asOfDate - invoice.dueDate) / (1000 * 60 * 60 * 24)));
        const amount = invoice.amountDue;
        
        aging.total.amount += amount;
        
        if (daysOverdue <= 0) {
            aging.current.count++;
            aging.current.amount += amount;
        } else if (daysOverdue <= 30) {
            aging.days1to30.count++;
            aging.days1to30.amount += amount;
        } else if (daysOverdue <= 60) {
            aging.days31to60.count++;
            aging.days31to60.amount += amount;
        } else if (daysOverdue <= 90) {
            aging.days61to90.count++;
            aging.days61to90.amount += amount;
        } else {
            aging.over90.count++;
            aging.over90.amount += amount;
        }
    }

    return aging;
};

module.exports = mongoose.model('Invoice', invoiceSchema);