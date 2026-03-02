// src/routes/organization.routes.js
const express = require('express');
const {
    createOrganization,
    getCurrentOrganization,
    updateOrganization,
    getOrganizationMembers,
    inviteMember,
    removeMember,
    switchOrganization,
    addOrganizationAdmin
} = require('../controllers/organization.controller');
const { protect } = require('../middleware/auth.middleware');
const { setOrganizationContext, requireOrganizationAdmin } = require('../middleware/organization.middleware');

const router = express.Router();

// PUBLIC route - Create new organization (no token needed)
router.post('/', createOrganization);

// Add admin to organization (public - used during registration)
router.post('/:orgId/add-admin', addOrganizationAdmin);

// All routes below require authentication
router.use(protect);

// Switch organization
router.post('/switch/:organizationId', switchOrganization);

// Routes that require organization context
router.use(setOrganizationContext);

// Get current organization details (any member can view)
router.get('/current', getCurrentOrganization);

// PROTECTED - Only Organization Admin can view members
router.get('/members', requireOrganizationAdmin, getOrganizationMembers);

// Update current organization
router.put('/current', requireOrganizationAdmin, updateOrganization);

// Member management (already protected)
router.post('/members/invite', requireOrganizationAdmin, inviteMember);
router.delete('/members/:memberId', requireOrganizationAdmin, removeMember);

module.exports = router;