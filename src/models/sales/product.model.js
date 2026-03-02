// src/models/sales/product.model.js
const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema({
    sku: {
        type: String,
        required: [true, 'Variant SKU is required'],
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Variant name is required'],
        trim: true
    },
    attributes: {
        type: Map,
        of: String
    },
    price: {
        type: Number,
        required: [true, 'Variant price is required'],
        min: [0, 'Price cannot be negative']
    },
    cost: {
        type: Number,
        min: [0, 'Cost cannot be negative']
    },
    quantity: {
        type: Number,
        default: 0,
        min: [0, 'Quantity cannot be negative']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: true });

const productSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Basic Information
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: [200, 'Product name cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    shortDescription: {
        type: String,
        trim: true,
        maxlength: [500, 'Short description cannot exceed 500 characters']
    },
    
    // SKU & Identifiers
    sku: {
        type: String,
        required: [true, 'SKU is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    barcode: {
        type: String,
        trim: true
    },
    manufacturerCode: String,
    
    // Category & Type
    category: {
        type: String,
        required: [true, 'Category is required'],
        index: true
    },
    subcategory: String,
    productType: {
        type: String,
        enum: ['simple', 'configurable', 'bundle', 'service'],
        default: 'simple'
    },
    
    // Pricing
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    cost: {
        type: Number,
        min: [0, 'Cost cannot be negative']
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    taxRate: {
        type: Number,
        default: 0,
        min: [0, 'Tax rate cannot be negative'],
        max: [100, 'Tax rate cannot exceed 100%']
    },
    taxClass: String,
    
    // Inventory
    quantity: {
        type: Number,
        default: 0,
        min: [0, 'Quantity cannot be negative']
    },
    reservedQuantity: {
        type: Number,
        default: 0,
        min: [0, 'Reserved quantity cannot be negative']
    },
    availableQuantity: {
        type: Number,
        default: 0
    },
    reorderPoint: {
        type: Number,
        default: 0,
        min: [0, 'Reorder point cannot be negative']
    },
    maximumStock: {
        type: Number,
        min: [0, 'Maximum stock cannot be negative']
    },
    
    // Warehouse & Location
    warehouse: String,
    location: String,
    
    // Variants
    variants: [productVariantSchema],
    hasVariants: {
        type: Boolean,
        default: false
    },
    
    // Attributes
    attributes: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    
    // Images
    images: [{
        url: String,
        thumbnail: String,
        alt: String,
        isPrimary: {
            type: Boolean,
            default: false
        }
    }],
    
    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'discontinued', 'coming-soon'],
        default: 'active',
        index: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    
    // SEO
    seo: {
        title: String,
        description: String,
        keywords: [String],
        slug: String
    },
    
    // Shipping
    weight: {
        type: Number,
        min: [0, 'Weight cannot be negative']
    },
    weightUnit: {
        type: String,
        enum: ['kg', 'g', 'lb', 'oz'],
        default: 'kg'
    },
    dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: {
            type: String,
            enum: ['cm', 'in', 'm'],
            default: 'cm'
        }
    },
    
    // Sales
    salesCount: {
        type: Number,
        default: 0
    },
    revenueGenerated: {
        type: Number,
        default: 0
    },
    
    // Related Products
    relatedProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    crossSell: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    upSell: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    
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
productSchema.index({ organization: 1, sku: 1 }, { unique: true });
productSchema.index({ organization: 1, name: 1 });
productSchema.index({ organization: 1, category: 1 });
productSchema.index({ organization: 1, status: 1 });
productSchema.index({ organization: 1, isFeatured: 1 });
productSchema.index({ 'variants.sku': 1 });

// Pre-save middleware
productSchema.pre('save', function(next) {
    // Calculate available quantity
    this.availableQuantity = this.quantity - this.reservedQuantity;
    
    // Generate SEO slug if not provided
    if (!this.seo?.slug) {
        this.seo = this.seo || {};
        this.seo.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    
    next();
});

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
    if (!this.cost || !this.price) return 0;
    return ((this.price - this.cost) / this.price) * 100;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
    if (this.availableQuantity <= 0) return 'out-of-stock';
    if (this.reorderPoint > 0 && this.availableQuantity <= this.reorderPoint) return 'low-stock';
    return 'in-stock';
});

// Virtual for total variants
productSchema.virtual('totalVariants').get(function() {
    return this.variants?.length || 0;
});

// Method to adjust inventory
productSchema.methods.adjustInventory = async function(quantity, type, reference, userId) {
    if (type === 'add') {
        this.quantity += quantity;
    } else if (type === 'remove') {
        if (this.quantity < quantity) {
            throw new Error('Insufficient quantity');
        }
        this.quantity -= quantity;
    } else if (type === 'reserve') {
        if (this.availableQuantity < quantity) {
            throw new Error('Insufficient available quantity');
        }
        this.reservedQuantity += quantity;
    } else if (type === 'release') {
        this.reservedQuantity = Math.max(0, this.reservedQuantity - quantity);
    }
    
    this.availableQuantity = this.quantity - this.reservedQuantity;
    this.updatedBy = userId;
    
    await this.save();
    
    // Create inventory transaction log
    const InventoryTransaction = mongoose.model('InventoryTransaction');
    await InventoryTransaction.create({
        organization: this.organization,
        product: this._id,
        type,
        quantity,
        reference,
        createdBy: userId
    });
    
    return this;
};

// Method to update sales stats
productSchema.methods.updateSalesStats = async function(quantity, revenue, userId) {
    this.salesCount += quantity;
    this.revenueGenerated += revenue;
    this.updatedBy = userId;
    
    await this.save();
    return this;
};

// Method to check low stock
productSchema.methods.isLowStock = function() {
    return this.reorderPoint > 0 && this.availableQuantity <= this.reorderPoint;
};

// Static method to get low stock products
productSchema.statics.getLowStockProducts = async function(organizationId) {
    return this.find({
        organization: organizationId,
        $expr: {
            $and: [
                { $gt: ['$reorderPoint', 0] },
                { $lte: ['$availableQuantity', '$reorderPoint'] }
            ]
        },
        status: 'active'
    }).sort({ availableQuantity: 1 });
};

// Static method to get products by category
productSchema.statics.getProductsByCategory = async function(organizationId) {
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
                averagePrice: { $avg: '$price' },
                totalValue: { $sum: { $multiply: ['$price', '$quantity'] } }
            }
        },
        { $sort: { '_id': 1 } }
    ]);
};

module.exports = mongoose.model('Product', productSchema);