// src/middleware/permission.middleware.js
const User = require('../models/user.model');
const OrganizationMember = require('../models/organizationMember.model');

/**
 * Middleware to check if authenticated user has required permission
 * Works for both Supreme Users and Organization Members
 * @param {string} requiredPermission - Permission string to check
 */
const requirePermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // ============================================
            // SUPREME USER HANDLING
            // ============================================
            if (req.user.isSupreme) {
                // Supreme users have all permissions
                return next();
            }

            // ============================================
            // ORGANIZATION MEMBER HANDLING
            // ============================================
            if (req.user.memberId) {
                const member = await OrganizationMember.findById(req.user.memberId)
                    .populate({
                        path: 'roles',
                        populate: {
                            path: 'permissions',
                            model: 'Permission'
                        }
                    });

                if (!member) {
                    return res.status(401).json({
                        success: false,
                        message: 'Organization member not found'
                    });
                }

                // Check if member has Super Administrator role
                const isSuperAdmin = member.roles?.some(role => role.name === 'Super Administrator');
                if (isSuperAdmin) {
                    return next();
                }

                // Check each role's permissions
                for (const role of member.roles) {
                    for (const permission of role.permissions) {
                        const permString = `${permission.module}.${permission.resource}_${permission.action}`;
                        if (permString === requiredPermission) {
                            return next();
                        }
                    }
                }

                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Insufficient permissions.',
                    required: requiredPermission
                });
            }

            // If we get here, user type is unknown
            return res.status(403).json({
                success: false,
                message: 'Unable to verify permissions'
            });

        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    };
};

/**
 * Check if user has any of the required permissions
 * @param {string[]} requiredPermissions - Array of permission strings
 */
const requireAnyPermission = (requiredPermissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // ============================================
            // SUPREME USER HANDLING
            // ============================================
            if (req.user.isSupreme) {
                return next();
            }

            // ============================================
            // ORGANIZATION MEMBER HANDLING
            // ============================================
            if (req.user.memberId) {
                const member = await OrganizationMember.findById(req.user.memberId)
                    .populate({
                        path: 'roles',
                        populate: {
                            path: 'permissions',
                            model: 'Permission'
                        }
                    });

                if (!member) {
                    return res.status(401).json({
                        success: false,
                        message: 'Organization member not found'
                    });
                }

                // Check if member has Super Administrator role
                const isSuperAdmin = member.roles?.some(role => role.name === 'Super Administrator');
                if (isSuperAdmin) {
                    return next();
                }

                // Collect all permission strings for this member
                const userPermissions = new Set();
                
                for (const role of member.roles) {
                    for (const permission of role.permissions) {
                        const permString = `${permission.module}.${permission.resource}_${permission.action}`;
                        userPermissions.add(permString);
                    }
                }

                // Check if user has ANY of the required permissions
                const hasAny = requiredPermissions.some(perm => userPermissions.has(perm));

                if (!hasAny) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. Need one of: ' + requiredPermissions.join(', ')
                    });
                }

                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Unable to verify permissions'
            });

        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    };
};

/**
 * Check if user has all required permissions
 * @param {string[]} requiredPermissions - Array of permission strings
 */
const requireAllPermissions = (requiredPermissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // ============================================
            // SUPREME USER HANDLING
            // ============================================
            if (req.user.isSupreme) {
                return next();
            }

            // ============================================
            // ORGANIZATION MEMBER HANDLING
            // ============================================
            if (req.user.memberId) {
                const member = await OrganizationMember.findById(req.user.memberId)
                    .populate({
                        path: 'roles',
                        populate: {
                            path: 'permissions',
                            model: 'Permission'
                        }
                    });

                if (!member) {
                    return res.status(401).json({
                        success: false,
                        message: 'Organization member not found'
                    });
                }

                // Check if member has Super Administrator role
                const isSuperAdmin = member.roles?.some(role => role.name === 'Super Administrator');
                if (isSuperAdmin) {
                    return next();
                }

                // Collect all permission strings for this member
                const userPermissions = new Set();
                
                for (const role of member.roles) {
                    for (const permission of role.permissions) {
                        const permString = `${permission.module}.${permission.resource}_${permission.action}`;
                        userPermissions.add(permString);
                    }
                }

                // Check if user has ALL required permissions
                const hasAll = requiredPermissions.every(perm => userPermissions.has(perm));

                if (!hasAll) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. Need all of: ' + requiredPermissions.join(', ')
                    });
                }

                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'Unable to verify permissions'
            });

        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    };
};

module.exports = {
    requirePermission,
    requireAnyPermission,
    requireAllPermissions
};