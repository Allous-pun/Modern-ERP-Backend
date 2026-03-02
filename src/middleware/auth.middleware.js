// src/middleware/auth.middleware.js
const { verifyToken } = require('../utils/token.utils');
const User = require('../models/user.model');
const Organization = require('../models/organization.model');

/**
 * Protect routes - ensures user is authenticated
 * Adds user info to req.user
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

        // Get user with populated data
        const user = await User.findById(decoded.userId)
            .select('-password')
            .populate({
                path: 'roles',
                populate: {
                    path: 'permissions',
                    model: 'Permission'
                }
            })
            .populate('organization');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User no longer exists'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Check if organization is active (if user has an organization)
        if (user.organization) {
            // Check if organization is active
            if (!user.organization.isActive) {
                return res.status(403).json({
                    success: false,
                    message: 'Organization account is not active'
                });
            }

            // Optional: Check status field if you want to use it for more granular control
            if (user.organization.status && user.organization.status !== 'active' && user.organization.status !== 'trial') {
                return res.status(403).json({
                    success: false,
                    message: 'Organization account is not active'
                });
            }
        }

        // Add user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            organizationId: user.organization?._id || user.organization || decoded.organizationId,
            organization: user.organization,
            roles: user.roles,
            isSuperAdmin: user.roles?.some(role => role.name === 'Super Administrator'),
            permissions: user.roles?.reduce((acc, role) => {
                role.permissions?.forEach(permission => {
                    const permString = `${permission.module}.${permission.resource}_${permission.action}`;
                    if (!acc.includes(permString)) {
                        acc.push(permString);
                    }
                });
                return acc;
            }, [])
        };
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};


/**
 * Check if user has specific permission(s)
 * @param {...string} requiredPermissions - Permission strings to check
 */
const hasPermission = (...requiredPermissions) => {
    return async (req, res, next) => {
        try {
            // Ensure user is authenticated first
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Super Admin bypass
            if (req.user.isSuperAdmin) {
                return next();
            }

            // Check if user has all required permissions
            const userPermissions = req.user.permissions || [];
            const hasAllPermissions = requiredPermissions.every(permission => 
                userPermissions.includes(permission)
            );

            if (!hasAllPermissions) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    required: requiredPermissions,
                    missing: requiredPermissions.filter(p => !userPermissions.includes(p))
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

/**
 * Check if user has any of the specified permissions
 * @param {...string} requiredPermissions - Permission strings to check
 */
const hasAnyPermission = (...requiredPermissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Super Admin bypass
            if (req.user.isSuperAdmin) {
                return next();
            }

            const userPermissions = req.user.permissions || [];
            const hasAny = requiredPermissions.some(permission => 
                userPermissions.includes(permission)
            );

            if (!hasAny) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions - need at least one of the required permissions',
                    required: requiredPermissions
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

/**
 * Check if user belongs to specific organization
 * @param {string} paramName - Request parameter name containing organization ID
 */
const belongsToOrganization = (paramName = 'organizationId') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Super Admin bypass (can access any organization)
            if (req.user.isSuperAdmin) {
                return next();
            }

            const organizationId = req.params[paramName] || req.body.organizationId;
            
            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization ID required'
                });
            }

            // Check if user belongs to this organization
            if (req.user.organizationId?.toString() !== organizationId.toString()) {
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

/**
 * Check if user has module access
 * @param {string} moduleSlug - Module slug to check
 */
const hasModuleAccess = (moduleSlug) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Super Admin bypass
            if (req.user.isSuperAdmin) {
                return next();
            }

            if (!req.user.organizationId) {
                return res.status(403).json({
                    success: false,
                    message: 'User has no organization'
                });
            }

            // Get organization with installed modules
            const organization = await Organization.findById(req.user.organizationId)
                .populate('installedModules.module');

            if (!organization) {
                return res.status(404).json({
                    success: false,
                    message: 'Organization not found'
                });
            }

            // Check if module is installed and active
            const hasModule = organization.installedModules?.some(im => 
                im.module?.slug === moduleSlug && im.status === 'active'
            );

            if (!hasModule) {
                return res.status(403).json({
                    success: false,
                    message: `Module '${moduleSlug}' is not installed or active`
                });
            }

            // Add module settings to request for later use
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

/**
 * Optional authentication - doesn't require auth but adds user if present
 */
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
                const user = await User.findById(decoded.userId)
                    .select('-password')
                    .populate('roles')
                    .populate('organization');

                if (user && user.isActive) {
                    // Check organization status if needed
                    if (user.organization && !user.organization.isActive) {
                        // Just log but don't block optional auth
                        console.log('⚠️ User has inactive organization but optional auth continues');
                    }
                    
                    req.user = {
                        userId: decoded.userId,
                        email: decoded.email,
                        organizationId: user.organization?._id,
                        organization: user.organization,
                        roles: user.roles,
                        isSuperAdmin: user.roles?.some(role => role.name === 'Super Administrator')
                    };
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
    protect,
    hasPermission,
    hasAnyPermission,
    belongsToOrganization,
    hasModuleAccess,
    optionalAuth
};