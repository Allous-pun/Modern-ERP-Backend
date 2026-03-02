// src/routes/hr.routes.js
const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { requireModule } = require('../middleware/module.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const hrController = require('../controllers/hr');

const router = express.Router();

// All HR routes require:
// 1. Authentication (protect)
// 2. HR module installed (requireModule)
router.use(protect);
router.use(requireModule('hr'));

// ============================================================================
// EMPLOYEE ROUTES
// ============================================================================

// @route   GET /api/hr/employees
// @desc    Get all employees
// @access  Private (requires hr.employees_view)
router.get('/employees',
    requirePermission('hr.employees_view'),
    hrController.getEmployees
);

// @route   GET /api/hr/employees/:id
// @desc    Get single employee
// @access  Private (requires hr.employees_view)
router.get('/employees/:id',
    requirePermission('hr.employees_view'),
    hrController.getEmployee
);

// @route   POST /api/hr/employees
// @desc    Create new employee
// @access  Private (requires hr.employees_create)
router.post('/employees',
    requirePermission('hr.employees_create'),
    hrController.createEmployee
);

// @route   PUT /api/hr/employees/:id
// @desc    Update employee
// @access  Private (requires hr.employees_update)
router.put('/employees/:id',
    requirePermission('hr.employees_update'),
    hrController.updateEmployee
);

// @route   DELETE /api/hr/employees/:id
// @desc    Delete/terminate employee
// @access  Private (requires hr.employees_delete)
router.delete('/employees/:id',
    requirePermission('hr.employees_delete'),
    hrController.deleteEmployee
);

// ============================================================================
// ATTENDANCE ROUTES
// ============================================================================

// @route   GET /api/hr/attendance
// @desc    Get all attendance records
// @access  Private (requires hr.attendance_view)
router.get('/attendance',
    requirePermission('hr.attendance_view'),
    hrController.getAttendance
);

// @route   GET /api/hr/attendance/employee/:employeeId
// @desc    Get attendance for specific employee
// @access  Private (requires hr.attendance_view)
router.get('/attendance/employee/:employeeId',
    requirePermission('hr.attendance_view'),
    hrController.getEmployeeAttendance
);

// @route   POST /api/hr/attendance/mark
// @desc    Mark attendance
// @access  Private (requires hr.attendance_mark)
router.post('/attendance/mark',
    requirePermission('hr.attendance_mark'),
    hrController.markAttendance
);

// @route   PUT /api/hr/attendance/:id
// @desc    Update attendance record
// @access  Private (requires hr.attendance_manage)
router.put('/attendance/:id',
    requirePermission('hr.attendance_manage'),
    hrController.updateAttendance
);

// @route   GET /api/hr/attendance/report
// @desc    Get attendance summary/report
// @access  Private (requires hr.attendance_view)
router.get('/attendance/report',
    requirePermission('hr.attendance_view'),
    hrController.getAttendanceSummary  // Changed from getAttendanceReport
);

// ============================================================================
// LEAVE ROUTES
// ============================================================================

// @route   GET /api/hr/leaves
// @desc    Get all leave requests
// @access  Private (requires hr.leave_view)
router.get('/leaves',
    requirePermission('hr.leave_view'),
    hrController.getLeaveRequests
);

// @route   GET /api/hr/leaves/:id
// @desc    Get single leave request
// @access  Private (requires hr.leave_view)
router.get('/leaves/:id',
    requirePermission('hr.leave_view'),
    hrController.getLeaveRequest
);

// @route   POST /api/hr/leaves
// @desc    Create leave request
// @access  Private (requires hr.leave_apply)
router.post('/leaves',
    requirePermission('hr.leave_apply'),
    hrController.createLeaveRequest
);

// @route   PUT /api/hr/leaves/:id
// @desc    Update leave request
// @access  Private (requires hr.leave_apply)
router.put('/leaves/:id',
    requirePermission('hr.leave_apply'),
    hrController.updateLeaveRequest
);

// @route   POST /api/hr/leaves/:id/approve
// @desc    Approve leave request
// @access  Private (requires hr.leave_approve)
router.post('/leaves/:id/approve',
    requirePermission('hr.leave_approve'),
    hrController.approveLeaveRequest
);

// @route   POST /api/hr/leaves/:id/reject
// @desc    Reject leave request
// @access  Private (requires hr.leave_approve)
router.post('/leaves/:id/reject',
    requirePermission('hr.leave_approve'),
    hrController.rejectLeaveRequest
);

// @route   POST /api/hr/leaves/:id/cancel
// @desc    Cancel leave request
// @access  Private (requires hr.leave_apply)
router.post('/leaves/:id/cancel',
    requirePermission('hr.leave_apply'),
    hrController.cancelLeaveRequest
);

// ============================================================================
// PERFORMANCE REVIEW ROUTES
// ============================================================================

// @route   GET /api/hr/performance
// @desc    Get all performance reviews
// @access  Private (requires hr.performance_view)
router.get('/performance',
    requirePermission('hr.performance_view'),
    hrController.getPerformanceReviews
);

// @route   GET /api/hr/performance/:id
// @desc    Get single performance review
// @access  Private (requires hr.performance_view)
router.get('/performance/:id',
    requirePermission('hr.performance_view'),
    hrController.getPerformanceReview
);

// @route   POST /api/hr/performance
// @desc    Create performance review
// @access  Private (requires hr.performance_create)
router.post('/performance',
    requirePermission('hr.performance_create'),
    hrController.createPerformanceReview
);

// @route   PUT /api/hr/performance/:id
// @desc    Update performance review
// @access  Private (requires hr.performance_update)
router.put('/performance/:id',
    requirePermission('hr.performance_update'),
    hrController.updatePerformanceReview
);

// @route   POST /api/hr/performance/:id/submit
// @desc    Submit performance review
// @access  Private (requires hr.performance_update)
router.post('/performance/:id/submit',
    requirePermission('hr.performance_update'),
    hrController.submitPerformanceReview
);

// @route   POST /api/hr/performance/:id/approve
// @desc    Approve performance review
// @access  Private (requires hr.performance_approve)
router.post('/performance/:id/approve',
    requirePermission('hr.performance_approve'),
    hrController.approvePerformanceReview
);

// ============================================================================
// COMPENSATION ROUTES
// ============================================================================

// @route   GET /api/hr/compensation
// @desc    Get all compensation records
// @access  Private (requires hr.compensation_view)
router.get('/compensation',
    requirePermission('hr.compensation_view'),
    hrController.getCompensation
);

// @route   GET /api/hr/compensation/employee/:employeeId
// @desc    Get compensation for specific employee
// @access  Private (requires hr.compensation_view)
router.get('/compensation/employee/:employeeId',
    requirePermission('hr.compensation_view'),
    hrController.getEmployeeCompensation
);

// @route   POST /api/hr/compensation
// @desc    Create compensation record
// @access  Private (requires hr.compensation_manage)
router.post('/compensation',
    requirePermission('hr.compensation_manage'),
    hrController.createCompensation
);

// @route   PUT /api/hr/compensation/:id
// @desc    Update compensation record
// @access  Private (requires hr.compensation_manage)
router.put('/compensation/:id',
    requirePermission('hr.compensation_manage'),
    hrController.updateCompensation
);

// @route   GET /api/hr/compensation/salary-structure
// @desc    Get salary structure
// @access  Private (requires hr.compensation_view)
router.get('/compensation/salary-structure',
    requirePermission('hr.compensation_view'),
    hrController.getSalaryStructure
);

// @route   POST /api/hr/compensation/process-payroll
// @desc    Process payroll
// @access  Private (requires hr.payroll_process)
router.post('/compensation/process-payroll',
    requirePermission('hr.payroll_process'),
    hrController.processPayroll
);

// ============================================================================
// TRAINING ROUTES
// ============================================================================

// @route   GET /api/hr/trainings
// @desc    Get all trainings
// @access  Private (requires hr.training_view)
router.get('/trainings',
    requirePermission('hr.training_view'),
    hrController.getTrainings
);

// @route   GET /api/hr/trainings/:id
// @desc    Get single training
// @access  Private (requires hr.training_view)
router.get('/trainings/:id',
    requirePermission('hr.training_view'),
    hrController.getTraining
);

// @route   POST /api/hr/trainings
// @desc    Create training
// @access  Private (requires hr.training_create)
router.post('/trainings',
    requirePermission('hr.training_create'),
    hrController.createTraining
);

// @route   PUT /api/hr/trainings/:id
// @desc    Update training
// @access  Private (requires hr.training_update)
router.put('/trainings/:id',
    requirePermission('hr.training_update'),
    hrController.updateTraining
);

// @route   DELETE /api/hr/trainings/:id
// @desc    Delete training
// @access  Private (requires hr.training_manage)
router.delete('/trainings/:id',
    requirePermission('hr.training_manage'),
    hrController.deleteTraining
);

// @route   POST /api/hr/trainings/:id/enroll
// @desc    Enroll employee in training
// @access  Private (requires hr.training_enroll)
router.post('/trainings/:id/enroll',
    requirePermission('hr.training_enroll'),
    hrController.enrollEmployee
);

// @route   PUT /api/hr/trainings/:trainingId/participants/:employeeId
// @desc    Track training progress
// @access  Private (requires hr.training_track)
router.put('/trainings/:trainingId/participants/:employeeId',
    requirePermission('hr.training_track'),
    hrController.trackProgress
);

// ============================================================================
// REPORTING ROUTES
// ============================================================================

// @route   GET /api/hr/reports/headcount
// @desc    Generate headcount report
// @access  Private (requires hr.reports_view)
router.get('/reports/headcount',
    requirePermission('hr.reports_view'),
    hrController.getHeadcountReport
);

// @route   GET /api/hr/reports/turnover
// @desc    Generate turnover report
// @access  Private (requires hr.reports_view)
router.get('/reports/turnover',
    requirePermission('hr.reports_view'),
    hrController.getTurnoverReport
);

// @route   GET /api/hr/reports/attendance
// @desc    Generate attendance report
// @access  Private (requires hr.reports_view)
router.get('/reports/attendance',
    requirePermission('hr.reports_view'),
    hrController.getAttendanceReport
);

// @route   GET /api/hr/reports/leave/:year
// @desc    Generate leave report
// @access  Private (requires hr.reports_view)
router.get('/reports/leave/:year',
    requirePermission('hr.reports_view'),
    hrController.getLeaveReport
);

// @route   GET /api/hr/reports/performance/:year
// @desc    Generate performance report
// @access  Private (requires hr.reports_view)
router.get('/reports/performance/:year',
    requirePermission('hr.reports_view'),
    hrController.getPerformanceReport
);

// @route   GET /api/hr/reports/training
// @desc    Generate training report
// @access  Private (requires hr.reports_view)
router.get('/reports/training',
    requirePermission('hr.reports_view'),
    hrController.getTrainingReport
);

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

// @route   GET /api/hr/dashboard
// @desc    Get HR dashboard data
// @access  Private (requires hr.dashboard_view)
router.get('/dashboard',
    requirePermission('hr.dashboard_view'),
    hrController.getDashboard
);

module.exports = router;