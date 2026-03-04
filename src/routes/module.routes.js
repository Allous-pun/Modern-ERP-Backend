// src/routes/module.routes.js
const express = require('express');
const {
    getAvailableModules,
    getModuleBySlug,
    getInstalledModules,
    installModule,
    uninstallModule,
    updateModuleSettings,
    checkModuleInstalled,
    getActiveModules  // ✅ Now imported from controller
} = require('../controllers/module.controller');
const { protect } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
// const { getActiveModules } = require('../middleware/module.middleware'); // ❌ Removed - now in controller

const router = express.Router();

// All module routes are protected
router.use(protect);

// ============================================
// PUBLIC MODULE ROUTES (for authenticated users)
// ============================================

/**
 * @route   GET /api/modules/active
 * @desc    Get active modules for sidebar (any authenticated user)
 * @access  Private
 */
router.get('/active', getActiveModules);

/**
 * @route   GET /api/modules/available
 * @desc    Get all available modules with installed status
 * @access  Private (requires system.modules_view)
 */
router.get('/available',
    requirePermission('system.modules_view'),
    getAvailableModules
);

/**
 * @route   GET /api/modules/available/:slug
 * @desc    Get single module by slug
 * @access  Private (requires system.modules_view)
 */
router.get('/available/:slug',
    requirePermission('system.modules_view'),
    getModuleBySlug
);

/**
 * @route   GET /api/modules/check/:slug
 * @desc    Check if a specific module is installed
 * @access  Private
 */
router.get('/check/:slug',
    checkModuleInstalled
);

// ============================================
// INSTALLED MODULES ROUTES
// ============================================

/**
 * @route   GET /api/modules/installed
 * @desc    Get installed modules for current organization
 * @access  Private
 */
router.get('/installed',
    getInstalledModules
);

/**
 * @route   POST /api/modules/install/:slug
 * @desc    Install a module for the organization
 * @access  Private (requires system.modules_manage)
 */
router.post('/install/:slug',
    requirePermission('system.modules_manage'),
    installModule
);

/**
 * @route   DELETE /api/modules/uninstall/:slug
 * @desc    Uninstall a module from the organization
 * @access  Private (requires system.modules_manage)
 */
router.delete('/uninstall/:slug',
    requirePermission('system.modules_manage'),
    uninstallModule
);

/**
 * @route   PUT /api/modules/installed/:id/settings
 * @desc    Update installed module settings
 * @access  Private (requires system.modules_manage)
 */
router.put('/installed/:id/settings',
    requirePermission('system.modules_manage'),
    updateModuleSettings
);

module.exports = router;