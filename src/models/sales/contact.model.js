// src/models/sales/contact.model.js
const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Basic Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    middleName: String,
    suffix: String,
    
    // Customer Relationship
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: [true, 'Customer is required']
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    
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
    mobile: String,
    fax: String,
    
    // Professional Details
    position: {
        type: String,
        trim: true
    },
    department: String,
    reportsTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    },
    
    // Personal Details
    dateOfBirth: Date,
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    
    // Address
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    
    // Social Media
    socialMedia: {
        linkedin: String,
        twitter: String,
        facebook: String
    },
    
    // Communication Preferences
    preferences: {
        email: {
            type: Boolean,
            default: true
        },
        phone: {
            type: Boolean,
            default: true
        },
        sms: {
            type: Boolean,
            default: false
        }
    },
    
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    
    // Tags
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    
    // Status
    isActive: {
        type: Boolean,
        default: true
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
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
contactSchema.index({ organization: 1, customer: 1 });
contactSchema.index({ organization: 1, email: 1 }, { unique: true });
contactSchema.index({ organization: 1, isPrimary: 1 });

// Virtual for full name
contactSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`.trim();
});

// Virtual for display name
contactSchema.virtual('displayName').get(function() {
    return `${this.fullName}${this.position ? ` - ${this.position}` : ''}`;
});

// Pre-save middleware
contactSchema.pre('save', async function(next) {
    // If this contact is set as primary, update other contacts for the same customer
    if (this.isPrimary) {
        await this.constructor.updateMany(
            {
                customer: this.customer,
                _id: { $ne: this._id }
            },
            { isPrimary: false }
        );
        
        // Update customer's primary contact
        const Customer = mongoose.model('Customer');
        await Customer.findByIdAndUpdate(this.customer, {
            primaryContact: this._id
        });
    }
    next();
});

// Method to make primary
contactSchema.methods.makePrimary = async function() {
    this.isPrimary = true;
    await this.save();
    return this;
};

// Method to get full contact details
contactSchema.methods.getFullDetails = async function() {
    const customer = await mongoose.model('Customer').findById(this.customer);
    const reportsTo = this.reportsTo ? await this.constructor.findById(this.reportsTo).select('firstName lastName') : null;
    
    return {
        ...this.toObject(),
        customerName: customer?.name,
        reportsToName: reportsTo?.fullName
    };
};

// Static method to get contacts by customer
contactSchema.statics.getByCustomer = async function(organizationId, customerId) {
    return this.find({
        organization: organizationId,
        customer: customerId,
        isActive: true
    }).sort('lastName firstName');
};

// Static method to get primary contact
contactSchema.statics.getPrimaryContact = async function(organizationId, customerId) {
    return this.findOne({
        organization: organizationId,
        customer: customerId,
        isPrimary: true,
        isActive: true
    });
};

module.exports = mongoose.model('Contact', contactSchema);