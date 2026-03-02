// src/models/sales/quote.model.js
const mongoose = require('mongoose');

const quoteItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
        type: Number,
        required: [true, 'Unit price is required'],
        min: [0, 'Unit price cannot be negative']
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative']
    },
    taxRate: {
        type: Number,
        default: 0,
        min: [0, 'Tax rate cannot be negative'],
        max: [100, 'Tax rate cannot exceed 100%']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    taxAmount: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: [true, 'Total is required'],
        min: [0, 'Total cannot be negative']
    }
}, { _id: true });

const quoteSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Quote Identity
    quoteNumber: {
        type: String,
        required: [true, 'Quote number is required'],
        unique: true,
        trim: true
    },
    revision: {
        type: Number,
        default: 1
    },
    
    // Related Entities
    opportunity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Opportunity'
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: [true, 'Customer is required']
    },
    contact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    },
    
    // Dates
    quoteDate: {
        type: Date,
        required: [true, 'Quote date is required'],
        default: Date.now
    },
    validUntil: {
        type: Date,
        required: [true, 'Valid until date is required']
    },
    
    // Items
    items: [quoteItemSchema],
    
    // Totals
    subtotal: {
        type: Number,
        required: [true, 'Subtotal is required'],
        default: 0
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
    total: {
        type: Number,
        required: [true, 'Total is required'],
        default: 0
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    
    // Terms
    paymentTerms: {
        type: String,
        trim: true
    },
    deliveryTerms: String,
    warranty: String,
    
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    terms: {
        type: String,
        trim: true,
        maxlength: [5000, 'Terms cannot exceed 5000 characters']
    },
    
    // Status
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: ['draft', 'sent', 'viewed', 'approved', 'rejected', 'expired', 'converted'],
        default: 'draft',
        index: true
    },
    
    // Approval
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    approvalComments: String,
    
    // Rejection
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: String,
    
    // Conversion
    convertedToOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    convertedAt: Date,
    
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
quoteSchema.index({ organization: 1, quoteNumber: 1 }, { unique: true });
quoteSchema.index({ organization: 1, customer: 1 });
quoteSchema.index({ organization: 1, status: 1 });
quoteSchema.index({ validUntil: 1 });

// Calculate totals before saving
quoteSchema.pre('save', function(next) {
    // Calculate item totals
    this.items.forEach(item => {
        item.amount = item.quantity * item.unitPrice;
        const afterDiscount = item.amount - (item.discount || 0);
        item.taxAmount = afterDiscount * (item.taxRate / 100);
        item.total = afterDiscount + item.taxAmount;
    });
    
    // Calculate quote totals
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
    this.discountTotal = this.items.reduce((sum, item) => sum + (item.discount || 0), 0);
    this.taxTotal = this.items.reduce((sum, item) => sum + item.taxAmount, 0);
    this.total = this.subtotal - this.discountTotal + this.taxTotal + (this.shippingCost || 0);
    
    next();
});

// Virtual for days until expiry
quoteSchema.virtual('daysUntilExpiry').get(function() {
    if (!this.validUntil) return null;
    const now = new Date();
    const diff = this.validUntil - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual for is expired
quoteSchema.virtual('isExpired').get(function() {
    return this.validUntil && new Date() > this.validUntil;
});

// Method to send quote
quoteSchema.methods.send = async function(userId) {
    this.status = 'sent';
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Method to approve quote
quoteSchema.methods.approve = async function(userId, comments) {
    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
    this.approvalComments = comments;
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Method to reject quote
quoteSchema.methods.reject = async function(userId, reason) {
    this.status = 'rejected';
    this.rejectedBy = userId;
    this.rejectedAt = new Date();
    this.rejectionReason = reason;
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Method to create revision
quoteSchema.methods.createRevision = async function(userId) {
    const newQuote = this.toObject();
    delete newQuote._id;
    delete newQuote.createdAt;
    delete newQuote.updatedAt;
    
    newQuote.revision = this.revision + 1;
    newQuote.status = 'draft';
    newQuote.createdBy = userId;
    
    const Quote = mongoose.model('Quote');
    const revision = await Quote.create(newQuote);
    
    return revision;
};

// Static method to get expiring quotes
quoteSchema.statics.getExpiringQuotes = async function(organizationId, days = 7) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    return this.find({
        organization: organizationId,
        status: { $in: ['sent', 'viewed'] },
        validUntil: { $lte: expiryDate }
    }).populate('customer', 'name email');
};

module.exports = mongoose.model('Quote', quoteSchema);