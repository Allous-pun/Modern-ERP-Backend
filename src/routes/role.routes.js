// src/routes/role.routes.js
const express = require('express');
const {
    getRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    assignRoleToMember,
    assignRoleToUser,
    getMemberPermissions,
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

// Organization member role assignment
router.post('/assign/member/:memberId', 
    requirePermission('system.users_manage'), 
    assignRoleToMember
);

// Supreme user role assignment
router.post('/assign/user/:userId', 
    requirePermission('system.users_manage'), 
    assignRoleToUser
);

// Get organization member permissions
router.get('/member/:memberId/permissions',
    requirePermission('system.users_view'),
    getMemberPermissions
);

// Get supreme user permissions
router.get('/user/:userId/permissions',
    requirePermission('system.users_view'),
    getUserPermissions
);

module.exports = router;