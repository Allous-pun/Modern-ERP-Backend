// src/routes/system/risk.routes.js
const express = require('express');
const {
    // Risk Register
    getRisks,
    getRisk,
    createRisk,
    updateRisk,
    updateRiskStatus,
    deleteRisk,
    
    // Assessments
    createAssessment,
    getAssessments,
    
    // Dashboard & Reports
    getRiskDashboard,
    exportRisks
} = require('../../controllers/system/risk.controller');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

// ============================================
// RISK DASHBOARD & EXPORT
// ============================================
/**
 * @route   GET /api/system/risks/dashboard
 * @desc    Get risk dashboard with metrics
 * @access  Private (requires security.risk_view)
 */
router.get('/dashboard', requirePermission('security.risk_view'), getRiskDashboard);

/**
 * @route   GET /api/system/risks/export
 * @desc    Export risk register
 * @access  Private (requires security.risk_view)
 */
router.get('/export', requirePermission('security.risk_view'), exportRisks);

// ============================================
// RISK ASSESSMENTS
// ============================================
/**
 * @route   GET /api/system/risks/assessments
 * @desc    Get all risk assessments
 * @access  Private (requires security.risk_view)
 */
router.get('/assessments', requirePermission('security.risk_view'), getAssessments);

/**
 * @route   POST /api/system/risks/assessments
 * @desc    Create a risk assessment
 * @access  Private (requires security.risk_manage)
 */
router.post('/assessments', requirePermission('security.risk_manage'), createAssessment);

// ============================================
// RISK REGISTER
// ============================================
/**
 * @route   GET /api/system/risks
 * @desc    Get all risks
 * @access  Private (requires security.risk_view)
 */
router.get('/', requirePermission('security.risk_view'), getRisks);

/**
 * @route   POST /api/system/risks
 * @desc    Create a new risk
 * @access  Private (requires security.risk_manage)
 */
router.post('/', requirePermission('security.risk_manage'), createRisk);

/**
 * @route   GET /api/system/risks/:riskId
 * @desc    Get single risk by ID
 * @access  Private (requires security.risk_view)
 */
router.get('/:riskId', requirePermission('security.risk_view'), getRisk);

/**
 * @route   PUT /api/system/risks/:riskId
 * @desc    Update a risk
 * @access  Private (requires security.risk_manage)
 */
router.put('/:riskId', requirePermission('security.risk_manage'), updateRisk);

/**
 * @route   PATCH /api/system/risks/:riskId/status
 * @desc    Update risk status
 * @access  Private (requires security.risk_manage)
 */
router.patch('/:riskId/status', requirePermission('security.risk_manage'), updateRiskStatus);

/**
 * @route   DELETE /api/system/risks/:riskId
 * @desc    Delete/archive a risk
 * @access  Private (requires security.risk_manage)
 */
router.delete('/:riskId', requirePermission('security.risk_manage'), deleteRisk);

module.exports = router;