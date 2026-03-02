// src/models/hr/attendance.model.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
    
    // Date
    date: {
        type: Date,
        required: [true, 'Date is required'],
        index: true
    },
    
    // Check In/Out
    checkIn: {
        type: Date,
        required: [true, 'Check-in time is required']
    },
    checkOut: Date,
    
    // Location
    checkInLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: [Number], // [longitude, latitude]
        address: String
    },
    checkOutLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: [Number],
        address: String
    },
    
    // Device Info
    checkInDevice: {
        type: String,
        enum: ['web', 'mobile', 'biometric', 'manual']
    },
    checkOutDevice: {
        type: String,
        enum: ['web', 'mobile', 'biometric', 'manual']
    },
    deviceId: String,
    ipAddress: String,
    
    // Working Hours
    workingHours: {
        type: Number,
        min: [0, 'Working hours cannot be negative'],
        default: 0
    },
    overtimeHours: {
        type: Number,
        min: [0, 'Overtime hours cannot be negative'],
        default: 0
    },
    breakHours: {
        type: Number,
        min: [0, 'Break hours cannot be negative'],
        default: 0
    },
    
    // Status
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: ['present', 'absent', 'late', 'half-day', 'holiday', 'leave'],
        default: 'present',
        index: true
    },
    
    // Late/Absent Reasons
    lateMinutes: {
        type: Number,
        min: [0, 'Late minutes cannot be negative'],
        default: 0
    },
    earlyDepartureMinutes: {
        type: Number,
        min: [0, 'Early departure minutes cannot be negative'],
        default: 0
    },
    
    // Approval
    isApproved: {
        type: Boolean,
        default: false
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    
    // Exceptions
    isException: {
        type: Boolean,
        default: false
    },
    exceptionReason: String,
    
    // Related Leave (if any)
    leaveId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Leave'
    },
    
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    
    // Metadata
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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
attendanceSchema.index({ organization: 1, employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ organization: 1, date: 1 });
attendanceSchema.index({ organization: 1, status: 1 });
attendanceSchema.index({ checkInLocation: '2dsphere' });
attendanceSchema.index({ checkOutLocation: '2dsphere' });

// Calculate working hours before save
attendanceSchema.pre('save', function(next) {
    if (this.checkIn && this.checkOut) {
        const totalMs = this.checkOut - this.checkIn;
        this.workingHours = Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
        
        // Calculate overtime (assuming 8-hour standard workday)
        if (this.workingHours > 8) {
            this.overtimeHours = Math.round((this.workingHours - 8) * 100) / 100;
        }
    }
    next();
});

// Virtual for day of week
attendanceSchema.virtual('dayOfWeek').get(function() {
    return this.date.getDay();
});

// Virtual for week number
attendanceSchema.virtual('weekNumber').get(function() {
    const date = new Date(this.date);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
});

// Virtual for month
attendanceSchema.virtual('month').get(function() {
    return this.date.getMonth() + 1;
});

// Virtual for year
attendanceSchema.virtual('year').get(function() {
    return this.date.getFullYear();
});

// Method to approve attendance
attendanceSchema.methods.approve = async function(userId) {
    this.isApproved = true;
    this.approvedBy = userId;
    this.approvedAt = new Date();
    await this.save();
};

// Static method to get attendance summary
attendanceSchema.statics.getSummary = async function(organizationId, startDate, endDate) {
    const pipeline = [
        {
            $match: {
                organization: mongoose.Types.ObjectId(organizationId),
                date: { $gte: new Date(startDate), $lte: new Date(endDate) }
            }
        },
        {
            $group: {
                _id: '$employee',
                totalDays: { $sum: 1 },
                presentDays: {
                    $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
                },
                absentDays: {
                    $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
                },
                lateDays: {
                    $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
                },
                halfDays: {
                    $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] }
                },
                totalHours: { $sum: '$workingHours' },
                overtimeHours: { $sum: '$overtimeHours' }
            }
        },
        {
            $lookup: {
                from: 'employees',
                localField: '_id',
                foreignField: '_id',
                as: 'employeeInfo'
            }
        },
        { $unwind: '$employeeInfo' },
        {
            $project: {
                employeeId: '$employeeInfo.employeeId',
                name: { $concat: ['$employeeInfo.firstName', ' ', '$employeeInfo.lastName'] },
                department: '$employeeInfo.department',
                totalDays: 1,
                presentDays: 1,
                absentDays: 1,
                lateDays: 1,
                halfDays: 1,
                totalHours: 1,
                overtimeHours: 1,
                attendanceRate: {
                    $multiply: [
                        { $divide: ['$presentDays', '$totalDays'] },
                        100
                    ]
                }
            }
        }
    ];

    return this.aggregate(pipeline);
};

// Static method to get daily attendance
attendanceSchema.statics.getDailyAttendance = async function(organizationId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.find({
        organization: organizationId,
        date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('employee', 'firstName lastName employeeId department');
};

module.exports = mongoose.model('Attendance', attendanceSchema);