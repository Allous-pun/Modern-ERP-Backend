// src/middleware/auth.middleware.js
const { verifyToken } = require('../utils/token.utils');
const User = require('../models/user.model');
const OrganizationMember = require('../models/organizationMember.model');
const Organization = require('../models/organization.model');
const Role = require('../models/role.model');

/**
 * Protect routes - ensures user is authenticated
 * Adds user info to req.user
 * Handles both Supreme Users and Organization Members
 */
const protect = async (req, res, next) => {
    try {
        let token;

        // Check authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Check cookie
        else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        // Verify token
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // ============================================
        // SUPREME USER HANDLING
        // ============================================
        if (decoded.userId && decoded.isSupreme) {
            const user = await User.findById(decoded.userId)
                .select('-password -actionLog -apiKeys -twoFactorSecret -passwordResetToken -passwordResetExpires');

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Supreme user no longer exists'
                });
            }

            if (!user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'Supreme user account is deactivated'
                });
            }

            req.user = {
                // Core user info
                id: user._id,
                userId: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                displayName: user.displayName,
                
                // User type
                userType: 'supreme',
                isSupreme: true,
                isSuperAdmin: true,
                
                // Supreme user permissions (all true)
                permissions: {
                    canManageOrganizations: true,
                    canViewAllOrganizations: true,
                    canActivateOrganizations: true,
                    canDeactivateOrganizations: true,
                    canCreateOrganizations: true,
                    canDeleteOrganizations: true,
                    canManageSubscriptions: true,
                    canUpdateSubscriptionPrice: true,
                    canViewAllSubscriptions: true,
                    canCancelSubscriptions: true,
                    canAccessDashboard: true,
                    canViewLogs: true,
                    canManageSystem: true
                },
                
                // Permission strings array
                permissionsList: [
                    'organization.view', 'organization.manage', 'organization.activate',
                    'organization.deactivate', 'organization.create', 'organization.delete',
                    'subscription.view', 'subscription.manage', 'subscription.update_price',
                    'subscription.cancel', 'system.access', 'system.manage', 'logs.view'
                ]
            };

            return next();
        }

        // ============================================
        // ORGANIZATION MEMBER HANDLING
        // ============================================
        if (decoded.memberId) {
            const member = await OrganizationMember.findById(decoded.memberId)
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
                    message: 'Organization member no longer exists'
                });
            }

            // Check if member is active
            if (member.status !== 'active') {
                return res.status(401).json({
                    success: false,
                    message: 'Member account is not active'
                });
            }

            // Get organization details
            const organization = await Organization.findById(member.organization);
            
            if (!organization) {
                return res.status(403).json({
                    success: false,
                    message: 'Organization not found'
                });
            }

            // Check if organization is active
            if (!organization.isActive || organization.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'Organization account is not active'
                });
            }

            // Check subscription status
            const OrganizationSubscription = require('../models/organizationSubscription.model');
            const subscription = await OrganizationSubscription.findOne({
                organization: member.organization
            });

            if (subscription && (subscription.status === 'expired' || subscription.status === 'cancelled')) {
                return res.status(403).json({
                    success: false,
                    message: 'Organization subscription has expired'
                });
            }

            // Build permissions from roles
            const permissionsList = [];
            const permissionsMap = {};
            
            // Get all unique permissions from all roles
            const allPermissions = new Map();
            
            for (const role of member.roles) {
                if (role.permissions && Array.isArray(role.permissions)) {
                    for (const permission of role.permissions) {
                        const permString = `${permission.module}.${permission.resource}_${permission.action}`;
                        
                        if (!allPermissions.has(permString)) {
                            allPermissions.set(permString, permission);
                            
                            // Build structured permissions
                            if (!permissionsMap[permission.module]) {
                                permissionsMap[permission.module] = {};
                            }
                            if (!permissionsMap[permission.module][permission.resource]) {
                                permissionsMap[permission.module][permission.resource] = [];
                            }
                            if (!permissionsMap[permission.module][permission.resource].includes(permission.action)) {
                                permissionsMap[permission.module][permission.resource].push(permission.action);
                            }
                        }
                    }
                }
            }
            
            permissionsList.push(...allPermissions.keys());

            // Check if member has Super Administrator role
            const isSuperAdmin = member.roles.some(role => role.name === 'Super Administrator');

            req.user = {
                // Core member info
                id: member._id,
                memberId: member._id,
                email: member.personalInfo.email,
                firstName: member.personalInfo.firstName,
                lastName: member.personalInfo.lastName,
                displayName: member.personalInfo.displayName,
                avatar: member.avatar,
                
                // User type
                userType: 'organization',
                isSupreme: false,
                isSuperAdmin,
                
                // Organization info
                organizationId: member.organization.toString(),
                organization: {
                    id: organization._id,
                    name: organization.name,
                    slug: organization.slug,
                    email: organization.email,
                    status: organization.status,
                    isActive: organization.isActive
                },
                
                // Member info
                jobTitle: member.jobTitle,
                department: member.department,
                employeeId: member.employeeId,
                branch: member.branch,
                isBranchManager: member.isBranchManager,
                
                // Roles
                roles: member.roles.map(role => ({
                    id: role._id,
                    name: role.name,
                    description: role.description,
                    category: role.category,
                    hierarchy: role.hierarchy
                })),
                roleIds: member.roles.map(role => role._id),
                
                // Permissions
                permissions: permissionsMap,
                permissionsList,
                
                // Member status
                status: member.status,
                joinedAt: member.joinedAt
            };

            return next();
        }

        // If we get here, token is invalid
        return res.status(401).json({
            success: false,
            message: 'Invalid token structure'
        });

    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Restrict access to Supreme Users only
 */
const isSupreme = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!req.user.isSupreme) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Supreme user privileges required.'
            });
        }

        next();
    } catch (error) {
        console.error('Supreme check error:', error);
        return res.status(403).json({
            success: false,
            message: 'Authorization check failed'
        });
    }
};

/**
 * Restrict access to Organization Users only
 */
const isOrganizationUser = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (req.user.isSupreme) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. This route is for organization users only.'
            });
        }

        if (req.user.userType !== 'organization') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Organization user privileges required.'
            });
        }

        next();
    } catch (error) {
        console.error('Organization user check error:', error);
        return res.status(403).json({
            success: false,
            message: 'Authorization check failed'
        });
    }
};

// ============================================
// SUPREME USER SPECIFIC MIDDLEWARE
// ============================================

const canManageOrganizations = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!req.user.isSupreme) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Supreme user privileges required.'
            });
        }

        next();
    } catch (error) {
        console.error('Organization management check error:', error);
        return res.status(403).json({
            success: false,
            message: 'Authorization check failed'
        });
    }
};

const canManageSubscriptions = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!req.user.isSupreme) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Supreme user privileges required.'
            });
        }

        next();
    } catch (error) {
        console.error('Subscription management check error:', error);
        return res.status(403).json({
            success: false,
            message: 'Authorization check failed'
        });
    }
};

const canUpdatePrice = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!req.user.isSupreme) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Supreme user privileges required.'
            });
        }

        next();
    } catch (error) {
        console.error('Price update check error:', error);
        return res.status(403).json({
            success: false,
            message: 'Authorization check failed'
        });
    }
};

const canViewLogs = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!req.user.isSupreme) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Supreme user privileges required.'
            });
        }

        next();
    } catch (error) {
        console.error('Logs view check error:', error);
        return res.status(403).json({
            success: false,
            message: 'Authorization check failed'
        });
    }
};

// ============================================
// PERMISSION CHECK MIDDLEWARE
// ============================================

const hasPermission = (permission) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Supreme users have all permissions
            if (req.user.isSupreme) {
                return next();
            }

            // Check if user has the permission
            if (!req.user.permissionsList || !req.user.permissionsList.includes(permission)) {
                return res.status(403).json({
                    success: false,
                    message: `Insufficient permissions. Required: ${permission}`
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(403).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
};

const hasAnyPermission = (permissions) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            if (req.user.isSupreme) {
                return next();
            }

            const hasAny = permissions.some(p => req.user.permissionsList?.includes(p));

            if (!hasAny) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions. Need at least one of the required permissions.'
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(403).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
};

const hasAllPermissions = (permissions) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            if (req.user.isSupreme) {
                return next();
            }

            const hasAll = permissions.every(p => req.user.permissionsList?.includes(p));

            if (!hasAll) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions. Missing some required permissions.'
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(403).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
};

// ============================================
// ORGANIZATION SPECIFIC MIDDLEWARE
// ============================================

const belongsToOrganization = (paramName = 'organizationId') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Supreme users can access any organization
            if (req.user.isSupreme) {
                return next();
            }

            const organizationId = req.params[paramName] || req.body.organizationId || req.query.organizationId;
            
            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization ID required'
                });
            }

            if (req.user.organizationId.toString() !== organizationId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied - user does not belong to this organization'
                });
            }

            next();
        } catch (error) {
            console.error('Organization check error:', error);
            return res.status(403).json({
                success: false,
                message: 'Organization verification failed'
            });
        }
    };
};

const hasModuleAccess = (moduleSlug) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Supreme users can access any module
            if (req.user.isSupreme) {
                return next();
            }

            if (!req.user.organizationId) {
                return res.status(403).json({
                    success: false,
                    message: 'User has no organization'
                });
            }

            const organization = await Organization.findById(req.user.organizationId)
                .populate('installedModules.module');

            if (!organization) {
                return res.status(404).json({
                    success: false,
                    message: 'Organization not found'
                });
            }

            const hasModule = organization.installedModules?.some(im => 
                im.module?.slug === moduleSlug && im.status === 'active'
            );

            if (!hasModule) {
                return res.status(403).json({
                    success: false,
                    message: `Module '${moduleSlug}' is not installed or active`
                });
            }

            req.moduleSettings = organization.installedModules.find(
                im => im.module?.slug === moduleSlug
            )?.settings;

            next();
        } catch (error) {
            console.error('Module access check error:', error);
            return res.status(403).json({
                success: false,
                message: 'Module access verification failed'
            });
        }
    };
};

// ============================================
// OPTIONAL AUTHENTICATION
// ============================================

const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (token) {
            const decoded = verifyToken(token);
            
            if (decoded) {
                if (decoded.userId && decoded.isSupreme) {
                    const user = await User.findById(decoded.userId)
                        .select('-password -actionLog -apiKeys -twoFactorSecret -passwordResetToken -passwordResetExpires');

                    if (user && user.isActive) {
                        req.user = {
                            id: user._id,
                            userId: user._id,
                            email: user.email,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            displayName: user.displayName,
                            userType: 'supreme',
                            isSupreme: true,
                            isSuperAdmin: true
                        };
                    }
                } else if (decoded.memberId) {
                    const member = await OrganizationMember.findById(decoded.memberId)
                        .populate('roles');

                    if (member && member.status === 'active') {
                        const organization = await Organization.findById(member.organization);
                        
                        if (organization && organization.isActive) {
                            req.user = {
                                id: member._id,
                                memberId: member._id,
                                email: member.personalInfo.email,
                                firstName: member.personalInfo.firstName,
                                lastName: member.personalInfo.lastName,
                                displayName: member.personalInfo.displayName,
                                userType: 'organization',
                                isSupreme: false,
                                isSuperAdmin: member.roles?.some(r => r.name === 'Super Administrator'),
                                organizationId: member.organization.toString()
                            };
                        }
                    }
                }
            }
        }
        
        next();
    } catch (error) {
        // Just continue without user
        next();
    }
};

module.exports = {
    // Main authentication
    protect,
    optionalAuth,
    
    // User type checks
    isSupreme,
    isOrganizationUser,
    
    // Supreme user specific
    canManageOrganizations,
    canManageSubscriptions,
    canUpdatePrice,
    canViewLogs,
    
    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Organization specific
    belongsToOrganization,
    hasModuleAccess
};