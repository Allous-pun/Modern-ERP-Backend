// src/controllers/organization.controller.js
const Organization = require('../models/organization.model');
const OrganizationMember = require('../models/organizationMember.model');
const OrganizationSettings = require('../models/organizationSettings.model');
const OrganizationSubscription = require('../models/organizationSubscription.model');
const User = require('../models/user.model');
const Role = require('../models/role.model');
const Module = require('../models/module.model');
const InstalledModule = require('../models/installedModule.model');

// @desc    Create new organization
// @route   POST /api/organizations
// @access  Public (no token required)
const createOrganization = async (req, res) => {
    try {
        const {
            name, legalName, registrationNumber, taxNumber,
            industry, email, phone, website, address,
            currency, timezone, language
        } = req.body;

        // Generate slug from name
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        // Check if slug exists
        const existingOrg = await Organization.findOne({ slug });
        if (existingOrg) {
            return res.status(400).json({
                success: false,
                message: 'Organization with similar name already exists'
            });
        }

        // Create organization
        const organization = await Organization.create({
            name,
            legalName,
            slug,
            registrationNumber,
            taxNumber,
            industry,
            email,
            phone,
            website,
            address,
            currency,
            timezone,
            language,
            // No createdBy since no user yet
            status: 'active'
        });

        // Create default settings
        await OrganizationSettings.create({
            organization: organization._id,
            timezone: timezone || 'UTC',
            dateFormat: 'DD/MM/YYYY',
            baseCurrency: currency || 'USD',
            defaultLanguage: language || 'en'
        });

        // Create trial subscription
        await OrganizationSubscription.create({
            organization: organization._id,
            planName: 'trial',
            billingCycle: 'monthly',
            maxUsers: 5,
            maxStorage: 1024,
            maxModules: 10,
            startDate: new Date(),
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            status: 'trial'
        });

        res.status(201).json({
            success: true,
            message: 'Organization created successfully. Now register as the admin.',
            data: {
                organization: {
                    _id: organization._id,
                    name: organization.name,
                    slug: organization.slug,
                    email: organization.email
                }
            }
        });
    } catch (error) {
        console.error('Create organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create organization'
        });
    }
};

// @desc    Get current organization
// @route   GET /api/organizations/current
// @access  Private
const getCurrentOrganization = async (req, res) => {
    try {
        const organization = await Organization.findById(req.organization.id)
            .populate('createdBy', 'firstName lastName email');

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Get settings
        const settings = await OrganizationSettings.findOne({
            organization: organization._id
        });

        // Get subscription
        const subscription = await OrganizationSubscription.findOne({
            organization: organization._id
        });

        // Get member count
        const memberCount = await OrganizationMember.countDocuments({
            organization: organization._id,
            status: 'active'
        });

        // Get installed modules count
        const modulesCount = await InstalledModule.countDocuments({
            organization: organization._id,
            status: { $in: ['active', 'trial'] }
        });

        res.status(200).json({
            success: true,
            data: {
                ...organization.toObject(),
                settings,
                subscription,
                stats: {
                    memberCount,
                    modulesCount
                }
            }
        });
    } catch (error) {
        console.error('Get organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch organization'
        });
    }
};

// @desc    Update organization
// @route   PUT /api/organizations/current
// @access  Private (Organization Admin)
const updateOrganization = async (req, res) => {
    try {
        const {
            name, legalName, registrationNumber, taxNumber,
            industry, email, phone, website, address,
            currency, timezone, language, logo, theme
        } = req.body;

        const organization = await Organization.findById(req.organization.id);

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Update fields
        if (name) organization.name = name;
        if (legalName) organization.legalName = legalName;
        if (registrationNumber) organization.registrationNumber = registrationNumber;
        if (taxNumber) organization.taxNumber = taxNumber;
        if (industry) organization.industry = industry;
        if (email) organization.email = email;
        if (phone) organization.phone = phone;
        if (website) organization.website = website;
        if (address) organization.address = { ...organization.address, ...address };
        if (currency) organization.currency = currency;
        if (timezone) organization.timezone = timezone;
        if (language) organization.language = language;
        if (logo) organization.logo = logo;
        if (theme) organization.theme = { ...organization.theme, ...theme };

        await organization.save();

        // Update settings if provided
        if (timezone || currency || language) {
            await OrganizationSettings.findOneAndUpdate(
                { organization: organization._id },
                {
                    $set: {
                        ...(timezone && { timezone }),
                        ...(currency && { baseCurrency: currency }),
                        ...(language && { defaultLanguage: language })
                    }
                }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Organization updated successfully',
            data: organization
        });
    } catch (error) {
        console.error('Update organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update organization'
        });
    }
};

// @desc    Get organization members
// @route   GET /api/organizations/members
// @access  Private
const getOrganizationMembers = async (req, res) => {
    try {
        const members = await OrganizationMember.find({
            organization: req.organization.id,
            status: 'active'
        })
        .populate('user', 'firstName lastName email avatar')
        .populate('roles', 'name description hierarchy')
        .populate('invitedBy', 'firstName lastName email')
        .sort('-joinedAt');

        res.status(200).json({
            success: true,
            count: members.length,
            data: members
        });
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch members'
        });
    }
};

// @desc    Invite member to organization
// @route   POST /api/organizations/members/invite
// @access  Private (Organization Admin)
const inviteMember = async (req, res) => {
    try {
        const { email, roleIds, jobTitle, department } = req.body;

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found. Please ask them to register first.'
            });
        }

        // Check if already a member
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

        // Verify roles exist if roleIds provided
        let validRoles = [];
        if (roleIds && roleIds.length > 0) {
            validRoles = await Role.find({ _id: { $in: roleIds } });
            if (validRoles.length !== roleIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more roles are invalid'
                });
            }
        }

        // Get or create subscription with safety checks
        let subscription = await OrganizationSubscription.findOne({
            organization: req.organization.id
        });

        // If no subscription exists, create a default trial subscription
        if (!subscription) {
            console.log('⚠️ No subscription found, creating default trial subscription');
            subscription = await OrganizationSubscription.create({
                organization: req.organization.id,
                planName: 'trial',
                billingCycle: 'monthly',
                maxUsers: 5,
                maxStorage: 1024,
                maxModules: 10,
                startDate: new Date(),
                trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                status: 'trial'
            });
        }

        // Get current member count
        const memberCount = await OrganizationMember.countDocuments({
            organization: req.organization.id,
            status: 'active'
        });

        // Check user limit - safely access maxUsers with fallback
        const maxUsers = subscription?.maxUsers ?? 5;
        
        if (memberCount >= maxUsers) {
            return res.status(400).json({
                success: false,
                message: `Maximum user limit (${maxUsers}) reached for your subscription`
            });
        }

        // Create member
        const member = await OrganizationMember.create({
            user: user._id,
            organization: req.organization.id,
            roles: roleIds || [],
            jobTitle: jobTitle || null,
            department: department || null,
            status: 'active',
            invitedBy: req.user.userId,
            joinedAt: new Date()
        });

        // Add organization to user's list if not already there
        await User.findByIdAndUpdate(user._id, {
            $addToSet: { organizations: req.organization.id }
        });

        // Populate for response
        await member.populate('user', 'firstName lastName email avatar');
        await member.populate('roles', 'name description');

        res.status(201).json({
            success: true,
            message: 'Member added successfully',
            data: member
        });

    } catch (error) {
        console.error('Invite member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to invite member',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Remove member from organization
// @route   DELETE /api/organizations/members/:memberId
// @access  Private (Organization Admin)
const removeMember = async (req, res) => {
    try {
        const member = await OrganizationMember.findById(req.params.memberId)
            .populate('user');

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Don't allow removing the last admin
        if (member.roles.some(r => r.name === 'Organization Admin')) {
            const adminCount = await OrganizationMember.countDocuments({
                organization: req.organization.id,
                roles: { $in: member.roles },
                status: 'active'
            });

            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot remove the last organization admin'
                });
            }
        }

        // Remove member
        await member.deleteOne();

        // Remove organization from user's list if they have no other memberships
        const otherMemberships = await OrganizationMember.countDocuments({
            user: member.user._id,
            status: 'active'
        });

        if (otherMemberships === 0) {
            await User.findByIdAndUpdate(member.user._id, {
                $pull: { organizations: req.organization.id }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Member removed successfully'
        });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove member'
        });
    }
};

// @desc    Switch organization
// @route   POST /api/organizations/switch/:organizationId
// @access  Private
const switchOrganization = async (req, res) => {
    try {
        const { organizationId } = req.params;

        // Check if user belongs to this organization
        const member = await OrganizationMember.findOne({
            user: req.user.userId,
            organization: organizationId,
            status: 'active'
        });

        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this organization'
            });
        }

        // Update default organization
        await User.findByIdAndUpdate(req.user.userId, {
            defaultOrganization: organizationId
        });

        res.status(200).json({
            success: true,
            message: 'Switched organization successfully',
            data: {
                organizationId,
                memberId: member._id
            }
        });
    } catch (error) {
        console.error('Switch organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to switch organization'
        });
    }
};

// @desc    Add admin to organization (for first user)
// @route   POST /api/organizations/:orgId/add-admin
// @access  Public (but requires organization ID and email)
const addOrganizationAdmin = async (req, res) => {
    try {
        const { orgId } = req.params;
        const { email, userId } = req.body;

        // Find organization
        const organization = await Organization.findById(orgId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Find user by email or userId
        let user;
        if (userId) {
            user = await User.findById(userId);
        } else if (email) {
            user = await User.findOne({ email });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is already a member
        const existingMember = await OrganizationMember.findOne({
            user: user._id,
            organization: orgId
        });

        if (existingMember) {
            return res.status(400).json({
                success: false,
                message: 'User is already a member of this organization'
            });
        }

        // Get Organization Admin role
        const adminRole = await Role.findOne({ name: 'Organization Admin' });
        if (!adminRole) {
            return res.status(500).json({
                success: false,
                message: 'Organization Admin role not found'
            });
        }

        // Add user as admin
        const member = await OrganizationMember.create({
            user: user._id,
            organization: orgId,
            roles: [adminRole._id],
            jobTitle: 'Organization Admin',
            status: 'active',
            isDefault: true,
            joinedAt: new Date()
        });

        // Add organization to user's list
        await User.findByIdAndUpdate(user._id, {
            $addToSet: { organizations: orgId },
            $set: { defaultOrganization: orgId }
        });

        res.status(201).json({
            success: true,
            message: 'User added as organization admin successfully',
            data: {
                memberId: member._id,
                organization: {
                    id: organization._id,
                    name: organization.name
                },
                user: {
                    id: user._id,
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`
                }
            }
        });

    } catch (error) {
        console.error('Add organization admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add organization admin'
        });
    }
};

module.exports = {
    createOrganization,
    getCurrentOrganization,
    updateOrganization,
    getOrganizationMembers,
    inviteMember,
    removeMember,
    switchOrganization,
    addOrganizationAdmin
};