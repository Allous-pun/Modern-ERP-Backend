// src/controllers/hr/attendance.controller.js
const { Attendance } = require('../../models/hr');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all attendance records
// @route   GET /api/hr/attendance
// @access  Private (requires hr.attendance_view)
const getAttendance = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            startDate,
            endDate,
            department,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { organization: organizationId };
        
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const attendance = await Attendance.find(filter)
            .sort({ date: -1, checkIn: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('employee', 'firstName lastName employeeId department');

        const total = await Attendance.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: attendance,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch attendance records'
        });
    }
};

// @desc    Get employee attendance
// @route   GET /api/hr/attendance/employee/:employeeId
// @access  Private (requires hr.attendance_view)
const getEmployeeAttendance = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { startDate, endDate } = req.query;

        const filter = { 
            organization: organizationId,
            employee: req.params.employeeId
        };

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        const attendance = await Attendance.find(filter)
            .sort({ date: -1 });

        res.status(200).json({
            success: true,
            count: attendance.length,
            data: attendance
        });
    } catch (error) {
        console.error('Get employee attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee attendance'
        });
    }
};

// @desc    Mark attendance
// @route   POST /api/hr/attendance/mark
// @access  Private (requires hr.attendance_mark)
const markAttendance = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { employeeId, date, checkIn, checkOut, status, notes } = req.body;

        // Check if attendance already marked for this date
        const existingAttendance = await Attendance.findOne({
            organization: organizationId,
            employee: employeeId,
            date: new Date(date)
        });

        if (existingAttendance) {
            return res.status(400).json({
                success: false,
                message: 'Attendance already marked for this date'
            });
        }

        const attendance = await Attendance.create({
            organization: organizationId,
            employee: employeeId,
            date: new Date(date),
            checkIn: checkIn ? new Date(checkIn) : null,
            checkOut: checkOut ? new Date(checkOut) : null,
            status,
            notes,
            markedBy: req.user.userId
        });

        // Calculate working hours if both check-in and check-out are provided
        if (attendance.checkIn && attendance.checkOut) {
            const hours = (attendance.checkOut - attendance.checkIn) / (1000 * 60 * 60);
            attendance.workingHours = Math.round(hours * 100) / 100;
            await attendance.save();
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'attendance_marked',
            target: attendance._id,
            details: {
                employeeId,
                date,
                status
            }
        });

        res.status(201).json({
            success: true,
            message: 'Attendance marked successfully',
            data: attendance
        });
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark attendance'
        });
    }
};

// @desc    Update attendance
// @route   PUT /api/hr/attendance/:id
// @access  Private (requires hr.attendance_manage)
const updateAttendance = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const attendance = await Attendance.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        // Recalculate working hours
        if (attendance.checkIn && attendance.checkOut) {
            const hours = (attendance.checkOut - attendance.checkIn) / (1000 * 60 * 60);
            attendance.workingHours = Math.round(hours * 100) / 100;
            await attendance.save();
        }

        res.status(200).json({
            success: true,
            message: 'Attendance updated successfully',
            data: attendance
        });
    } catch (error) {
        console.error('Update attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update attendance'
        });
    }
};

// @desc    Get attendance summary (not report)
// @route   GET /api/hr/attendance/summary
// @access  Private (requires hr.attendance_view)
const getAttendanceSummary = async (req, res) => {  // Renamed from getAttendanceReport
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { startDate, endDate, department } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const match = {
            organization: mongoose.Types.ObjectId(organizationId),
            date: { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate) 
            }
        };

        const report = await Attendance.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'employees',
                    localField: 'employee',
                    foreignField: '_id',
                    as: 'employeeInfo'
                }
            },
            { $unwind: '$employeeInfo' },
            {
                $group: {
                    _id: {
                        employee: '$employee',
                        department: '$employeeInfo.department',
                        status: '$status'
                    },
                    count: { $sum: 1 },
                    totalHours: { $sum: '$workingHours' },
                    employeeName: { $first: '$employeeInfo.firstName' },
                    employeeLastName: { $first: '$employeeInfo.lastName' }
                }
            },
            {
                $group: {
                    _id: '$_id.department',
                    employees: {
                        $push: {
                            employeeId: '$_id.employee',
                            name: { $concat: ['$employeeName', ' ', '$employeeLastName'] },
                            present: {
                                $sum: { $cond: [{ $eq: ['$_id.status', 'present'] }, '$count', 0] }
                            },
                            absent: {
                                $sum: { $cond: [{ $eq: ['$_id.status', 'absent'] }, '$count', 0] }
                            },
                            late: {
                                $sum: { $cond: [{ $eq: ['$_id.status', 'late'] }, '$count', 0] }
                            },
                            halfDay: {
                                $sum: { $cond: [{ $eq: ['$_id.status', 'half-day'] }, '$count', 0] }
                            },
                            totalHours: '$totalHours'
                        }
                    },
                    totalPresent: { $sum: { $cond: [{ $eq: ['$_id.status', 'present'] }, '$count', 0] } },
                    totalAbsent: { $sum: { $cond: [{ $eq: ['$_id.status', 'absent'] }, '$count', 0] } },
                    totalLate: { $sum: { $cond: [{ $eq: ['$_id.status', 'late'] }, '$count', 0] } },
                    totalHalfDay: { $sum: { $cond: [{ $eq: ['$_id.status', 'half-day'] }, '$count', 0] } },
                    totalHours: { $sum: '$totalHours' }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Get attendance summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate attendance summary'
        });
    }
};


module.exports = {
    getAttendance,
    getEmployeeAttendance,
    markAttendance,
    updateAttendance,
    getAttendanceSummary
};