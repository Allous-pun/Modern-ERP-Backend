// src/routes/permission.routes.js
const express = require('express');
const {
    getPermissions,
    getPermissionsByModule,
    getPermission
} = require('../controllers/permission.controller');
const { protect } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');

const router = express.Router();

// All permission routes are protected
router.use(protect);

// Get all permissions (requires permissions view)
router.get('/', 
    requirePermission('system.permissions_view'), 
    getPermissions
);

// Get permissions by module
router.get('/module/:module',
    requirePermission('system.permissions_view'),
    getPermissionsByModule
);

// Get single permission
router.get('/:id',
    requirePermission('system.permissions_view'),
    getPermission
);

module.exports = router;