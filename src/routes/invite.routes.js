// src/routes/invite.routes.js
const express = require('express');
const {
    createInvite,
    getInvites,
    verifyInvite,
    cancelInvite,
    resendInvite
} = require('../controllers/invite.controller');
const { protect } = require('../middleware/auth.middleware');
const { setOrganizationContext, requireOrganizationAdmin } = require('../middleware/organization.middleware');

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================
/**
 * @route   GET /api/invites/verify/:token
 * @desc    Verify an invite token (public - used during registration)
 * @access  Public
 */
router.get('/verify/:token', verifyInvite);

// ============================================
// PROTECTED ROUTES (require authentication)
// ============================================
router.use(protect);

// ============================================
// ORGANIZATION CONTEXT (required for invites)
// ============================================
router.use(setOrganizationContext);

// ============================================
// INVITE MANAGEMENT ROUTES
// ============================================
/**
 * @route   POST /api/invites
 * @desc    Create a new invite for an organization member
 * @access  Private (Organization Admin only)
 */
router.post('/', requireOrganizationAdmin, createInvite);

/**
 * @route   GET /api/invites
 * @desc    Get all invites for the current organization
 * @access  Private (Organization Admin only)
 */
router.get('/', requireOrganizationAdmin, getInvites);

/**
 * @route   DELETE /api/invites/:id
 * @desc    Cancel an invite
 * @access  Private (Organization Admin only)
 */
router.delete('/:id', requireOrganizationAdmin, cancelInvite);

/**
 * @route   POST /api/invites/:id/resend
 * @desc    Resend an invite email
 * @access  Private (Organization Admin only)
 */
router.post('/:id/resend', requireOrganizationAdmin, resendInvite);

module.exports = router;