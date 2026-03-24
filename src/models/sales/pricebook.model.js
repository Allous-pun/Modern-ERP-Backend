// src/models/sales/pricebook.model.js
const mongoose = require('mongoose');

const pricebookEntrySchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required']
    },
    productName: String,
    productSku: String,
    
    // Pricing
    listPrice: {
        type: Number,
        required: [true, 'List price is required'],
        min: [0, 'List price cannot be negative']
    },
    sellingPrice: {
        type: Number,
        required: [true, 'Selling price is required'],
        min: [0, 'Selling price cannot be negative']
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative'],
        max: [100, 'Discount cannot exceed 100%']
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    
    // Tiered Pricing
    tierPricing: [{
        minQuantity: {
            type: Number,
            required: true,
            min: [1, 'Minimum quantity must be at least 1']
        },
        maxQuantity: Number,
        price: {
            type: Number,
            required: true,
            min: [0, 'Price cannot be negative']
        },
        discount: {
            type: Number,
            min: [0, 'Discount cannot be negative'],
            max: [100, 'Discount cannot exceed 100%']
        }
    }],
    
    // Volume Discounts
    volumeDiscounts: [{
        minQuantity: {
            type: Number,
            required: true,
            min: [1, 'Minimum quantity must be at least 1']
        },
        maxQuantity: Number,
        discountPercent: {
            type: Number,
            required: true,
            min: [0, 'Discount cannot be negative'],
            max: [100, 'Discount cannot exceed 100%']
        }
    }],
    
    // Date Range
    effectiveDate: {
        type: Date,
        default: Date.now
    },
    expirationDate: Date,
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: true });

const pricebookSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Basic Information
    name: {
        type: String,
        required: [true, 'Pricebook name is required'],
        trim: true,
        maxlength: [200, 'Pricebook name cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // Type
    type: {
        type: String,
        enum: ['standard', 'promotional', 'contract', 'partner'],
        default: 'standard',
        index: true
    },
    
    // Currency
    currency: {
        type: String,
        required: [true, 'Currency is required'],
        default: 'USD',
        uppercase: true
    },
    
    // Entries
    entries: [pricebookEntrySchema],
    
    // Date Range
    effectiveDate: {
        type: Date,
        default: Date.now
    },
    expirationDate: Date,
    
    // Is Default
    isDefault: {
        type: Boolean,
        default: false
    },
    
    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'draft', 'archived'],
        default: 'active',
        index: true
    },
    
    // Tags
    tags: [{
        type: String,
        trim: true,
        lowercase: true
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
pricebookSchema.index({ organization: 1, name: 1 }, { unique: true });
pricebookSchema.index({ organization: 1, type: 1 });
pricebookSchema.index({ organization: 1, isDefault: 1 });
pricebookSchema.index({ organization: 1, effectiveDate: 1, expirationDate: 1 });

// Virtual for entry count
pricebookSchema.virtual('entryCount').get(function() {
    return this.entries?.length || 0;
});

// Virtual for is active
pricebookSchema.virtual('isActiveNow').get(function() {
    const now = new Date();
    return this.status === 'active' &&
           now >= this.effectiveDate &&
           (!this.expirationDate || now <= this.expirationDate);
});

// Method to add product
pricebookSchema.methods.addProduct = async function(productData, userId) {
    const Product = mongoose.model('Product');
    const product = await Product.findById(productData.product);
    
    if (!product) {
        throw new Error('Product not found');
    }
    
    // Check if product already exists in pricebook
    const existingEntry = this.entries.find(e => 
        e.product.toString() === productData.product.toString()
    );
    
    if (existingEntry) {
        throw new Error('Product already exists in pricebook');
    }
    
    this.entries.push({
        ...productData,
        productName: product.name,
        productSku: product.sku
    });
    
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Method to update product price
pricebookSchema.methods.updateProductPrice = async function(productId, priceData, userId) {
    const entry = this.entries.find(e => e.product.toString() === productId.toString());
    
    if (!entry) {
        throw new Error('Product not found in pricebook');
    }
    
    Object.assign(entry, priceData);
    this.updatedBy = userId;
    await this.save();
    return entry;
};

// Method to remove product
pricebookSchema.methods.removeProduct = async function(productId, userId) {
    this.entries = this.entries.filter(e => e.product.toString() !== productId.toString());
    this.updatedBy = userId;
    await this.save();
    return this;
};

// Method to get product price with quantity
pricebookSchema.methods.getPrice = function(productId, quantity = 1) {
    const entry = this.entries.find(e => e.product.toString() === productId.toString());
    
    if (!entry) {
        return null;
    }
    
    // Check tier pricing
    if (entry.tierPricing && entry.tierPricing.length > 0) {
        const tier = entry.tierPricing.find(t => 
            quantity >= t.minQuantity && 
            (!t.maxQuantity || quantity <= t.maxQuantity)
        );
        
        if (tier) {
            return tier.price;
        }
    }
    
    // Check volume discounts
    if (entry.volumeDiscounts && entry.volumeDiscounts.length > 0) {
        const discount = entry.volumeDiscounts.find(v => 
            quantity >= v.minQuantity && 
            (!v.maxQuantity || quantity <= v.maxQuantity)
        );
        
        if (discount) {
            return entry.sellingPrice * (1 - discount.discountPercent / 100);
        }
    }
    
    return entry.sellingPrice;
};

// Method to calculate total with quantity
pricebookSchema.methods.calculateTotal = function(productId, quantity = 1) {
    const price = this.getPrice(productId, quantity);
    return price * quantity;
};

// Method to clone pricebook
pricebookSchema.methods.clone = async function(newName, userId) {
    const PriceBook = mongoose.model('PriceBook');
    
    const newPriceBook = new PriceBook({
        organization: this.organization,
        name: newName || `${this.name} (Copy)`,
        description: this.description,
        type: this.type,
        currency: this.currency,
        entries: this.entries.map(entry => ({
            ...entry.toObject(),
            _id: undefined
        })),
        effectiveDate: new Date(),
        status: 'draft',
        createdBy: userId
    });
    
    await newPriceBook.save();
    return newPriceBook;
};

// Static method to get default pricebook
pricebookSchema.statics.getDefaultPriceBook = async function(organizationId) {
    let pricebook = await this.findOne({
        organization: organizationId,
        isDefault: true,
        status: 'active'
    });
    
    if (!pricebook) {
        // Create default pricebook if none exists
        pricebook = await this.create({
            organization: organizationId,
            name: 'Standard Price Book',
            type: 'standard',
            isDefault: true,
            status: 'active',
            createdBy: null // Will be set by system
        });
    }
    
    return pricebook;
};

// Static method to get active pricebooks
pricebookSchema.statics.getActivePriceBooks = async function(organizationId) {
    const now = new Date();
    return this.find({
        organization: organizationId,
        status: 'active',
        effectiveDate: { $lte: now },
        $or: [
            { expirationDate: { $exists: false } },
            { expirationDate: null },
            { expirationDate: { $gte: now } }
        ]
    }).sort({ name: 1 });
};

// Static method to search pricebooks
pricebookSchema.statics.search = async function(organizationId, searchTerm, filters = {}) {
    const query = { organization: organizationId };
    
    if (searchTerm) {
        query.$or = [
            { name: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { 'entries.productName': { $regex: searchTerm, $options: 'i' } },
            { 'entries.productSku': { $regex: searchTerm, $options: 'i' } }
        ];
    }
    
    return this.find({ ...query, ...filters })
        .sort({ name: 1 })
        .populate('createdBy', 'firstName lastName');
};

module.exports = mongoose.model('PriceBook', pricebookSchema);