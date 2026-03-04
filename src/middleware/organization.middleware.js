// src/middleware/organization.middleware.js
const OrganizationMember = require('../models/organizationMember.model');
const Organization = require('../models/organization.model');

/**
 * Middleware to set organization context from request
 * Organization can come from:
 * 1. Header: X-Organization-ID or X-Organization-Slug
 * 2. Member's default organization (from token)
 */
const setOrganizationContext = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Supreme users don't need organization context
        if (req.user.isSupreme) {
            return next();
        }

        let organizationId = req.headers['x-organization-id'];
        const organizationSlug = req.headers['x-organization-slug'];

        // If slug provided, find organization by slug
        if (organizationSlug && !organizationId) {
            const org = await Organization.findOne({ slug: organizationSlug });
            if (org) {
                organizationId = org._id.toString();
            }
        }

        // If no organization specified, check if user has a default
        // (This would come from the member document - you might want to add a default flag)
        if (!organizationId && req.user.memberId) {
            // Use the organization from the member
            const member = await OrganizationMember.findById(req.user.memberId);
            if (member) {
                organizationId = member.organization.toString();
            }
        }

        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'No organization specified. Please provide X-Organization-ID or X-Organization-Slug header'
            });
        }

        // Verify member belongs to this organization
        const member = await OrganizationMember.findOne({
            _id: req.user.memberId,  // ✅ Use memberId from token
            organization: organizationId,
            status: 'active'
        }).populate('roles');

        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this organization'
            });
        }

        // Attach organization context to request
        req.organization = {
            id: organizationId,
            memberId: member._id,
            member: member,
            roles: member.roles,
            jobTitle: member.jobTitle,
            department: member.department,
            isSuperAdmin: member.roles?.some(r => r.name === 'Super Administrator') || false
        };

        next();
    } catch (error) {
        console.error('Organization context error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error setting organization context'
        });
    }
};

/**
 * Middleware to require specific organization role
 * @param {string[]} allowedRoles - Array of role names allowed
 */
const requireOrganizationRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.organization) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization context not set'
                });
            }

            // Super Administrators have all roles
            if (req.organization.isSuperAdmin) {
                return next();
            }

            const hasAllowedRole = req.organization.roles.some(role => 
                allowedRoles.includes(role.name)
            );

            if (!hasAllowedRole) {
                return res.status(403).json({
                    success: false,
                    message: `Requires one of these roles: ${allowedRoles.join(', ')}`
                });
            }

            next();
        } catch (error) {
            console.error('Organization role check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking organization role'
            });
        }
    };
};

/**
 * Middleware to check if user is organization admin
 */
const requireOrganizationAdmin = async (req, res, next) => {
    return requireOrganizationRole(['Super Administrator', 'Organization Admin'])(req, res, next);
};

module.exports = {
    setOrganizationContext,
    requireOrganizationRole,
    requireOrganizationAdmin
};