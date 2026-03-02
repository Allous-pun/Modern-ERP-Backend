// src/models/hr/leave.model.js
const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
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
    
    // Leave Details
    leaveType: {
        type: String,
        required: [true, 'Leave type is required'],
        enum: ['annual', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'unpaid', 'study', 'sabbatical', 'other'],
        index: true
    },
    
    // Dates
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    days: {
        type: Number,
        required: [true, 'Number of days is required'],
        min: [0.5, 'Leave days must be at least 0.5']
    },
    
    // Half day options
    isHalfDay: {
        type: Boolean,
        default: false
    },
    halfDaySession: {
        type: String,
        enum: ['first-half', 'second-half']
    },
    
    // Reason
    reason: {
        type: String,
        required: [true, 'Reason is required'],
        trim: true,
        maxlength: [1000, 'Reason cannot exceed 1000 characters']
    },
    
    // Supporting Documents
    documents: [{
        name: String,
        url: String,
        type: String,
        uploadedAt: Date
    }],
    
    // Contact during leave
    contactNumber: String,
    alternateContact: String,
    
    // Approval Workflow
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending',
        index: true
    },
    
    // Approval Details
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    approvalComments: String,
    
    // Rejection Details
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: String,
    
    // Cancellation
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelledAt: Date,
    cancellationReason: String,
    
    // Workflow History
    workflowHistory: [{
        action: {
            type: String,
            enum: ['submitted', 'approved', 'rejected', 'cancelled']
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        comments: String
    }],
    
    // Metadata
    appliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Applicant is required']
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
leaveSchema.index({ organization: 1, employee: 1, startDate: -1 });
leaveSchema.index({ organization: 1, status: 1 });
leaveSchema.index({ organization: 1, leaveType: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

// Calculate days before save if not provided
leaveSchema.pre('save', function(next) {
    if (!this.days && this.startDate && this.endDate) {
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        const diffTime = Math.abs(end - start);
        this.days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        if (this.isHalfDay) {
            this.days = this.days - 0.5;
        }
    }
    next();
});

// Virtual for is active leave
leaveSchema.virtual('isActive').get(function() {
    const now = new Date();
    return this.status === 'approved' && 
           now >= this.startDate && 
           now <= this.endDate;
});

// Virtual for days remaining
leaveSchema.virtual('daysRemaining').get(function() {
    if (!this.isActive) return 0;
    const now = new Date();
    if (now > this.endDate) return 0;
    const diffTime = Math.abs(this.endDate - now);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for duration in words
leaveSchema.virtual('duration').get(function() {
    if (this.isHalfDay) {
        return `${this.days} days (half day)`;
    }
    return `${this.days} days`;
});

// Method to approve leave
leaveSchema.methods.approve = async function(userId, comments) {
    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
    this.approvalComments = comments;
    
    this.workflowHistory.push({
        action: 'approved',
        user: userId,
        timestamp: new Date(),
        comments
    });
    
    await this.save();
    
    // Update employee leave balance
    const Employee = mongoose.model('Employee');
    const employee = await Employee.findById(this.employee);
    if (employee) {
        await employee.updateLeaveBalance(this.leaveType, this.days, 'deduct');
    }
    
    return this;
};

// Method to reject leave
leaveSchema.methods.reject = async function(userId, reason) {
    this.status = 'rejected';
    this.rejectedBy = userId;
    this.rejectedAt = new Date();
    this.rejectionReason = reason;
    
    this.workflowHistory.push({
        action: 'rejected',
        user: userId,
        timestamp: new Date(),
        comments: reason
    });
    
    await this.save();
    return this;
};

// Method to cancel leave
leaveSchema.methods.cancel = async function(userId, reason) {
    const wasApproved = this.status === 'approved';
    
    this.status = 'cancelled';
    this.cancelledBy = userId;
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
    
    this.workflowHistory.push({
        action: 'cancelled',
        user: userId,
        timestamp: new Date(),
        comments: reason
    });
    
    await this.save();
    
    // Restore leave balance if it was approved
    if (wasApproved) {
        const Employee = mongoose.model('Employee');
        const employee = await Employee.findById(this.employee);
        if (employee) {
            await employee.updateLeaveBalance(this.leaveType, this.days, 'add');
        }
    }
    
    return this;
};

// Static method to get leave calendar
leaveSchema.statics.getLeaveCalendar = async function(organizationId, startDate, endDate) {
    return this.find({
        organization: organizationId,
        status: 'approved',
        $or: [
            { startDate: { $gte: startDate, $lte: endDate } },
            { endDate: { $gte: startDate, $lte: endDate } }
        ]
    })
    .populate('employee', 'firstName lastName employeeId department')
    .sort('startDate');
};

// Static method to get leave summary by employee
leaveSchema.statics.getEmployeeSummary = async function(organizationId, employeeId, year) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const pipeline = [
        {
            $match: {
                organization: mongoose.Types.ObjectId(organizationId),
                employee: mongoose.Types.ObjectId(employeeId),
                startDate: { $gte: startOfYear, $lte: endOfYear }
            }
        },
        {
            $group: {
                _id: '$leaveType',
                totalDays: { $sum: '$days' },
                approvedDays: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'approved'] }, '$days', 0]
                    }
                },
                pendingDays: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'pending'] }, '$days', 0]
                    }
                },
                takenDays: {
                    $sum: {
                        $cond: [
                            { 
                                $and: [
                                    { $eq: ['$status', 'approved'] },
                                    { $lte: ['$startDate', new Date()] }
                                ]
                            },
                            '$days',
                            0
                        ]
                    }
                }
            }
        }
    ];

    return this.aggregate(pipeline);
};

module.exports = mongoose.model('Leave', leaveSchema);