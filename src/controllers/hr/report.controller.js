// src/controllers/hr/report.controller.js
const ReportingService = require('../../services/hr/reporting.service');

// @desc    Get headcount report
// @route   GET /api/hr/reports/headcount
// @access  Private (requires hr.reports_view)
const getHeadcountReport = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const report = await ReportingService.generateHeadcountReport(
            organizationId,
            req.query
        );
        
        res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Headcount report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate headcount report'
        });
    }
};

// @desc    Get turnover report
// @route   GET /api/hr/reports/turnover
// @access  Private (requires hr.reports_view)
const getTurnoverReport = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }
        
        const report = await ReportingService.generateTurnoverReport(
            organizationId,
            startDate,
            endDate
        );
        
        res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Turnover report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate turnover report'
        });
    }
};

// @desc    Get attendance report
// @route   GET /api/hr/reports/attendance
// @access  Private (requires hr.reports_view)
const getAttendanceReport = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }
        
        const report = await ReportingService.generateAttendanceReport(
            organizationId,
            startDate,
            endDate
        );
        
        res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Attendance report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate attendance report'
        });
    }
};

// @desc    Get leave report
// @route   GET /api/hr/reports/leave/:year
// @access  Private (requires hr.reports_view)
const getLeaveReport = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const year = parseInt(req.params.year);
        
        const report = await ReportingService.generateLeaveReport(
            organizationId,
            year
        );
        
        res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Leave report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate leave report'
        });
    }
};

// @desc    Get performance report
// @route   GET /api/hr/reports/performance/:year
// @access  Private (requires hr.reports_view)
const getPerformanceReport = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const year = parseInt(req.params.year);
        
        const report = await ReportingService.generatePerformanceReport(
            organizationId,
            year
        );
        
        res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Performance report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate performance report'
        });
    }
};

// @desc    Get training report
// @route   GET /api/hr/reports/training
// @access  Private (requires hr.reports_view)
const getTrainingReport = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }
        
        const report = await ReportingService.generateTrainingReport(
            organizationId,
            startDate,
            endDate
        );
        
        res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Training report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate training report'
        });
    }
};

// @desc    Get HR dashboard
// @route   GET /api/hr/dashboard
// @access  Private (requires hr.dashboard_view)
const getDashboard = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const [headcount, attendance, leaves, turnover] = await Promise.all([
            ReportingService.generateHeadcountReport(organizationId),
            ReportingService.generateAttendanceReport(organizationId, startOfMonth, endOfMonth),
            ReportingService.generateLeaveReport(organizationId, today.getFullYear()),
            ReportingService.generateTurnoverReport(organizationId, startOfMonth, endOfMonth)
        ]);
        
        res.status(200).json({
            success: true,
            data: {
                headcount: headcount.total || 0,
                byDepartment: headcount.data || [],
                attendance: {
                    rate: attendance.overall?.attendanceRate || 0,
                    today: attendance.departments?.[0]?.daily?.[attendance.departments[0]?.daily?.length - 1]
                },
                leave: {
                    pending: leaves.byType?.annual?.pending || 0,
                    approved: leaves.byType?.annual?.approved || 0
                },
                turnover: {
                    rate: turnover.turnoverRate?.overall || 0,
                    hires: turnover.hires?.total || 0,
                    terminations: turnover.terminations?.total || 0
                }
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data'
        });
    }
};

module.exports = {
    getHeadcountReport,
    getTurnoverReport,
    getAttendanceReport,  // Now this is defined
    getLeaveReport,
    getPerformanceReport,
    getTrainingReport,
    getDashboard
};