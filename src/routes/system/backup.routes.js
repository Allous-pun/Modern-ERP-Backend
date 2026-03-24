// src/routes/system/backup.routes.js
const express = require('express');
const {
    getBackups,
    getBackup,
    createBackup,
    restoreBackup,
    downloadBackup,
    deleteBackup,
    getBackupStats
} = require('../../controllers/system/backup.controller');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

// ============================================
// BACKUP MANAGEMENT ROUTES
// ============================================

/**
 * @route   GET /api/system/backups/stats
 * @desc    Get backup statistics
 * @access  Private (requires system.backups_manage)
 */
router.get('/stats', requirePermission('system.backups_manage'), getBackupStats);

/**
 * @route   GET /api/system/backups
 * @desc    Get all backups
 * @access  Private (requires system.backups_manage)
 */
router.get('/', requirePermission('system.backups_manage'), getBackups);

/**
 * @route   GET /api/system/backups/:id
 * @desc    Get single backup by ID
 * @access  Private (requires system.backups_manage)
 */
router.get('/:id', requirePermission('system.backups_manage'), getBackup);

/**
 * @route   GET /api/system/backups/:id/download
 * @desc    Download a backup file
 * @access  Private (requires system.backups_manage)
 */
router.get('/:id/download', requirePermission('system.backups_manage'), downloadBackup);

/**
 * @route   POST /api/system/backups
 * @desc    Create a new backup
 * @access  Private (requires system.backups_manage)
 */
router.post('/', requirePermission('system.backups_manage'), createBackup);

/**
 * @route   POST /api/system/backups/:id/restore
 * @desc    Restore from a backup
 * @access  Private (requires system.backups_manage)
 */
router.post('/:id/restore', requirePermission('system.backups_manage'), restoreBackup);

/**
 * @route   DELETE /api/system/backups/:id
 * @desc    Delete a backup
 * @access  Private (requires system.backups_manage)
 */
router.delete('/:id', requirePermission('system.backups_manage'), deleteBackup);

module.exports = router;