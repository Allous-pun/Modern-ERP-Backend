// src/routes/executive/reports.routes.js
const express = require('express');
const router = express.Router();
const attachSettings = require('../../middleware/settings.middleware');
const {
    generateBoardReport,
    generateInvestorReport,
    generateESGReport,
    generateExecutiveSummary,
    generateCustomReport,
    getReports,
    getReportById,
    publishReport,
    scheduleReport,
    getScheduledReports,
    downloadReport,
    addReportFeedback,
    getReportTemplates,
    createReportTemplate,
    cleanupReports,
    getReportStats,
    createCustomReportTemplate,
    updateReportTemplate,
    deleteReportTemplate,
    duplicateReportTemplate
} = require('../../controllers/executive/reports.controller');
const { requirePermission } = require('../../middleware/permission.middleware');
const { body, validationResult } = require('express-validator');

// Apply settings middleware to all report routes
router.use(attachSettings);

// ==================== VALIDATION MIDDLEWARE ====================

// Validate date range
const validateDateRange = [
    body('period.startDate').isISO8601().withMessage('Valid start date is required'),
    body('period.endDate').isISO8601().withMessage('Valid end date is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    }
];

// Validate schedule (simplified - no recipients, no recurring)
const validateSchedule = [
    body('name').notEmpty().withMessage('Schedule name is required'),
    body('templateId').isMongoId().withMessage('Valid template ID is required'),
    body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    }
];

// Validate template
const validateTemplate = [
    body('name').notEmpty().withMessage('Template name is required'),
    body('templateType').isIn(['board', 'investor', 'esg', 'executive_summary', 'financial', 'operational', 'strategic', 'custom'])
        .withMessage('Invalid template type'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    }
];

// ==================== STATIC ROUTES (must come BEFORE dynamic /:id routes) ====================

// Get report templates
router.get('/templates/all',
    requirePermission('executive.full_analytics'),
    getReportTemplates
);

// Create report template (standard)
router.post('/templates',
    requirePermission('executive.strategic_planning'),
    validateTemplate,
    createReportTemplate
);

// Create custom report template
router.post('/templates/custom',
    requirePermission('executive.full_analytics'),
    createCustomReportTemplate
);

// Update report template
router.put('/templates/:id',
    requirePermission('executive.full_analytics'),
    updateReportTemplate
);

// Delete report template
router.delete('/templates/:id',
    requirePermission('executive.full_analytics'),
    deleteReportTemplate
);

// Duplicate report template
router.post('/templates/:id/duplicate',
    requirePermission('executive.full_analytics'),
    duplicateReportTemplate
);

// Get scheduled reports
router.get('/scheduled/list',
    requirePermission('executive.full_analytics'),
    getScheduledReports
);

// Schedule report (one-time)
router.post('/schedule',
    requirePermission('executive.full_analytics'),
    validateSchedule,
    scheduleReport
);

// Report stats
router.get('/stats',
    requirePermission('executive.full_analytics'),
    getReportStats
);

// Cleanup reports
router.post('/cleanup',
    requirePermission('executive.full_analytics'),
    cleanupReports
);

// ==================== DYNAMIC ROUTES (with :id parameter) ====================

// Get all reports
router.get('/',
    requirePermission('executive.full_analytics'),
    getReports
);

// Get report by ID (must come AFTER all static routes)
router.get('/:id',
    requirePermission('executive.full_analytics'),
    getReportById
);

// Publish report
router.put('/:id/publish',
    requirePermission('executive.full_analytics'),
    publishReport
);

// Download report
router.get('/:id/download',
    requirePermission('executive.full_analytics'),
    downloadReport
);

// Add report feedback
router.post('/:id/feedback',
    requirePermission('executive.full_analytics'),
    addReportFeedback
);

// ==================== REPORT GENERATION ROUTES ====================

// Generate board report
router.post('/board',
    requirePermission('executive.board_reports'),
    validateDateRange,
    generateBoardReport
);

// Generate investor report
router.post('/investor',
    requirePermission('executive.investor_relations'),
    validateDateRange,
    generateInvestorReport
);

// Generate ESG report
router.post('/esg',
    requirePermission('executive.esg_reporting'),
    validateDateRange,
    generateESGReport
);

// Generate executive summary
router.post('/executive-summary',
    requirePermission('executive.full_analytics'),
    validateDateRange,
    generateExecutiveSummary
);

// Generate custom report
router.post('/custom',
    requirePermission('executive.full_analytics'),
    generateCustomReport
);

module.exports = router;