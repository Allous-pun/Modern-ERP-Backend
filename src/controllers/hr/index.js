// src/controllers/hr/index.js
const employeeController = require('./employee.controller');
const attendanceController = require('./attendance.controller');
const leaveController = require('./leave.controller');
const performanceController = require('./performance.controller');
const compensationController = require('./compensation.controller');
const trainingController = require('./training.controller');
const reportController = require('./report.controller');

module.exports = {
    // Employee controllers
    getEmployees: employeeController.getEmployees,
    getEmployee: employeeController.getEmployee,
    createEmployee: employeeController.createEmployee,
    updateEmployee: employeeController.updateEmployee,
    deleteEmployee: employeeController.deleteEmployee,
    
    // Attendance controllers
    getAttendance: attendanceController.getAttendance,
    getEmployeeAttendance: attendanceController.getEmployeeAttendance,
    markAttendance: attendanceController.markAttendance,
    updateAttendance: attendanceController.updateAttendance,
    getAttendanceSummary: attendanceController.getAttendanceSummary, // Renamed from getAttendanceReport
    
    // Leave controllers
    getLeaveRequests: leaveController.getLeaveRequests,
    getLeaveRequest: leaveController.getLeaveRequest,
    createLeaveRequest: leaveController.createLeaveRequest,
    updateLeaveRequest: leaveController.updateLeaveRequest,
    approveLeaveRequest: leaveController.approveLeaveRequest,
    rejectLeaveRequest: leaveController.rejectLeaveRequest,
    cancelLeaveRequest: leaveController.cancelLeaveRequest,
    
    // Performance controllers
    getPerformanceReviews: performanceController.getPerformanceReviews,
    getPerformanceReview: performanceController.getPerformanceReview,
    createPerformanceReview: performanceController.createPerformanceReview,
    updatePerformanceReview: performanceController.updatePerformanceReview,
    submitPerformanceReview: performanceController.submitPerformanceReview,
    approvePerformanceReview: performanceController.approvePerformanceReview,
    
    // Compensation controllers
    getCompensation: compensationController.getCompensation,
    getEmployeeCompensation: compensationController.getEmployeeCompensation,
    createCompensation: compensationController.createCompensation,
    updateCompensation: compensationController.updateCompensation,
    getSalaryStructure: compensationController.getSalaryStructure,
    processPayroll: compensationController.processPayroll,
    
    // Training controllers
    getTrainings: trainingController.getTrainings,
    getTraining: trainingController.getTraining,
    createTraining: trainingController.createTraining,
    updateTraining: trainingController.updateTraining,
    deleteTraining: trainingController.deleteTraining,
    enrollEmployee: trainingController.enrollEmployee,
    trackProgress: trainingController.trackProgress,
    
    // Report controllers (these stay the same)
    getHeadcountReport: reportController.getHeadcountReport,
    getTurnoverReport: reportController.getTurnoverReport,
    getAttendanceReport: reportController.getAttendanceReport,  // This is the report version
    getLeaveReport: reportController.getLeaveReport,
    getPerformanceReport: reportController.getPerformanceReport,
    getTrainingReport: reportController.getTrainingReport,
    getDashboard: reportController.getDashboard
};