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

// Public routes
router.get('/verify/:token', verifyInvite);

// Protected routes (require authentication)
router.use(protect);

// Routes that require organization context
router.use(setOrganizationContext);

// Invite management (require organization admin)
router.post('/', requireOrganizationAdmin, createInvite);
router.get('/', requireOrganizationAdmin, getInvites);
router.delete('/:id', requireOrganizationAdmin, cancelInvite);
router.post('/:id/resend', requireOrganizationAdmin, resendInvite);

module.exports = router;