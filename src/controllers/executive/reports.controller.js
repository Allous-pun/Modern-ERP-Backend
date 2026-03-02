// src/controllers/executive/reports.controller.js
const Report = require('../../models/executive/report.model');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all reports
// @route   GET /api/executive/reports
// @access  Private (requires executive.reports_view)
const getReports = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { type, period } = req.query;

        let query = { organization: organizationId };
        if (type) query.type = type;
        if (period) query.period = period;

        const reports = await Report.find(query).sort('-createdAt');

        // If no reports, return default templates
        if (reports.length === 0) {
            const templates = [
                {
                    id: 'template-1',
                    name: 'Quarterly Business Review',
                    type: 'board',
                    period: 'quarterly',
                    template: true
                },
                {
                    id: 'template-2',
                    name: 'Monthly Performance Dashboard',
                    type: 'executive',
                    period: 'monthly',
                    template: true
                },
                {
                    id: 'template-3',
                    name: 'Annual Report',
                    type: 'shareholder',
                    period: 'annual',
                    template: true
                }
            ];
            
            return res.status(200).json({
                success: true,
                count: templates.length,
                data: templates
            });
        }

        res.status(200).json({
            success: true,
            count: reports.length,
            data: reports
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reports'
        });
    }
};

// @desc    Get single report
// @route   GET /api/executive/reports/:id
// @access  Private (requires executive.reports_view)
const getReport = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const report = await Report.findOne({ _id: id, organization: organizationId });

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch report'
        });
    }
};

// @desc    Create report
// @route   POST /api/executive/reports
// @access  Private (requires executive.reports_create)
const createReport = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const reportData = req.body;

        const report = await Report.create({
            ...reportData,
            organization: organizationId,
            createdBy: req.user.userId,
            generatedAt: new Date()
        });

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'report_created',
            target: report._id,
            details: { name: reportData.name }
        });

        res.status(201).json({
            success: true,
            message: 'Report created successfully',
            data: report
        });
    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create report'
        });
    }
};

// @desc    Export report
// @route   GET /api/executive/reports/:id/export
// @access  Private (requires executive.reports_view)
const exportReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { format = 'pdf' } = req.query;
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const report = await Report.findOne({ _id: id, organization: organizationId });

        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        // Mock export URL
        const exportUrl = `/exports/reports/${id}.${format}`;

        res.status(200).json({
            success: true,
            data: {
                url: exportUrl,
                format,
                generatedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Export report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export report'
        });
    }
};

module.exports = {
    getReports,
    getReport,
    createReport,
    exportReport
};