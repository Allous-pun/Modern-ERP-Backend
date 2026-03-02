// src/models/hr/compensation.model.js
const mongoose = require('mongoose');

const compensationSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Employee
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: [true, 'Employee is required'],
        index: true
    },
    
    // Compensation Type
    type: {
        type: String,
        required: [true, 'Compensation type is required'],
        enum: ['salary', 'bonus', 'commission', 'allowance', 'reimbursement', 'benefit', 'other'],
        index: true
    },
    
    // Amount
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    
    // Frequency
    frequency: {
        type: String,
        required: [true, 'Frequency is required'],
        enum: ['one-time', 'hourly', 'daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'],
        default: 'monthly'
    },
    
    // Dates
    effectiveDate: {
        type: Date,
        required: [true, 'Effective date is required']
    },
    endDate: Date,
    
    // Status
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: ['active', 'inactive', 'pending'],
        default: 'active'
    },
    
    // For salary changes
    previousAmount: Number,
    reason: {
        type: String,
        trim: true,
        maxlength: [500, 'Reason cannot exceed 500 characters']
    },
    
    // Components (for salary breakdown)
    components: [{
        name: {
            type: String,
            required: [true, 'Component name is required']
        },
        type: {
            type: String,
            enum: ['base', 'housing', 'transport', 'meal', 'education', 'other']
        },
        amount: {
            type: Number,
            required: [true, 'Component amount is required'],
            min: [0, 'Amount cannot be negative']
        },
        isTaxable: {
            type: Boolean,
            default: true
        }
    }],
    
    // Deductions
    deductions: [{
        name: String,
        type: {
            type: String,
            enum: ['tax', 'pension', 'insurance', 'loan', 'other']
        },
        amount: Number,
        percentage: {
            type: Number,
            min: 0,
            max: 100
        }
    }],
    
    // Approval
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator is required']
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
compensationSchema.index({ organization: 1, employee: 1, type: 1 });
compensationSchema.index({ organization: 1, employee: 1, effectiveDate: -1 });
compensationSchema.index({ organization: 1, status: 1 });

// Virtual for annualized amount
compensationSchema.virtual('annualizedAmount').get(function() {
    if (this.frequency === 'annual') return this.amount;
    if (this.frequency === 'monthly') return this.amount * 12;
    if (this.frequency === 'bi-weekly') return this.amount * 26;
    if (this.frequency === 'weekly') return this.amount * 52;
    if (this.frequency === 'daily') return this.amount * 260;
    if (this.frequency === 'hourly') return this.amount * 2080;
    return this.amount;
});

// Virtual for total components
compensationSchema.virtual('totalComponents').get(function() {
    return this.components.reduce((sum, c) => sum + c.amount, 0);
});

// Virtual for total deductions
compensationSchema.virtual('totalDeductions').get(function() {
    let total = 0;
    this.deductions.forEach(d => {
        if (d.amount) total += d.amount;
        if (d.percentage) total += (this.amount * d.percentage / 100);
    });
    return total;
});

// Virtual for net amount
compensationSchema.virtual('netAmount').get(function() {
    return this.amount + this.totalComponents - this.totalDeductions;
});

// Method to activate
compensationSchema.methods.activate = async function() {
    // Deactivate previous active compensation of same type
    await this.model('Compensation').updateMany(
        {
            organization: this.organization,
            employee: this.employee,
            type: this.type,
            status: 'active'
        },
        {
            status: 'inactive',
            endDate: this.effectiveDate
        }
    );
    
    this.status = 'active';
    await this.save();
};

// Method to deactivate
compensationSchema.methods.deactivate = async function(reason) {
    this.status = 'inactive';
    this.endDate = new Date();
    if (reason) this.notes = `Deactivated: ${reason}`;
    await this.save();
};

// Static method to get salary history
compensationSchema.statics.getSalaryHistory = async function(organizationId, employeeId) {
    return this.find({
        organization: organizationId,
        employee: employeeId,
        type: 'salary'
    })
    .sort({ effectiveDate: -1 })
    .select('amount currency effectiveDate endDate status reason');
};

// Static method to get compensation summary
compensationSchema.statics.getCompensationSummary = async function(organizationId, department) {
    const match = {
        organization: mongoose.Types.ObjectId(organizationId),
        type: 'salary',
        status: 'active'
    };

    if (department) {
        const employees = await mongoose.model('Employee').find({ 
            organization: organizationId,
            department 
        }).select('_id');
        match.employee = { $in: employees.map(e => e._id) };
    }

    const pipeline = [
        { $match: match },
        {
            $group: {
                _id: null,
                count: { $sum: 1 },
                totalPayroll: { $sum: '$amount' },
                averageSalary: { $avg: '$amount' },
                minSalary: { $min: '$amount' },
                maxSalary: { $max: '$amount' },
                medianSalary: { $push: '$amount' }
            }
        }
    ];

    const result = await this.aggregate(pipeline);
    
    if (result.length > 0) {
        const median = result[0].medianSalary.sort((a, b) => a - b);
        const mid = Math.floor(median.length / 2);
        result[0].medianSalary = median.length % 2 === 0 
            ? (median[mid - 1] + median[mid]) / 2 
            : median[mid];
    }

    return result[0] || { count: 0, totalPayroll: 0 };
};

module.exports = mongoose.model('Compensation', compensationSchema);