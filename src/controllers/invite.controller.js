// src/controllers/invite.controller.js
const Invite = require('../models/invite.model');
const Organization = require('../models/organization.model');
const Role = require('../models/role.model');
const crypto = require('crypto');

// @desc    Create an invite
// @route   POST /api/invites
// @access  Private (Organization Admin)
const createInvite = async (req, res) => {
    try {
        const { email, roleIds, jobTitle, department, message } = req.body;

        // Check if user already exists and is a member
        const User = require('../models/user.model');
        const OrganizationMember = require('../models/organizationMember.model');

        const user = await User.findOne({ email });
        if (user) {
            const existingMember = await OrganizationMember.findOne({
                user: user._id,
                organization: req.organization.id
            });
            if (existingMember) {
                return res.status(400).json({
                    success: false,
                    message: 'User is already a member of this organization'
                });
            }
        }

        // Verify roles exist if provided
        if (roleIds && roleIds.length > 0) {
            const roles = await Role.find({ _id: { $in: roleIds } });
            if (roles.length !== roleIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more roles are invalid'
                });
            }
        }

        // Generate unique token
        const token = crypto.randomBytes(32).toString('hex');

        // Create invite
        const invite = await Invite.create({
            email,
            organization: req.organization.id,
            invitedBy: req.user.userId,
            roles: roleIds || [],
            jobTitle,
            department,
            token,
            message,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });

        // Populate for response
        await invite.populate('organization', 'name slug');
        await invite.populate('invitedBy', 'firstName lastName email');
        await invite.populate('roles', 'name');

        // TODO: Send email with invite link

        res.status(201).json({
            success: true,
            message: 'Invite created successfully',
            data: {
                ...invite.toObject(),
                inviteLink: `${process.env.FRONTEND_URL}/register/invite?token=${token}`
            }
        });

    } catch (error) {
        console.error('Create invite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create invite'
        });
    }
};

// @desc    Get all invites for organization
// @route   GET /api/invites
// @access  Private (Organization Admin)
const getInvites = async (req, res) => {
    try {
        const invites = await Invite.find({
            organization: req.organization.id
        })
        .populate('invitedBy', 'firstName lastName email')
        .populate('roles', 'name')
        .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: invites.length,
            data: invites
        });
    } catch (error) {
        console.error('Get invites error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invites'
        });
    }
};

// @desc    Get invite by token
// @route   GET /api/invites/verify/:token
// @access  Public
const verifyInvite = async (req, res) => {
    try {
        const { token } = req.params;

        const invite = await Invite.findOne({ token })
            .populate('organization', 'name slug logo')
            .populate('roles', 'name description');

        if (!invite) {
            return res.status(404).json({
                success: false,
                message: 'Invite not found'
            });
        }

        if (!invite.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invite has expired or already been used'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                email: invite.email,
                organization: invite.organization,
                roles: invite.roles,
                jobTitle: invite.jobTitle,
                department: invite.department,
                message: invite.message
            }
        });
    } catch (error) {
        console.error('Verify invite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify invite'
        });
    }
};

// @desc    Cancel invite
// @route   DELETE /api/invites/:id
// @access  Private (Organization Admin)
const cancelInvite = async (req, res) => {
    try {
        const invite = await Invite.findOne({
            _id: req.params.id,
            organization: req.organization.id
        });

        if (!invite) {
            return res.status(404).json({
                success: false,
                message: 'Invite not found'
            });
        }

        if (invite.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel invite that has already been ' + invite.status
            });
        }

        invite.status = 'cancelled';
        invite.cancelledAt = new Date();
        await invite.save();

        res.status(200).json({
            success: true,
            message: 'Invite cancelled successfully'
        });
    } catch (error) {
        console.error('Cancel invite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel invite'
        });
    }
};

// @desc    Resend invite
// @route   POST /api/invites/:id/resend
// @access  Private (Organization Admin)
const resendInvite = async (req, res) => {
    try {
        const invite = await Invite.findOne({
            _id: req.params.id,
            organization: req.organization.id
        });

        if (!invite) {
            return res.status(404).json({
                success: false,
                message: 'Invite not found'
            });
        }

        if (invite.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Cannot resend invite that has already been ' + invite.status
            });
        }

        // Update expiration date
        invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await invite.save();

        // TODO: Resend email

        res.status(200).json({
            success: true,
            message: 'Invite resent successfully'
        });
    } catch (error) {
        console.error('Resend invite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend invite'
        });
    }
};

module.exports = {
    createInvite,
    getInvites,
    verifyInvite,
    cancelInvite,
    resendInvite
};