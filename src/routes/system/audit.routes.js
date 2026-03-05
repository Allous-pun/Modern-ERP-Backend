// src/routes/system/audit.routes.js
const express = require('express');
const {
    getAuditLogs,
    getAuditLogById,
    getAuditStats,
    exportAuditLogs,
    getAuditLogsByTarget,
    cleanupAuditLogs
} = require('../../controllers/system/audit.controller');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

// ============================================
// AUDIT LOGS ROUTES
// ============================================

/**
 * @route   GET /api/system/audit-logs/stats
 * @desc    Get audit log statistics
 * @access  Private (requires system.audit_view)
 */
router.get('/stats', requirePermission('system.audit_view'), getAuditStats);

/**
 * @route   GET /api/system/audit-logs/export
 * @desc    Export audit logs
 * @access  Private (requires system.audit_view)
 */
router.get('/export', requirePermission('system.audit_view'), exportAuditLogs);

/**
 * @route   GET /api/system/audit-logs/target/:targetType/:targetId
 * @desc    Get audit logs for a specific target
 * @access  Private (requires system.audit_view)
 */
router.get('/target/:targetType/:targetId', 
    requirePermission('system.audit_view'), 
    getAuditLogsByTarget
);

/**
 * @route   GET /api/system/audit-logs
 * @desc    Get all audit logs with filters
 * @access  Private (requires system.audit_view)
 */
router.get('/', requirePermission('system.audit_view'), getAuditLogs);

/**
 * @route   GET /api/system/audit-logs/:id
 * @desc    Get audit log by ID
 * @access  Private (requires system.audit_view)
 */
router.get('/:id', requirePermission('system.audit_view'), getAuditLogById);

/**
 * @route   DELETE /api/system/audit-logs/cleanup
 * @desc    Clean up old audit logs
 * @access  Private (requires system.audit_manage)
 */
router.delete('/cleanup', requirePermission('system.audit_manage'), cleanupAuditLogs);

module.exports = router;