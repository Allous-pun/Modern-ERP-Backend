// src/routes/organization.routes.js
const express = require('express');
const {
    // Organization CRUD
    registerOrganization,
    getOrganization,
    updateOrganization,
    
    // Settings
    getSettings,
    updateSettings,
    
    // Subscription
    getSubscription,
    
    // Dashboard
    getDashboardStats,
    
    // Member Management
    inviteMember,
    getMembers,
    getMember,
    updateMemberRoles,
    updateMember,
    removeMember,
    reactivateMember
} = require('../controllers/organization.controller');
const { protect, isOrganizationUser } = require('../middleware/auth.middleware');
const { setOrganizationContext, requireOrganizationAdmin } = require('../middleware/organization.middleware');

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================
/**
 * @route   POST /api/organizations/register
 * @desc    Register a new organization with first admin user
 * @access  Public
 */
router.post('/register', registerOrganization);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================
router.use(protect);

// ============================================
// ORGANIZATION CONTEXT ROUTES
// ============================================
// These routes require organization context and are for organization users only
router.use(isOrganizationUser);
router.use(setOrganizationContext);

// ============================================
// ORGANIZATION DASHBOARD & STATS
// ============================================
/**
 * @route   GET /api/organizations/dashboard
 * @desc    Get organization dashboard statistics
 * @access  Private (Organization Members)
 */
router.get('/dashboard', getDashboardStats);

// ============================================
// ORGANIZATION CRUD
// ============================================
/**
 * @route   GET /api/organizations
 * @desc    Get current organization details
 * @access  Private (Organization Members)
 */
router.get('/', getOrganization);

/**
 * @route   PUT /api/organizations
 * @desc    Update organization basic info
 * @access  Private (Organization Admin only)
 */
router.put('/', requireOrganizationAdmin, updateOrganization);

// ============================================
// ORGANIZATION SETTINGS
// ============================================
/**
 * @route   GET /api/organizations/settings
 * @desc    Get organization settings
 * @access  Private (Organization Members)
 */
router.get('/settings', getSettings);

/**
 * @route   PUT /api/organizations/settings
 * @desc    Update organization settings
 * @access  Private (Organization Admin only)
 */
router.put('/settings', requireOrganizationAdmin, updateSettings);

// ============================================
// ORGANIZATION SUBSCRIPTION
// ============================================
/**
 * @route   GET /api/organizations/subscription
 * @desc    Get organization subscription details
 * @access  Private (Organization Members)
 */
router.get('/subscription', getSubscription);

// ============================================
// MEMBER MANAGEMENT
// ============================================
/**
 * @route   GET /api/organizations/members
 * @desc    Get all organization members
 * @access  Private (Organization Members)
 */
router.get('/members', getMembers);

/**
 * @route   GET /api/organizations/members/:memberId
 * @desc    Get a single member by ID
 * @access  Private (Organization Members)
 */
router.get('/members/:memberId', getMember);

/**
 * @route   POST /api/organizations/members/invite
 * @desc    Invite a new member to the organization
 * @access  Private (Organization Admin only)
 */
router.post('/members/invite', requireOrganizationAdmin, inviteMember);

/**
 * @route   PUT /api/organizations/members/:memberId/roles
 * @desc    Update member roles
 * @access  Private (Organization Admin only)
 */
router.put('/members/:memberId/roles', requireOrganizationAdmin, updateMemberRoles);

/**
 * @route   PUT /api/organizations/members/:memberId
 * @desc    Update member details (self or admin)
 * @access  Private (Organization Members)
 */
router.put('/members/:memberId', updateMember);

/**
 * @route   DELETE /api/organizations/members/:memberId
 * @desc    Remove a member from organization (soft delete)
 * @access  Private (Organization Admin only)
 */
router.delete('/members/:memberId', requireOrganizationAdmin, removeMember);

/**
 * @route   PUT /api/organizations/members/:memberId/reactivate
 * @desc    Reactivate a removed member
 * @access  Private (Organization Admin only)
 */
router.put('/members/:memberId/reactivate', requireOrganizationAdmin, reactivateMember);

module.exports = router;