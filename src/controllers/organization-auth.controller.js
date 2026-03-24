// src/controllers/organization-auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Invite = require('../models/invite.model');
const OrganizationMember = require('../models/organizationMember.model');

/**
 * @desc    Register/accept invite and become organization member
 * @route   POST /api/auth/organization/register-invite
 * @access  Public
 */
const registerWithInvite = async (req, res) => {
    try {
        const { token, password, firstName, lastName, phoneNumber } = req.body;

        // Verify invite
        const invite = await Invite.findOne({ 
            token,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        }).populate('organization');

        if (!invite) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired invite'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Check if member already exists with this email
        let member = await OrganizationMember.findOne({
            organization: invite.organization._id,
            'personalInfo.email': invite.email
        });

        if (member) {
            return res.status(400).json({
                success: false,
                message: 'You are already a member of this organization'
            });
        }

        // Create the member
        member = await OrganizationMember.create({
            organization: invite.organization._id,
            personalInfo: {
                firstName,
                lastName,
                displayName: `${firstName} ${lastName}`,
                email: invite.email,
                phoneNumber,
                dateOfBirth: null,
                gender: 'prefer-not-to-say'
            },
            auth: {
                password: hashedPassword,
                isEmailVerified: true,
                loginAttempts: 0,
                passwordChangedAt: new Date()
            },
            roles: invite.roles,
            jobTitle: invite.jobTitle,
            department: invite.department,
            status: 'active',
            invitedBy: invite.invitedBy,
            joinedAt: new Date()
        });

        // Mark invite as accepted
        invite.status = 'accepted';
        invite.acceptedAt = new Date();
        await invite.save();

        // Generate token with BOTH memberId and userId for compatibility
        const authToken = jwt.sign(
            { 
                memberId: member._id,
                userId: member._id,              // Add for backward compatibility
                email: member.personalInfo.email,
                organizationId: member.organization.toString()
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        await member.populate('roles', 'name description');

        res.status(201).json({
            success: true,
            message: 'Successfully joined organization',
            data: {
                member: {
                    id: member._id,
                    name: member.fullName,
                    email: member.personalInfo.email,
                    jobTitle: member.jobTitle,
                    department: member.department,
                    roles: member.roles,
                    organization: {
                        id: invite.organization._id,
                        name: invite.organization.name
                    }
                },
                token: authToken
            }
        });

    } catch (error) {
        console.error('Register with invite error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register'
        });
    }
};

/**
 * @desc    Login organization member
 * @route   POST /api/organization-auth/login
 * @access  Public
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find member by email
        const member = await OrganizationMember.findOne({
            'personalInfo.email': email,
            status: { $in: ['active', 'pending'] }
        }).select('+auth.password').populate('roles');

        if (!member) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, member.auth.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        member.auth.lastLogin = new Date();
        await member.save();

        // Generate token with BOTH memberId and userId for compatibility
        const authToken = jwt.sign(
            { 
                memberId: member._id,
                userId: member._id,              // Add for backward compatibility
                email: member.personalInfo.email,
                organizationId: member.organization.toString()
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                member: {
                    id: member._id,
                    name: member.fullName,
                    firstName: member.personalInfo.firstName,
                    lastName: member.personalInfo.lastName,
                    email: member.personalInfo.email,
                    jobTitle: member.jobTitle,
                    department: member.department,
                    roles: member.roles.map(role => ({
                        id: role._id,
                        name: role.name,
                        description: role.description,
                        category: role.category,
                        hierarchy: role.hierarchy
                    }))
                },
                token: authToken
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
};

module.exports = {
    registerWithInvite,
    login
};