// src/models/finance/payment.model.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    paymentNumber: {
        type: String,
        trim: true,
        unique: true,
        sparse: true
        // Remove required: true
    },
    type: {
        type: String,
        enum: ['payment', 'receipt'],
        required: [true, 'Payment type is required']
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
        default: Date.now
    },
    
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: [true, 'Invoice is required']
    },
    
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: 0.01
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'bank_transfer', 'cheque', 'credit_card', 'mobile_money'],
        required: [true, 'Payment method is required']
    },
    reference: {
        type: String,
        trim: true
    },
    
    bankAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount'
    },
    
    notes: {
        type: String,
        trim: true
    },
    
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'reversed'],
        default: 'pending'
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
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    completedAt: Date
}, {
    timestamps: true
});

// Indexes
paymentSchema.index({ organization: 1, paymentNumber: 1 }, { unique: true, sparse: true });
paymentSchema.index({ organization: 1, invoiceId: 1 });
paymentSchema.index({ organization: 1, type: 1, date: -1 });

// Static method to generate payment number
paymentSchema.statics.generatePaymentNumber = async function(organizationId, type) {
    const prefix = type === 'payment' ? 'PMT' : 'RCT';
    const currentYear = new Date().getFullYear();
    const prefixWithYear = `${prefix}-${currentYear}`;
    
    const lastPayment = await this.findOne({
        organization: organizationId,
        paymentNumber: { $regex: `^${prefixWithYear}` }
    }).sort({ paymentNumber: -1 });
    
    let nextNumber = 1;
    if (lastPayment) {
        const parts = lastPayment.paymentNumber.split('-');
        const lastNumber = parseInt(parts[parts.length - 1]);
        nextNumber = lastNumber + 1;
    }
    
    return `${prefixWithYear}-${nextNumber.toString().padStart(4, '0')}`;
};

// Method to complete payment
paymentSchema.methods.complete = async function(userId, session) {
    this.status = 'completed';
    this.completedBy = userId;
    this.completedAt = new Date();
    return this.save({ session });
};

module.exports = mongoose.model('Payment', paymentSchema);
