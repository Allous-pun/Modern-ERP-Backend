// src/routes/system/security.routes.js
const express = require('express');
const {
    getSecurityPolicies,
    updateSecurityPolicies
} = require('../../controllers/system/security.controller');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

/**
 * @route   GET /api/system/security
 * @desc    Get security policies
 * @access  Private (requires security.policies_view)
 */
router.get('/', requirePermission('security.policies_view'), getSecurityPolicies);

/**
 * @route   PUT /api/system/security
 * @desc    Update security policies
 * @access  Private (requires security.policies_manage)
 */
router.put('/', requirePermission('security.policies_manage'), updateSecurityPolicies);

module.exports = router;