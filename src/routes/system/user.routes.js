// src/routes/system/user.routes.js
const express = require('express');
const {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    bulkUpdateUserStatus
} = require('../../controllers/system/user.controller');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

// ============================================
// USER MANAGEMENT ROUTES
// ============================================

/**
 * @route   GET /api/system/users
 * @desc    Get all organization members (employees)
 * @access  Private (requires system.users_view)
 */
router.get('/', requirePermission('system.users_view'), getUsers);

/**
 * @route   GET /api/system/users/:id
 * @desc    Get single user by ID
 * @access  Private (requires system.users_view)
 */
router.get('/:id', requirePermission('system.users_view'), getUser);

/**
 * @route   POST /api/system/users
 * @desc    Create a new user (employee)
 * @access  Private (requires system.users_manage)
 */
router.post('/', requirePermission('system.users_manage'), createUser);

/**
 * @route   PUT /api/system/users/:id
 * @desc    Update a user
 * @access  Private (requires system.users_manage)
 */
router.put('/:id', requirePermission('system.users_manage'), updateUser);

/**
 * @route   DELETE /api/system/users/:id
 * @desc    Delete/deactivate a user
 * @access  Private (requires system.users_manage)
 */
router.delete('/:id', requirePermission('system.users_manage'), deleteUser);

/**
 * @route   PATCH /api/system/users/bulk/status
 * @desc    Bulk update user status (activate/deactivate multiple users)
 * @access  Private (requires system.users_manage)
 */
router.patch('/bulk/status', requirePermission('system.users_manage'), bulkUpdateUserStatus);

module.exports = router;