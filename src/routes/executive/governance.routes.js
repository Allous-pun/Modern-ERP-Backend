// src/routes/executive/governance.routes.js
const express = require('express');
const router = express.Router();
const attachSettings = require('../../middleware/settings.middleware');
const {
    // Board Meetings
    getBoardMeetings,
    getBoardMeetingById,
    createBoardMeeting,
    updateBoardMeeting,
    updateMeetingMinutes,
    approveMeetingMinutes,
    recordAttendance,
    
    // Resolutions
    getResolutions,
    createResolution,
    castVote,
    updateResolutionStatus,
    
    // Reports
    generateGovernanceReport,
    getGovernanceReports,
    getGovernanceReportById,
    updateGovernanceReport,
    updateReportStatus,
    deleteGovernanceReport
} = require('../../controllers/executive/governance.controller');
const { requirePermission } = require('../../middleware/permission.middleware');
const { body } = require('express-validator');

// Validation middleware
const validateMeeting = [
    body('title').notEmpty().withMessage('Title is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('attendees').isArray().withMessage('Attendees must be an array'),
    (req, res, next) => {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    }
];

const validateResolution = [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').isIn(['financial', 'governance', 'strategic', 'operational', 'hr', 'legal'])
        .withMessage('Invalid category'),
    body('effectiveDate').isISO8601().withMessage('Valid effective date is required'),
    (req, res, next) => {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    }
];

const validateVote = [
    body('vote').isIn(['for', 'against', 'abstain']).withMessage('Vote must be for, against, or abstain'),
    (req, res, next) => {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    }
];

// ==================== BOARD MEETING ROUTES ====================

router.use(attachSettings); // Ensure settings are attached for all governance routes

// Get all meetings (Chairman, Board Members)
router.get('/meetings', 
    requirePermission('executive.governance_oversight'),
    getBoardMeetings
);

// Get single meeting
router.get('/meetings/:id', 
    requirePermission('executive.governance_oversight'),
    getBoardMeetingById
);

// Create meeting (Chairman, Company Secretary)
router.post('/meetings',
    requirePermission('executive.board_management'),
    validateMeeting,
    createBoardMeeting
);

// Update meeting
router.put('/meetings/:id',
    requirePermission('executive.board_management'),
    validateMeeting,
    updateBoardMeeting
);

// Update minutes
router.put('/meetings/:id/minutes',
    requirePermission('executive.board_management'),
    updateMeetingMinutes
);

// Approve minutes (Chairman only)
router.post('/meetings/:id/minutes/approve',
    requirePermission('executive.board_management'),
    approveMeetingMinutes
);

// Record attendance
router.post('/meetings/:id/attendance',
    requirePermission('executive.board_management'),
    recordAttendance
);

// ==================== RESOLUTION ROUTES ====================

// Get all resolutions
router.get('/resolutions',
    requirePermission('executive.governance_oversight'),
    getResolutions
);

// Create resolution
router.post('/resolutions',
    requirePermission('executive.board_management'),
    validateResolution,
    createResolution
);

// Cast vote
router.post('/resolutions/:id/vote',
    requirePermission('executive.board_management'),
    validateVote,
    castVote
);

// Update resolution status (Chairman, Creator)
router.put('/resolutions/:id/status',
    requirePermission('executive.board_management'),
    [
        body('status').isIn(['draft', 'proposed', 'voting', 'passed', 'defeated', 'implemented', 'archived'])
            .withMessage('Invalid status')
    ],
    (req, res, next) => {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    },
    updateResolutionStatus
);

// ==================== REPORT ROUTES ====================

// Generate governance report
router.post('/reports',
    requirePermission('executive.governance_oversight'),
    generateGovernanceReport
);

// Get all governance reports
router.get('/reports',
    requirePermission('executive.governance_oversight'),
    getGovernanceReports
);

// NEW: Get single report by ID
router.get('/reports/:id',
    requirePermission('executive.governance_oversight'),
    getGovernanceReportById
);

// NEW: Update report
router.put('/reports/:id',
    requirePermission('executive.governance_oversight'),
    updateGovernanceReport
);

// NEW: Update report status
router.put('/reports/:id/status',
    requirePermission('executive.governance_oversight'),
    [
        body('status').isIn(['draft', 'under_review', 'approved', 'rejected'])
            .withMessage('Invalid status')
    ],
    (req, res, next) => {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    },
    updateReportStatus
);

// NEW: Delete report
router.delete('/reports/:id',
    requirePermission('executive.governance_oversight'),
    deleteGovernanceReport
);

module.exports = router;