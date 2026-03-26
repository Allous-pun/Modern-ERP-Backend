// src/models/finance/costCenter.model.js
const mongoose = require('mongoose');

const costCenterSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Cost Center Identification
    code: {
        type: String,
        required: [true, 'Cost center code is required'],
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: [true, 'Cost center name is required'],
        trim: true
    },
    type: {
        type: String,
        enum: ['department', 'project', 'branch', 'product_line', 'service_line', 'other'],
        required: [true, 'Cost center type is required']
    },
    description: {
        type: String,
        trim: true
    },
    
    // Hierarchy
    parentCostCenter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostCenter'
    },
    
    // Manager/Responsible Person
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    
    // Budget Information
    annualBudget: {
        type: Number,
        default: 0
    },
    currentBudget: {
        type: Number,
        default: 0
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    
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
costCenterSchema.index({ organization: 1, code: 1 }, { unique: true });
costCenterSchema.index({ organization: 1, type: 1 });
costCenterSchema.index({ organization: 1, parentCostCenter: 1 });

// Virtual for full path
costCenterSchema.virtual('fullPath').get(async function() {
    if (!this.parentCostCenter) return this.name;
    const parent = await this.constructor.findById(this.parentCostCenter);
    return parent ? `${parent.fullPath} > ${this.name}` : this.name;
});

// Method to get total allocated costs
costCenterSchema.methods.getAllocatedCosts = async function(startDate, endDate) {
    const CostAllocation = require('./costAllocation.model');
    const allocations = await CostAllocation.find({
        costCenter: this._id,
        date: { $gte: startDate, $lte: endDate }
    });
    
    return allocations.reduce((sum, a) => sum + a.amount, 0);
};

const costAllocationSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Allocation Identification
    allocationNumber: {
        type: String,
        required: [true, 'Allocation number is required'],
        trim: true,
        unique: true
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
        default: Date.now
    },
    
    // Source
    sourceType: {
        type: String,
        enum: ['journal_entry', 'invoice', 'expense', 'direct'],
        required: [true, 'Source type is required']
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'sourceModel'
    },
    sourceModel: {
        type: String,
        enum: ['JournalEntry', 'Invoice', 'Expense']
    },
    
    // Target Cost Center
    costCenter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostCenter',
        required: [true, 'Cost center is required']
    },
    
    // Allocation Details
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: 0
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    allocationMethod: {
        type: String,
        enum: ['direct', 'percentage', 'equal', 'activity_based'],
        default: 'direct'
    },
    
    // For percentage-based allocations
    percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    
    // Notes
    notes: String,
    
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
    timestamps: true
});

// Indexes
costAllocationSchema.index({ organization: 1, allocationNumber: 1 }, { unique: true });
costAllocationSchema.index({ organization: 1, costCenter: 1, date: -1 });
costAllocationSchema.index({ organization: 1, sourceType: 1, sourceId: 1 });

// Static method to generate allocation number
costAllocationSchema.statics.generateAllocationNumber = async function(organizationId) {
    const currentYear = new Date().getFullYear();
    const prefix = `ALLOC-${currentYear}`;
    
    const lastAllocation = await this.findOne({
        organization: organizationId,
        allocationNumber: { $regex: `^${prefix}` }
    }).sort({ allocationNumber: -1 });
    
    let nextNumber = 1;
    if (lastAllocation) {
        const parts = lastAllocation.allocationNumber.split('-');
        const lastNumber = parseInt(parts[parts.length - 1]);
        nextNumber = lastNumber + 1;
    }
    
    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
};

const costSummarySchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    costCenter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CostCenter',
        required: true
    },
    
    period: {
        year: Number,
        month: Number,
        quarter: Number
    },
    
    // Cost Summary
    totalDirectCosts: {
        type: Number,
        default: 0
    },
    totalIndirectCosts: {
        type: Number,
        default: 0
    },
    totalAllocatedCosts: {
        type: Number,
        default: 0
    },
    totalBudget: {
        type: Number,
        default: 0
    },
    variance: {
        type: Number,
        default: 0
    },
    
    // Breakdown by account type
    byAccountType: {
        salaries: { type: Number, default: 0 },
        supplies: { type: Number, default: 0 },
        utilities: { type: Number, default: 0 },
        rent: { type: Number, default: 0 },
        travel: { type: Number, default: 0 },
        training: { type: Number, default: 0 },
        software: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes
costSummarySchema.index({ organization: 1, costCenter: 1, period: { year: 1, month: 1 } });

module.exports = {
    CostCenter: mongoose.model('CostCenter', costCenterSchema),
    CostAllocation: mongoose.model('CostAllocation', costAllocationSchema),
    CostSummary: mongoose.model('CostSummary', costSummarySchema)
};
