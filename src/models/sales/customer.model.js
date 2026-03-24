// src/models/sales/customer.model.js
const mongoose = require('mongoose');

const customerAddressSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['billing', 'shipping', 'both'],
        default: 'both'
    },
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    isDefault: {
        type: Boolean,
        default: false
    }
}, { _id: true });

const customerContactSchema = new mongoose.Schema({
    name: String,
    position: String,
    email: String,
    phone: String,
    isPrimary: {
        type: Boolean,
        default: false
    }
}, { _id: true });

const customerSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Basic Information
    customerCode: {
        type: String,
        required: [true, 'Customer code is required'],
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
        maxlength: [200, 'Customer name cannot exceed 200 characters']
    },
    type: {
        type: String,
        enum: ['company', 'individual', 'government', 'non-profit'],
        default: 'company'
    },
    
    // Company Details
    registrationNumber: String,
    taxId: String,
    website: String,
    industry: String,
    size: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    },
    annualRevenue: Number,
    
    // Contact Information
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    fax: String,
    mobile: String,
    
    // Addresses
    addresses: [customerAddressSchema],
    
    // Primary Address
    primaryAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    
    // Contacts
    contacts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    }],
    primaryContact: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    },
    
    // Social Media
    socialMedia: {
        linkedin: String,
        twitter: String,
        facebook: String,
        instagram: String
    },
    
    // Classification
    category: {
        type: String,
        enum: ['platinum', 'gold', 'silver', 'bronze', 'prospect'],
        default: 'prospect'
    },
    source: {
        type: String,
        enum: ['website', 'referral', 'advertisement', 'event', 'other'],
        default: 'other'
    },
    
    // Relationship
    accountManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedAt: Date,
    
    // Financial
    creditLimit: {
        type: Number,
        min: [0, 'Credit limit cannot be negative']
    },
    paymentTerms: {
        type: String,
        enum: ['immediate', 'net15', 'net30', 'net45', 'net60'],
        default: 'net30'
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    
    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'prospect', 'lead'],
        default: 'active',
        index: true
    },
    
    // Statistics
    statistics: {
        totalOrders: {
            type: Number,
            default: 0
        },
        totalRevenue: {
            type: Number,
            default: 0
        },
        averageOrderValue: {
            type: Number,
            default: 0
        },
        lastOrderDate: Date,
        lifetimeValue: {
            type: Number,
            default: 0
        }
    },
    
    // Tags
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    
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
customerSchema.index({ organization: 1, customerCode: 1 }, { unique: true });
customerSchema.index({ organization: 1, email: 1 });
customerSchema.index({ organization: 1, status: 1 });
customerSchema.index({ organization: 1, category: 1 });
customerSchema.index({ 'statistics.lifetimeValue': -1 });

// Virtual for full address
customerSchema.virtual('fullAddress').get(function() {
    if (!this.primaryAddress) return '';
    const parts = [
        this.primaryAddress.street,
        this.primaryAddress.city,
        this.primaryAddress.state,
        this.primaryAddress.country,
        this.primaryAddress.postalCode
    ].filter(Boolean);
    return parts.join(', ');
});

// Method to update statistics
customerSchema.methods.updateStatistics = async function() {
    const Order = mongoose.model('Order');
    
    const orders = await Order.find({
        customer: this._id,
        status: 'completed'
    });
    
    this.statistics.totalOrders = orders.length;
    this.statistics.totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    this.statistics.averageOrderValue = this.statistics.totalOrders > 0 
        ? this.statistics.totalRevenue / this.statistics.totalOrders 
        : 0;
    
    if (orders.length > 0) {
        this.statistics.lastOrderDate = orders.sort((a, b) => b.orderDate - a.orderDate)[0].orderDate;
    }
    
    this.statistics.lifetimeValue = this.statistics.totalRevenue;
    
    await this.save();
    return this.statistics;
};

// Method to add contact
customerSchema.methods.addContact = async function(contactId, isPrimary = false) {
    if (!this.contacts.includes(contactId)) {
        this.contacts.push(contactId);
    }
    
    if (isPrimary) {
        this.primaryContact = contactId;
    }
    
    await this.save();
    return this;
};

// Method to remove contact
customerSchema.methods.removeContact = async function(contactId) {
    this.contacts = this.contacts.filter(id => !id.equals(contactId));
    
    if (this.primaryContact && this.primaryContact.equals(contactId)) {
        this.primaryContact = this.contacts.length > 0 ? this.contacts[0] : null;
    }
    
    await this.save();
    return this;
};

// Static method to get top customers
customerSchema.statics.getTopCustomers = async function(organizationId, limit = 10) {
    return this.find({
        organization: organizationId,
        status: 'active'
    })
    .sort({ 'statistics.lifetimeValue': -1 })
    .limit(limit)
    .select('name customerCode statistics category');
};

// Static method to get customers by category
customerSchema.statics.getCustomersByCategory = async function(organizationId) {
    return this.aggregate([
        {
            $match: {
                organization: mongoose.Types.ObjectId(organizationId),
                status: 'active'
            }
        },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                totalRevenue: { $sum: '$statistics.totalRevenue' }
            }
        },
        { $sort: { '_id': 1 } }
    ]);
};

module.exports = mongoose.model('Customer', customerSchema);