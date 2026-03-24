// src/models/finance/expense.model.js
const mongoose = require('mongoose');

const expenseItemSchema = new mongoose.Schema({
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: [
            'travel', 'meals', 'office_supplies', 'utilities', 'rent',
            'equipment', 'software', 'training', 'marketing', 'professional_fees',
            'insurance', 'maintenance', 'fuel', 'parking', 'other'
        ]
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    taxRate: {
        type: Number,
        default: 0,
        min: [0, 'Tax rate cannot be negative'],
        max: [100, 'Tax rate cannot exceed 100%']
    },
    taxAmount: {
        type: Number,
        default: 0,
        min: [0, 'Tax amount cannot be negative']
    },
    totalAmount: {
        type: Number,
        required: true,
        min: [0, 'Total amount cannot be negative']
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Account is required']
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    department: String
}, { _id: true });

const expenseSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Expense Identity
    expenseNumber: {
        type: String,
        required: [true, 'Expense number is required'],
        unique: true,
        trim: true
    },
    expenseType: {
        type: String,
        enum: ['employee_reimbursement', 'direct_payment', 'credit_card', 'petty_cash'],
        required: true,
        default: 'employee_reimbursement'
    },
    
    // Employee
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    employeeName: {
        type: String,
        required: [true, 'Employee name is required'],
        trim: true
    },
    employeeEmail: String,
    employeeId: String,
    department: String,
    
    // Dates
    expenseDate: {
        type: Date,
        required: [true, 'Expense date is required'],
        default: Date.now,
        index: true
    },
    submittedDate: {
        type: Date,
        default: Date.now
    },
    approvedDate: Date,
    paidDate: Date,
    
    // Items
    items: [expenseItemSchema],
    
    // Totals
    subtotal: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Subtotal cannot be negative']
    },
    taxTotal: {
        type: Number,
        default: 0,
        min: [0, 'Tax total cannot be negative']
    },
    totalAmount: {
        type: Number,
        required: true,
        min: [0, 'Total amount cannot be negative']
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    
    // Payment
    paymentMethod: {
        type: String,
        enum: ['cash', 'bank_transfer', 'check', 'credit_card', 'other']
    },
    paymentReference: String,
    paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Status
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: ['draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled'],
        default: 'draft',
        index: true
    },
    
    // Approvals
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvalNotes: String,
    rejectionReason: String,
    
    // Receipts
    receipts: [{
        filename: String,
        url: String,
        type: String,
        size: Number,
        uploadedAt: Date
    }],
    
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
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
expenseSchema.index({ organization: 1, expenseNumber: 1 }, { unique: true });
expenseSchema.index({ organization: 1, employee: 1 });
expenseSchema.index({ organization: 1, expenseDate: 1 });
expenseSchema.index({ organization: 1, status: 1 });
expenseSchema.index({ organization: 1, department: 1 });

// Calculate totals before saving
expenseSchema.pre('save', function(next) {
    // Calculate item totals
    this.items.forEach(item => {
        item.taxAmount = item.amount * (item.taxRate / 100);
        item.totalAmount = item.amount + item.taxAmount;
    });
    
    // Calculate expense totals
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
    this.taxTotal = this.items.reduce((sum, item) => sum + item.taxAmount, 0);
    this.totalAmount = this.subtotal + this.taxTotal;
    
    next();
});

// Virtual for item count
expenseSchema.virtual('itemCount').get(function() {
    return this.items?.length || 0;
});

// Method to submit expense
expenseSchema.methods.submit = async function(userId) {
    if (this.status !== 'draft') {
        throw new Error('Only draft expenses can be submitted');
    }
    
    this.status = 'submitted';
    this.submittedDate = new Date();
    this.updatedBy = userId;
    
    await this.save();
    return this;
};

// Method to approve expense
expenseSchema.methods.approve = async function(userId, notes) {
    if (this.status !== 'submitted') {
        throw new Error('Only submitted expenses can be approved');
    }
    
    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedDate = new Date();
    this.approvalNotes = notes;
    this.updatedBy = userId;
    
    await this.save();
    return this;
};

// Method to reject expense
expenseSchema.methods.reject = async function(userId, reason) {
    if (this.status !== 'submitted') {
        throw new Error('Only submitted expenses can be rejected');
    }
    
    this.status = 'rejected';
    this.rejectionReason = reason;
    this.updatedBy = userId;
    
    await this.save();
    return this;
};

// Method to mark as paid
expenseSchema.methods.markAsPaid = async function(userId, paymentReference) {
    if (this.status !== 'approved') {
        throw new Error('Only approved expenses can be marked as paid');
    }
    
    this.status = 'paid';
    this.paidDate = new Date();
    this.paymentReference = paymentReference;
    this.paidBy = userId;
    this.updatedBy = userId;
    
    await this.save();
    return this;
};

// Static method to get expenses by employee
expenseSchema.statics.getExpensesByEmployee = async function(organizationId, employeeId, startDate, endDate) {
    const query = {
        organization: organizationId,
        employee: employeeId
    };
    
    if (startDate || endDate) {
        query.expenseDate = {};
        if (startDate) query.expenseDate.$gte = startDate;
        if (endDate) query.expenseDate.$lte = endDate;
    }
    
    return this.find(query).sort('-expenseDate');
};

// Static method to get expenses by department
expenseSchema.statics.getExpensesByDepartment = async function(organizationId, department, startDate, endDate) {
    const query = {
        organization: organizationId,
        department
    };
    
    if (startDate || endDate) {
        query.expenseDate = {};
        if (startDate) query.expenseDate.$gte = startDate;
        if (endDate) query.expenseDate.$lte = endDate;
    }
    
    return this.find(query).sort('-expenseDate');
};

// Static method to get expense summary
expenseSchema.statics.getExpenseSummary = async function(organizationId, startDate, endDate) {
    const pipeline = [
        {
            $match: {
                organization: mongoose.Types.ObjectId(organizationId),
                expenseDate: { $gte: startDate, $lte: endDate },
                status: { $in: ['approved', 'paid'] }
            }
        },
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$totalAmount' },
                count: { $sum: 1 },
                averageAmount: { $avg: '$totalAmount' }
            }
        }
    ];
    
    const result = await this.aggregate(pipeline);
    return result[0] || { totalAmount: 0, count: 0, averageAmount: 0 };
};

module.exports = mongoose.model('Expense', expenseSchema);