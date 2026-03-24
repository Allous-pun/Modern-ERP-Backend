// src/routes/system/compliance.routes.js
const express = require('express');
const {
    // Overview
    getComplianceOverview,
    
    // Frameworks
    addFramework,
    updateFramework,
    
    // Checklists
    createChecklist,
    updateChecklistItem,
    
    // Audits
    createAudit,
    updateAuditFinding,
    
    // Reports
    getComplianceReports,
    exportComplianceData
} = require('../../controllers/system/compliance.controller');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

// ============================================
// COMPLIANCE OVERVIEW
// ============================================
/**
 * @route   GET /api/system/compliance
 * @desc    Get compliance overview
 * @access  Private (requires security.compliance_view)
 */
router.get('/', requirePermission('security.compliance_view'), getComplianceOverview);

// ============================================
// FRAMEWORK MANAGEMENT
// ============================================
/**
 * @route   POST /api/system/compliance/frameworks
 * @desc    Add compliance framework
 * @access  Private (requires security.compliance_manage)
 */
router.post('/frameworks', requirePermission('security.compliance_manage'), addFramework);

/**
 * @route   PUT /api/system/compliance/frameworks/:frameworkId
 * @desc    Update framework status
 * @access  Private (requires security.compliance_manage)
 */
router.put('/frameworks/:frameworkId', requirePermission('security.compliance_manage'), updateFramework);

// ============================================
// CHECKLIST MANAGEMENT
// ============================================
/**
 * @route   POST /api/system/compliance/checklists
 * @desc    Create compliance checklist
 * @access  Private (requires security.compliance_manage)
 */
router.post('/checklists', requirePermission('security.compliance_manage'), createChecklist);

/**
 * @route   PUT /api/system/compliance/checklists/:checklistId/items/:itemId
 * @desc    Update checklist item status
 * @access  Private (requires security.compliance_manage)
 */
router.put('/checklists/:checklistId/items/:itemId', 
    requirePermission('security.compliance_manage'), 
    updateChecklistItem
);

// ============================================
// AUDIT MANAGEMENT
// ============================================
/**
 * @route   POST /api/system/compliance/audits
 * @desc    Create audit record
 * @access  Private (requires security.compliance_manage)
 */
router.post('/audits', requirePermission('security.compliance_manage'), createAudit);

/**
 * @route   PUT /api/system/compliance/audits/:auditId/findings/:findingId
 * @desc    Update audit finding
 * @access  Private (requires security.compliance_manage)
 */
router.put('/audits/:auditId/findings/:findingId', 
    requirePermission('security.compliance_manage'), 
    updateAuditFinding
);

// ============================================
// REPORTS
// ============================================
/**
 * @route   GET /api/system/compliance/reports
 * @desc    Get compliance reports
 * @access  Private (requires security.compliance_view)
 */
router.get('/reports', requirePermission('security.compliance_view'), getComplianceReports);

/**
 * @route   GET /api/system/compliance/export
 * @desc    Export compliance data
 * @access  Private (requires security.compliance_view)
 */
router.get('/export', requirePermission('security.compliance_view'), exportComplianceData);

module.exports = router;