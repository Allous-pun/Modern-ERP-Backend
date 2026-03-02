// src/routes/module.routes.js
const express = require('express');
const {
    getAvailableModules,
    getModuleBySlug,
    getInstalledModules,
    installModule,
    uninstallModule,
    updateModuleSettings,
    checkModuleInstalled
} = require('../controllers/module.controller');
const { protect } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { getActiveModules } = require('../middleware/module.middleware');

const router = express.Router();

// All module routes are protected
router.use(protect);

// ========== PUBLIC MODULE ROUTES (for authenticated users) ==========

// Get active modules for sidebar (any authenticated user)
router.get('/active', getActiveModules);

// Get all available modules (with installed status)
router.get('/available',
    requirePermission('system.modules_view'),
    getAvailableModules
);

// Get single module by slug
router.get('/available/:slug',
    requirePermission('system.modules_view'),
    getModuleBySlug
);

// Check if a specific module is installed
router.get('/check/:slug',
    checkModuleInstalled
);

// ========== INSTALLED MODULES ROUTES ==========

// Get installed modules for current organization
router.get('/installed',
    getInstalledModules
);

// Install a module
router.post('/install/:slug',
    requirePermission('system.modules_manage'),
    installModule
);

// Uninstall a module
router.delete('/uninstall/:slug',
    requirePermission('system.modules_manage'),
    uninstallModule
);

// Update installed module settings
router.put('/installed/:id/settings',
    requirePermission('system.modules_manage'),
    updateModuleSettings
);

module.exports = router;