// src/models/finance/asset.model.js
const mongoose = require('mongoose');

const depreciationEntrySchema = new mongoose.Schema({
    period: {
        type: String,
        required: [true, 'Period is required'],
        enum: ['monthly', 'quarterly', 'annual']
    },
    date: {
        type: Date,
        required: [true, 'Date is required']
    },
    amount: {
        type: Number,
        required: [true, 'Depreciation amount is required'],
        min: [0, 'Depreciation amount cannot be negative']
    },
    accumulatedDepreciation: {
        type: Number,
        required: [true, 'Accumulated depreciation is required'],
        min: [0, 'Accumulated depreciation cannot be negative']
    },
    bookValue: {
        type: Number,
        required: [true, 'Book value is required'],
        min: [0, 'Book value cannot be negative']
    },
    posted: {
        type: Boolean,
        default: false
    },
    journalEntry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JournalEntry'
    }
}, { _id: true });

const maintenanceRecordSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: [true, 'Maintenance date is required'],
        default: Date.now
    },
    type: {
        type: String,
        required: [true, 'Maintenance type is required'],
        enum: ['routine', 'repair', 'upgrade', 'inspection']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    cost: {
        type: Number,
        required: [true, 'Cost is required'],
        min: [0, 'Cost cannot be negative']
    },
    performedBy: {
        type: String,
        trim: true
    },
    notes: String,
    documents: [{
        filename: String,
        url: String,
        uploadedAt: Date
    }]
}, { _id: true });

const assetSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Basic Information
    assetNumber: {
        type: String,
        required: [true, 'Asset number is required'],
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Asset name is required'],
        trim: true,
        minlength: [3, 'Asset name must be at least 3 characters'],
        maxlength: [100, 'Asset name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // Classification
    type: {
        type: String,
        required: [true, 'Asset type is required'],
        enum: [
            'building', 'land', 'machinery', 'equipment', 
            'vehicle', 'furniture', 'computer', 'software',
            'leasehold_improvement', 'other'
        ],
        index: true
    },
    category: {
        type: String,
        required: [true, 'Asset category is required'],
        enum: [
            'tangible', 'intangible', 'financial', 'current',
            'fixed', 'capital_work_in_progress'
        ],
        default: 'tangible'
    },
    subcategory: {
        type: String,
        trim: true
    },
    
    // Financial Details
    purchaseDate: {
        type: Date,
        required: [true, 'Purchase date is required']
    },
    purchaseCost: {
        type: Number,
        required: [true, 'Purchase cost is required'],
        min: [0, 'Purchase cost cannot be negative']
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    exchangeRate: {
        type: Number,
        default: 1
    },
    
    // Depreciation
    depreciationMethod: {
        type: String,
        required: [true, 'Depreciation method is required'],
        enum: [
            'straight-line', 'declining-balance', 'double-declining',
            'sum-of-years-digits', 'units-of-production', 'none'
        ],
        default: 'straight-line'
    },
    usefulLife: {
        type: Number,
        required: function() { return this.depreciationMethod !== 'none'; },
        min: [0, 'Useful life must be positive'],
        description: 'Useful life in years'
    },
    salvageValue: {
        type: Number,
        default: 0,
        min: [0, 'Salvage value cannot be negative']
    },
    depreciationRate: {
        type: Number,
        min: [0, 'Depreciation rate cannot be negative'],
        max: [100, 'Depreciation rate cannot exceed 100%']
    },
    productionUnits: {
        type: Number,
        min: [0, 'Production units cannot be negative'],
        description: 'Total expected production units for units-of-production method'
    },
    unitsProduced: {
        type: Number,
        default: 0,
        min: [0, 'Units produced cannot be negative']
    },
    
    // Current Values
    currentValue: {
        type: Number,
        required: true,
        default: function() { return this.purchaseCost; }
    },
    accumulatedDepreciation: {
        type: Number,
        default: 0,
        min: [0, 'Accumulated depreciation cannot be negative']
    },
    impairmentLoss: {
        type: Number,
        default: 0,
        min: [0, 'Impairment loss cannot be negative']
    },
    revaluationSurplus: {
        type: Number,
        default: 0
    },
    
    // Depreciation Schedule
    depreciationSchedule: [depreciationEntrySchema],
    
    // Maintenance History
    maintenanceHistory: [maintenanceRecordSchema],
    
    // Location & Assignment
    location: {
        type: String,
        trim: true
    },
    department: {
        type: String,
        trim: true
    },
    custodian: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    custodianName: String,
    
    // Vendor Information
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
    },
    vendorName: String,
    purchaseOrder: String,
    invoiceNumber: String,
    warrantyExpiry: Date,
    
    // Insurance
    insured: {
        type: Boolean,
        default: false
    },
    insuranceProvider: String,
    insurancePolicyNumber: String,
    insuranceExpiry: Date,
    insuranceValue: Number,
    
    // Status
    status: {
        type: String,
        required: [true, 'Asset status is required'],
        enum: [
            'active', 'inactive', 'disposed', 'sold',
            'under_maintenance', 'reserved', 'transferred'
        ],
        default: 'active'
    },
    condition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'damaged'],
        default: 'good'
    },
    
    // Disposal
    disposalDate: Date,
    disposalMethod: {
        type: String,
        enum: ['sold', 'scrapped', 'donated', 'lost', 'stolen']
    },
    disposalProceeds: {
        type: Number,
        min: [0, 'Disposal proceeds cannot be negative']
    },
    disposalReason: String,
    gainLossOnDisposal: Number,
    
    // Accounting
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Asset account is required']
    },
    depreciationAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    accumulatedDepreciationAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account'
    },
    
    // Metadata
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
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
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    
    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator is required']
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
assetSchema.index({ organization: 1, assetNumber: 1 }, { unique: true });
assetSchema.index({ organization: 1, type: 1 });
assetSchema.index({ organization: 1, status: 1 });
assetSchema.index({ organization: 1, department: 1 });
assetSchema.index({ organization: 1, custodian: 1 });
assetSchema.index({ purchaseDate: -1 });

// Virtual for age
assetSchema.virtual('age').get(function() {
    if (!this.purchaseDate) return 0;
    const ageInMs = Date.now() - this.purchaseDate.getTime();
    return Math.floor(ageInMs / (1000 * 60 * 60 * 24 * 365.25));
});

// Virtual for remaining life
assetSchema.virtual('remainingLife').get(function() {
    if (this.depreciationMethod === 'none' || !this.usefulLife) return null;
    return Math.max(0, this.usefulLife - this.age);
});

// Virtual for depreciation percentage
assetSchema.virtual('depreciationPercentage').get(function() {
    if (this.purchaseCost === 0) return 0;
    return (this.accumulatedDepreciation / this.purchaseCost) * 100;
});

// Method to calculate book value
assetSchema.methods.calculateBookValue = async function(asOfDate = new Date()) {
    const purchaseCost = this.purchaseCost;
    const accumulatedDepr = await this.calculateAccumulatedDepreciation(asOfDate);
    return Math.max(0, purchaseCost - accumulatedDepr - this.impairmentLoss);
};

// Method to calculate accumulated depreciation
assetSchema.methods.calculateAccumulatedDepreciation = async function(asOfDate = new Date()) {
    if (this.depreciationMethod === 'none') return 0;
    
    const years = (asOfDate - this.purchaseDate) / (1000 * 60 * 60 * 24 * 365.25);
    const usefulLife = this.usefulLife;
    const cost = this.purchaseCost - this.salvageValue;
    
    switch(this.depreciationMethod) {
        case 'straight-line':
            return Math.min(cost * (years / usefulLife), cost);
            
        case 'double-declining':
            const rate = 2 / usefulLife;
            let accumulated = 0;
            let remainingValue = this.purchaseCost;
            
            for (let year = 0; year < Math.min(Math.floor(years), usefulLife); year++) {
                const depreciation = remainingValue * rate;
                accumulated += depreciation;
                remainingValue -= depreciation;
            }
            
            // Add partial year depreciation
            if (years % 1 > 0) {
                const partialDepr = remainingValue * rate * (years % 1);
                accumulated += partialDepr;
            }
            
            return Math.min(accumulated, cost);
            
        case 'sum-of-years-digits':
            const sumOfYears = (usefulLife * (usefulLife + 1)) / 2;
            accumulated = 0;
            
            for (let year = 0; year < Math.min(Math.floor(years), usefulLife); year++) {
                const depreciation = cost * ((usefulLife - year) / sumOfYears);
                accumulated += depreciation;
            }
            
            return Math.min(accumulated, cost);
            
        default:
            return this.accumulatedDepreciation;
    }
};

// Method to calculate depreciation for a period
assetSchema.methods.calculateDepreciationForPeriod = async function(startDate, endDate) {
    if (this.depreciationMethod === 'none') return 0;
    
    const startDepr = await this.calculateAccumulatedDepreciation(startDate);
    const endDepr = await this.calculateAccumulatedDepreciation(endDate);
    
    return endDepr - startDepr;
};

// Method to calculate monthly depreciation
assetSchema.methods.calculateMonthlyDepreciation = async function() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return this.calculateDepreciationForPeriod(startOfMonth, endOfMonth);
};

// Method to get depreciation projection
assetSchema.methods.getDepreciationProjection = async function(years = 5) {
    const projection = [];
    const startDate = new Date();
    
    for (let i = 0; i < years; i++) {
        const yearStart = new Date(startDate.getFullYear() + i, 0, 1);
        const yearEnd = new Date(startDate.getFullYear() + i, 11, 31);
        
        const yearlyDepr = await this.calculateDepreciationForPeriod(yearStart, yearEnd);
        const bookValue = await this.calculateBookValue(yearEnd);
        
        projection.push({
            year: startDate.getFullYear() + i,
            depreciation: yearlyDepr,
            bookValue
        });
    }
    
    return projection;
};

// Method to post depreciation
assetSchema.methods.postDepreciation = async function(period, amount, userId) {
    const JournalEntry = mongoose.model('JournalEntry');
    
    // Create journal entry for depreciation
    const journalEntry = await JournalEntry.create({
        organization: this.organization,
        journalNumber: `DEPR-${this.assetNumber}-${Date.now()}`,
        journalType: 'adjusting',
        date: new Date(),
        description: `Depreciation for asset: ${this.name}`,
        lines: [
            {
                account: this.depreciationAccount || this.account,
                debit: amount,
                credit: 0,
                description: `Depreciation expense`
            },
            {
                account: this.accumulatedDepreciationAccount || this.account,
                debit: 0,
                credit: amount,
                description: `Accumulated depreciation`
            }
        ],
        createdBy: userId,
        status: 'draft'
    });

    // Update asset
    this.accumulatedDepreciation += amount;
    this.currentValue = await this.calculateBookValue();
    
    this.depreciationSchedule.push({
        period: 'monthly',
        date: new Date(),
        amount,
        accumulatedDepreciation: this.accumulatedDepreciation,
        bookValue: this.currentValue,
        posted: true,
        journalEntry: journalEntry._id
    });

    await this.save();
    
    return journalEntry;
};

// Method to transfer asset
assetSchema.methods.transfer = async function(newDepartment, newCustodian, userId) {
    this.department = newDepartment;
    this.custodian = newCustodian;
    this.updatedBy = userId;
    
    await this.save();
    
    return this;
};

// Method to impair asset
assetSchema.methods.impair = async function(impairmentAmount, reason, userId) {
    this.impairmentLoss += impairmentAmount;
    this.currentValue = await this.calculateBookValue();
    this.notes = `Impairment recorded: ${reason}\n${this.notes || ''}`;
    this.updatedBy = userId;
    
    await this.save();
    
    return this;
};

// Static method to get assets due for depreciation
assetSchema.statics.getAssetsDueForDepreciation = async function(organizationId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return this.find({
        organization: organizationId,
        status: 'active',
        depreciationMethod: { $ne: 'none' },
        purchaseDate: { $lte: endOfMonth }
    });
};

// Static method to get assets by custodian
assetSchema.statics.getAssetsByCustodian = async function(organizationId, custodianId) {
    return this.find({
        organization: organizationId,
        custodian: custodianId,
        status: 'active'
    });
};

module.exports = mongoose.model('Asset', assetSchema);