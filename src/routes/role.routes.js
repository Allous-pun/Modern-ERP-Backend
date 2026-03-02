// src/routes/role.routes.js
const express = require('express');
const {
    getRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    assignRoleToUser,
    getUserPermissions
} = require('../controllers/role.controller');
const { protect } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');

const router = express.Router();

// All role routes are protected and require appropriate permissions
router.use(protect);

// Role management routes
router.route('/')
    .get(requirePermission('system.roles_view'), getRoles)
    .post(requirePermission('system.roles_manage'), createRole);

router.route('/:id')
    .get(requirePermission('system.roles_view'), getRole)
    .put(requirePermission('system.roles_manage'), updateRole)
    .delete(requirePermission('system.roles_manage'), deleteRole);

// User role assignment
router.post('/assign/:userId', 
    requirePermission('system.users_manage'), 
    assignRoleToUser
);

// Get user permissions
router.get('/user/:userId/permissions',
    requirePermission('system.users_view'),
    getUserPermissions
);

module.exports = router;