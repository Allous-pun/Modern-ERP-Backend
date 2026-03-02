// src/controllers/hr/leave.controller.js
const { Leave, Employee } = require('../../models/hr');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all leave requests
// @route   GET /api/hr/leaves
// @access  Private (requires hr.leave_view)
const getLeaveRequests = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            status,
            employeeId,
            startDate,
            endDate,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { organization: organizationId };
        
        if (status) filter.status = status;
        if (employeeId) filter.employee = employeeId;
        
        if (startDate || endDate) {
            filter.$or = [
                { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
                { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const leaves = await Leave.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('employee', 'firstName lastName employeeId department')
            .populate('approvedBy', 'firstName lastName');

        const total = await Leave.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: leaves,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get leave requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave requests'
        });
    }
};

// @desc    Get single leave request
// @route   GET /api/hr/leaves/:id
// @access  Private (requires hr.leave_view)
const getLeaveRequest = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const leave = await Leave.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('employee', 'firstName lastName employeeId department')
        .populate('approvedBy', 'firstName lastName');

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: 'Leave request not found'
            });
        }

        res.status(200).json({
            success: true,
            data: leave
        });
    } catch (error) {
        console.error('Get leave request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leave request'
        });
    }
};

// @desc    Create leave request
// @route   POST /api/hr/leaves
// @access  Private (requires hr.leave_apply)
const createLeaveRequest = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { employeeId, leaveType, startDate, endDate, reason } = req.body;

        // Check employee leave balance
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const daysRequested = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

        // Check if sufficient balance
        const balance = employee.leaveBalance[leaveType];
        if (balance < daysRequested) {
            return res.status(400).json({
                success: false,
                message: `Insufficient leave balance. Available: ${balance}, Requested: ${daysRequested}`
            });
        }

        // Check for overlapping leave
        const overlapping = await Leave.findOne({
            organization: organizationId,
            employee: employeeId,
            status: { $in: ['pending', 'approved'] },
            $or: [
                { startDate: { $lte: new Date(endDate), $gte: new Date(startDate) } },
                { endDate: { $lte: new Date(endDate), $gte: new Date(startDate) } }
            ]
        });

        if (overlapping) {
            return res.status(400).json({
                success: false,
                message: 'Employee already has leave request for this period'
            });
        }

        const leave = await Leave.create({
            organization: organizationId,
            employee: employeeId,
            leaveType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            days: daysRequested,
            reason,
            status: 'pending',
            appliedBy: req.user.userId
        });

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'leave_applied',
            target: leave._id,
            details: {
                employeeId,
                leaveType,
                days: daysRequested
            }
        });

        res.status(201).json({
            success: true,
            message: 'Leave request submitted successfully',
            data: leave
        });
    } catch (error) {
        console.error('Create leave request error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create leave request'
        });
    }
};

// @desc    Update leave request
// @route   PUT /api/hr/leaves/:id
// @access  Private (requires hr.leave_apply)
const updateLeaveRequest = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const leave = await Leave.findOne({ 
            _id: req.params.id,
            organization: organizationId,
            status: 'pending'
        });

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: 'Leave request not found or cannot be updated'
            });
        }

        // Recalculate days if dates changed
        if (req.body.startDate || req.body.endDate) {
            const start = new Date(req.body.startDate || leave.startDate);
            const end = new Date(req.body.endDate || leave.endDate);
            req.body.days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        Object.assign(leave, req.body);
        await leave.save();

        res.status(200).json({
            success: true,
            message: 'Leave request updated successfully',
            data: leave
        });
    } catch (error) {
        console.error('Update leave request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update leave request'
        });
    }
};

// @desc    Approve leave request
// @route   POST /api/hr/leaves/:id/approve
// @access  Private (requires hr.leave_approve)
const approveLeaveRequest = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { comments } = req.body;

        const leave = await Leave.findOne({ 
            _id: req.params.id,
            organization: organizationId,
            status: 'pending'
        }).populate('employee');

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: 'Leave request not found'
            });
        }

        leave.status = 'approved';
        leave.approvedBy = req.user.userId;
        leave.approvedAt = new Date();
        leave.approvalComments = comments;
        await leave.save();

        // Update employee leave balance
        const employee = await Employee.findById(leave.employee);
        if (employee) {
            employee.leaveBalance[leave.leaveType] -= leave.days;
            await employee.save();
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'leave_approved',
            target: leave._id,
            details: {
                employeeId: leave.employee._id,
                leaveType: leave.leaveType,
                days: leave.days
            }
        });

        res.status(200).json({
            success: true,
            message: 'Leave request approved',
            data: leave
        });
    } catch (error) {
        console.error('Approve leave request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve leave request'
        });
    }
};

// @desc    Reject leave request
// @route   POST /api/hr/leaves/:id/reject
// @access  Private (requires hr.leave_approve)
const rejectLeaveRequest = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const leave = await Leave.findOne({ 
            _id: req.params.id,
            organization: organizationId,
            status: 'pending'
        });

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: 'Leave request not found'
            });
        }

        leave.status = 'rejected';
        leave.rejectionReason = reason;
        leave.rejectedBy = req.user.userId;
        leave.rejectedAt = new Date();
        await leave.save();

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'leave_rejected',
            target: leave._id,
            details: { reason }
        });

        res.status(200).json({
            success: true,
            message: 'Leave request rejected',
            data: leave
        });
    } catch (error) {
        console.error('Reject leave request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject leave request'
        });
    }
};

// @desc    Cancel leave request
// @route   POST /api/hr/leaves/:id/cancel
// @access  Private (requires hr.leave_apply)
const cancelLeaveRequest = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const leave = await Leave.findOne({ 
            _id: req.params.id,
            organization: organizationId,
            status: { $in: ['pending', 'approved'] }
        });

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: 'Leave request not found or cannot be cancelled'
            });
        }

        // If approved, restore leave balance
        if (leave.status === 'approved') {
            const employee = await Employee.findById(leave.employee);
            if (employee) {
                employee.leaveBalance[leave.leaveType] += leave.days;
                await employee.save();
            }
        }

        leave.status = 'cancelled';
        leave.cancelledAt = new Date();
        await leave.save();

        res.status(200).json({
            success: true,
            message: 'Leave request cancelled',
            data: leave
        });
    } catch (error) {
        console.error('Cancel leave request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel leave request'
        });
    }
};

module.exports = {
    getLeaveRequests,
    getLeaveRequest,
    createLeaveRequest,
    updateLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    cancelLeaveRequest
};