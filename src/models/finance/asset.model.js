// src/models/finance/asset.model.js
const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Asset Identification
    assetCode: {
        type: String,
        required: [true, 'Asset code is required'],
        trim: true,
        uppercase: true,
        unique: true
    },
    name: {
        type: String,
        required: [true, 'Asset name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    
    // Asset Classification
    category: {
        type: String,
        enum: ['buildings', 'machinery', 'vehicles', 'furniture', 'computers', 'software', 'other'],
        required: [true, 'Asset category is required']
    },
    status: {
        type: String,
        enum: ['active', 'disposed', 'under_maintenance', 'retired'],
        default: 'active'
    },
    
    // Acquisition Details
    acquisitionDate: {
        type: Date,
        required: [true, 'Acquisition date is required']
    },
    purchasePrice: {
        type: Number,
        required: [true, 'Purchase price is required'],
        min: 0
    },
    residualValue: {
        type: Number,
        default: 0,
        min: 0
    },
    usefulLife: {
        type: Number,
        required: [true, 'Useful life in years is required'],
        min: 1
    },
    
    // Depreciation Settings
    depreciationMethod: {
        type: String,
        enum: ['straight_line', 'declining_balance', 'double_declining', 'units_of_production'],
        default: 'straight_line'
    },
    depreciationRate: {
        type: Number,
        default: function() {
            return this.depreciationMethod === 'straight_line' ? (1 / this.usefulLife) * 100 : 0;
        }
    },
    currentValue: {
        type: Number,
        required: true,
        default: 0
    },
    accumulatedDepreciation: {
        type: Number,
        default: 0
    },
    
    // Supplier Information
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
    },
    supplierName: String,
    invoiceNumber: String,
    warrantyExpiry: Date,
    
    // Location & Assignment
    location: {
        type: String,
        trim: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    department: {
        type: String,
        trim: true
    },
    
    // Cost Center
    costCenter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostCenter'
    },
    
    // Accounting
    assetAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Asset account is required']
    },
    depreciationAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Depreciation expense account is required']
    },
    accumulatedDepreciationAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Accumulated depreciation account is required']
    },
    
    // Disposal
    disposalDate: Date,
    disposalAmount: Number,
    disposalReason: String,
    
    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: [true, 'Creator is required']
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
assetSchema.index({ organization: 1, assetCode: 1 }, { unique: true });
assetSchema.index({ organization: 1, category: 1 });
assetSchema.index({ organization: 1, status: 1 });
assetSchema.index({ organization: 1, assignedTo: 1 });

// Virtual for age in years
assetSchema.virtual('ageYears').get(function() {
    const today = new Date();
    const age = today.getFullYear() - this.acquisitionDate.getFullYear();
    return Math.max(0, age);
});

// Virtual for net book value
assetSchema.virtual('netBookValue').get(function() {
    return this.currentValue - this.accumulatedDepreciation;
});

// Virtual for depreciation percentage
assetSchema.virtual('depreciationPercentage').get(function() {
    return (this.accumulatedDepreciation / this.purchasePrice) * 100;
});

// Method to calculate annual depreciation
assetSchema.methods.calculateAnnualDepreciation = function() {
    const depreciableAmount = this.purchasePrice - this.residualValue;
    
    switch(this.depreciationMethod) {
        case 'straight_line':
            return depreciableAmount / this.usefulLife;
        case 'declining_balance':
            return this.currentValue * (this.depreciationRate / 100);
        case 'double_declining':
            const rate = (2 / this.usefulLife) * 100;
            return this.currentValue * (rate / 100);
        default:
            return depreciableAmount / this.usefulLife;
    }
};

// Method to calculate monthly depreciation
assetSchema.methods.calculateMonthlyDepreciation = function() {
    return this.calculateAnnualDepreciation() / 12;
};

// Method to record depreciation
assetSchema.methods.recordDepreciation = async function(period, amount, session) {
    this.accumulatedDepreciation += amount;
    this.currentValue = this.purchasePrice - this.accumulatedDepreciation;
    return this.save({ session });
};

// Static method to generate asset code
assetSchema.statics.generateAssetCode = async function(organizationId, category) {
    const prefix = category.substring(0, 3).toUpperCase();
    const currentYear = new Date().getFullYear();
    const prefixWithYear = `${prefix}-${currentYear}`;
    
    const lastAsset = await this.findOne({
        organization: organizationId,
        assetCode: { $regex: `^${prefixWithYear}` }
    }).sort({ assetCode: -1 });
    
    let nextNumber = 1;
    if (lastAsset) {
        const parts = lastAsset.assetCode.split('-');
        const lastNumber = parseInt(parts[parts.length - 1]);
        nextNumber = lastNumber + 1;
    }
    
    return `${prefixWithYear}-${nextNumber.toString().padStart(4, '0')}`;
};

// Static method to get assets due for depreciation
assetSchema.statics.getAssetsDueForDepreciation = async function(organizationId, asOfDate) {
    return await this.find({
        organization: organizationId,
        status: 'active',
        acquisitionDate: { $lte: asOfDate },
        currentValue: { $gt: this.residualValue }
    });
};

const depreciationScheduleSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    assetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        required: true
    },
    
    period: {
        year: Number,
        month: Number,
        quarter: Number
    },
    
    startDate: Date,
    endDate: Date,
    
    openingBalance: Number,
    depreciationAmount: Number,
    closingBalance: Number,
    
    journalEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JournalEntry'
    },
    
    status: {
        type: String,
        enum: ['pending', 'posted'],
        default: 'pending'
    },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    postedAt: Date
}, {
    timestamps: true
});

// Indexes
depreciationScheduleSchema.index({ organization: 1, assetId: 1, period: { year: 1, month: 1 } }, { unique: true });
depreciationScheduleSchema.index({ organization: 1, status: 1 });

module.exports = {
    Asset: mongoose.model('Asset', assetSchema),
    DepreciationSchedule: mongoose.model('DepreciationSchedule', depreciationScheduleSchema)
};
