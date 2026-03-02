// src/models/finance/payment.model.js
const mongoose = require('mongoose');

const paymentAllocationSchema = new mongoose.Schema({
    invoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Allocation amount cannot be negative']
    },
    invoiceNumber: String,
    invoiceDate: Date,
    dueDate: Date
}, { _id: true });

const paymentSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Payment Identity
    paymentNumber: {
        type: String,
        required: [true, 'Payment number is required'],
        unique: true,
        trim: true
    },
    paymentType: {
        type: String,
        required: [true, 'Payment type is required'],
        enum: ['receipt', 'payment', 'refund', 'deposit'],
        default: 'payment',
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
    partyName: {
        type: String,
        required: [true, 'Party name is required'],
        trim: true
    },
    partyEmail: String,
    
    // Dates
    paymentDate: {
        type: Date,
        required: [true, 'Payment date is required'],
        default: Date.now,
        index: true
    },
    postedDate: Date,
    
    // Financial
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
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
    
    // Payment Method
    method: {
        type: String,
        required: [true, 'Payment method is required'],
        enum: [
            'cash', 'bank_transfer', 'credit_card', 'debit_card', 
            'check', 'mobile_money', 'bank_draft', 'other'
        ],
        index: true
    },
    
    // Bank/Card Details
    bankAccount: String,
    bankName: String,
    checkNumber: String,
    checkDate: Date,
    cardNumber: String,
    cardType: {
        type: String,
        enum: ['visa', 'mastercard', 'amex', 'discover', 'other']
    },
    authorizationCode: String,
    transactionId: String,
    
    // Allocations
    allocations: [paymentAllocationSchema],
    unallocatedAmount: {
        type: Number,
        default: 0,
        min: [0, 'Unallocated amount cannot be negative']
    },
    
    // Status
    status: {
        type: String,
        required: [true, 'Payment status is required'],
        enum: ['draft', 'pending', 'approved', 'cleared', 'rejected', 'void'],
        default: 'draft',
        index: true
    },
    
    // Approvals
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    
    // Bank Reconciliation
    reconciled: {
        type: Boolean,
        default: false
    },
    reconciledDate: Date,
    reconciledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Reference
    reference: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
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
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator is required']
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
paymentSchema.index({ organization: 1, paymentNumber: 1 }, { unique: true });
paymentSchema.index({ organization: 1, customer: 1 });
paymentSchema.index({ organization: 1, vendor: 1 });
paymentSchema.index({ organization: 1, paymentDate: 1 });
paymentSchema.index({ organization: 1, method: 1 });
paymentSchema.index({ organization: 1, status: 1 });
paymentSchema.index({ 'allocations.invoice': 1 });

// Calculate unallocated amount before saving
paymentSchema.pre('save', function(next) {
    const allocatedTotal = this.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    this.unallocatedAmount = this.amount - allocatedTotal;
    next();
});

// Virtual for allocated amount
paymentSchema.virtual('allocatedAmount').get(function() {
    return this.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
});

// Virtual for is fully allocated
paymentSchema.virtual('isFullyAllocated').get(function() {
    return Math.abs(this.unallocatedAmount) < 0.01;
});

// Method to add allocation
paymentSchema.methods.addAllocation = async function(invoiceId, amount, userId) {
    const Invoice = mongoose.model('Invoice');
    
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
        throw new Error('Invoice not found');
    }
    
    const newAllocatedTotal = this.allocatedAmount + amount;
    if (newAllocatedTotal > this.amount + 0.01) {
        throw new Error('Allocation amount exceeds payment amount');
    }
    
    this.allocations.push({
        invoice: invoiceId,
        amount,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.issueDate,
        dueDate: invoice.dueDate
    });
    
    this.unallocatedAmount = this.amount - (this.allocatedAmount + amount);
    
    // Update invoice payment status
    invoice.amountPaid += amount;
    invoice.amountDue = invoice.totalAmount - invoice.amountPaid;
    
    if (invoice.amountDue <= 0) {
        invoice.paymentStatus = 'paid';
        invoice.invoiceStatus = 'paid';
    } else if (invoice.amountPaid > 0) {
        invoice.paymentStatus = 'partial';
    }
    
    await invoice.save();
    await this.save();
    
    return this;
};

// Method to remove allocation
paymentSchema.methods.removeAllocation = async function(allocationId, userId) {
    const allocation = this.allocations.id(allocationId);
    if (!allocation) {
        throw new Error('Allocation not found');
    }
    
    const Invoice = mongoose.model('Invoice');
    const invoice = await Invoice.findById(allocation.invoice);
    
    if (invoice) {
        invoice.amountPaid -= allocation.amount;
        invoice.amountDue = invoice.totalAmount - invoice.amountPaid;
        
        if (invoice.amountDue > 0) {
            invoice.paymentStatus = invoice.amountPaid > 0 ? 'partial' : 'unpaid';
        }
        
        await invoice.save();
    }
    
    allocation.deleteOne();
    this.unallocatedAmount = this.amount - this.allocatedAmount;
    await this.save();
    
    return this;
};

// Static method to get payments by customer
paymentSchema.statics.getPaymentsByCustomer = async function(organizationId, customerId, startDate, endDate) {
    const query = {
        organization: organizationId,
        customer: customerId,
        paymentType: 'receipt'
    };
    
    if (startDate || endDate) {
        query.paymentDate = {};
        if (startDate) query.paymentDate.$gte = startDate;
        if (endDate) query.paymentDate.$lte = endDate;
    }
    
    return this.find(query).sort('-paymentDate');
};

// Static method to get payments by vendor
paymentSchema.statics.getPaymentsByVendor = async function(organizationId, vendorId, startDate, endDate) {
    const query = {
        organization: organizationId,
        vendor: vendorId,
        paymentType: 'payment'
    };
    
    if (startDate || endDate) {
        query.paymentDate = {};
        if (startDate) query.paymentDate.$gte = startDate;
        if (endDate) query.paymentDate.$lte = endDate;
    }
    
    return this.find(query).sort('-paymentDate');
};

module.exports = mongoose.model('Payment', paymentSchema);