// src/models/sales/order.model.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
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

const orderSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Order Identity
    orderNumber: {
        type: String,
        required: [true, 'Order number is required'],
        unique: true,
        trim: true
    },
    
    // Related Entities
    quote: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quote'
    },
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
    orderDate: {
        type: Date,
        required: [true, 'Order date is required'],
        default: Date.now
    },
    requiredDate: Date,
    shippedDate: Date,
    deliveredDate: Date,
    
    // Items
    items: [orderItemSchema],
    
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
    
    // Payment
    paymentMethod: {
        type: String,
        enum: ['cash', 'credit_card', 'bank_transfer', 'check', 'other']
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'partial', 'refunded'],
        default: 'pending'
    },
    paidAmount: {
        type: Number,
        default: 0,
        min: [0, 'Paid amount cannot be negative']
    },
    paymentDate: Date,
    transactionId: String,
    
    // Shipping
    shippingMethod: String,
    trackingNumber: String,
    carrier: String,
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    billingAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    
    // Status
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: [
            'pending', 'processing', 'shipped', 'delivered',
            'completed', 'cancelled', 'refunded', 'on-hold'
        ],
        default: 'pending',
        index: true
    },
    
    // Fulfillment
    fulfilledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    fulfillmentDate: Date,
    
    // Cancellation
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelledAt: Date,
    cancellationReason: String,
    
    // Invoicing
    invoiceNumber: String,
    invoiceDate: Date,
    invoicedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
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
orderSchema.index({ organization: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ organization: 1, customer: 1 });
orderSchema.index({ organization: 1, status: 1 });
orderSchema.index({ organization: 1, orderDate: -1 });

// Calculate totals before saving
orderSchema.pre('save', function(next) {
    // Calculate item totals
    this.items.forEach(item => {
        item.amount = item.quantity * item.unitPrice;
        const afterDiscount = item.amount - (item.discount || 0);
        item.taxAmount = afterDiscount * (item.taxRate / 100);
        item.total = afterDiscount + item.taxAmount;
    });
    
    // Calculate order totals
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
    this.discountTotal = this.items.reduce((sum, item) => sum + (item.discount || 0), 0);
    this.taxTotal = this.items.reduce((sum, item) => sum + item.taxAmount, 0);
    this.total = this.subtotal - this.discountTotal + this.taxTotal + (this.shippingCost || 0);
    
    next();
});

// Virtual for balance due
orderSchema.virtual('balanceDue').get(function() {
    return this.total - this.paidAmount;
});

// Virtual for is paid
orderSchema.virtual('isPaid').get(function() {
    return this.paidAmount >= this.total;
});

// Method to process payment
orderSchema.methods.processPayment = async function(amount, method, transactionId, userId) {
    this.paidAmount += amount;
    this.paymentMethod = method;
    this.transactionId = transactionId;
    
    if (this.paidAmount >= this.total) {
        this.paymentStatus = 'paid';
        this.paymentDate = new Date();
    } else if (this.paidAmount > 0) {
        this.paymentStatus = 'partial';
    }
    
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Method to ship order
orderSchema.methods.ship = async function(trackingNumber, carrier, userId) {
    this.status = 'shipped';
    this.trackingNumber = trackingNumber;
    this.carrier = carrier;
    this.shippedDate = new Date();
    this.fulfilledBy = userId;
    this.fulfillmentDate = new Date();
    this.updatedBy = userId;
    
    await this.save();
    return this;
};

// Method to deliver order
orderSchema.methods.deliver = async function(userId) {
    this.status = 'delivered';
    this.deliveredDate = new Date();
    this.updatedBy = userId;
    
    await this.save();
    return this;
};

// Method to cancel order
orderSchema.methods.cancel = async function(reason, userId) {
    this.status = 'cancelled';
    this.cancelledBy = userId;
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
    this.updatedBy = userId;
    
    await this.save();
    return this;
};

// Static method to get orders by status
orderSchema.statics.getOrdersByStatus = async function(organizationId, status) {
    return this.find({
        organization: organizationId,
        status
    }).sort('-orderDate').populate('customer', 'name');
};

// Static method to get revenue by period
orderSchema.statics.getRevenueByPeriod = async function(organizationId, startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                organization: mongoose.Types.ObjectId(organizationId),
                orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
                status: 'completed'
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$orderDate' },
                    month: { $month: '$orderDate' }
                },
                count: { $sum: 1 },
                revenue: { $sum: '$total' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
};

module.exports = mongoose.model('Order', orderSchema);