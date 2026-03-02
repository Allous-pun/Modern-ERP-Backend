// src/middleware/permission.middleware.js
const User = require('../models/user.model');
const InstalledModule = require('../models/installedModule.model');
const Module = require('../models/module.model');

/**
 * Helper function to check if module is installed for organization
 */
const checkModuleInstalled = async (userId, organizationId, permissionString) => {
    try {
        // Extract module from permission string (e.g., 'finance.create_invoice' -> 'finance')
        const modulePrefix = permissionString.split('.')[0];
        
        const module = await Module.findOne({ permissionPrefix: modulePrefix });
        if (!module) return true; // If no module mapping, allow (fallback)
        
        const installed = await InstalledModule.findOne({
            organization: organizationId,
            module: module._id,
            status: { $in: ['active', 'trial'] }
        });
        
        return !!installed;
    } catch (error) {
        console.error('Module check error:', error);
        return false;
    }
};

/**
 * Middleware to check if authenticated user has required permission
 * @param {string} requiredPermission - Permission string to check (e.g., 'finance.create_invoice')
 */
const requirePermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            // User should already be attached by auth middleware
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Get organization ID
            let organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
            
            if (!organizationId && req.user.organizations?.length > 0) {
                organizationId = req.user.organizations[0];
            }

            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'No organization specified'
                });
            }

            // First check if the required module is installed for this organization
            const isModuleInstalled = await checkModuleInstalled(
                req.user.userId, 
                organizationId, 
                requiredPermission
            );

            if (!isModuleInstalled) {
                return res.status(403).json({
                    success: false,
                    message: 'The required module is not installed for your organization',
                    required: requiredPermission
                });
            }

            // Get full user with roles and permissions
            const user = await User.findById(req.user.userId)
                .populate({
                    path: 'roles',
                    populate: {
                        path: 'permissions',
                        model: 'Permission'
                    }
                });

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user has the permission
            const hasPermission = await user.hasPermission(requiredPermission);

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Insufficient permissions.',
                    required: requiredPermission
                });
            }

            next();
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
 * Middleware to check if user has any of the required permissions
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

            let organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

            const user = await User.findById(req.user.userId)
                .populate({
                    path: 'roles',
                    populate: {
                        path: 'permissions',
                        model: 'Permission'
                    }
                });

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check each permission for module installation
            for (const permission of requiredPermissions) {
                const isModuleInstalled = await checkModuleInstalled(
                    req.user.userId, 
                    organizationId, 
                    permission
                );
                
                if (isModuleInstalled) {
                    const hasPermission = await user.hasPermission(permission);
                    if (hasPermission) {
                        return next();
                    }
                }
            }

            return res.status(403).json({
                success: false,
                message: 'Access denied. Need one of: ' + requiredPermissions.join(', ')
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
 * Middleware to check if user has all required permissions
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

            let organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

            const user = await User.findById(req.user.userId)
                .populate({
                    path: 'roles',
                    populate: {
                        path: 'permissions',
                        model: 'Permission'
                    }
                });

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check all permissions
            for (const permission of requiredPermissions) {
                const isModuleInstalled = await checkModuleInstalled(
                    req.user.userId, 
                    organizationId, 
                    permission
                );
                
                if (!isModuleInstalled) {
                    return res.status(403).json({
                        success: false,
                        message: `Module for permission '${permission}' is not installed`
                    });
                }

                const hasPermission = await user.hasPermission(permission);
                if (!hasPermission) {
                    return res.status(403).json({
                        success: false,
                        message: `Missing required permission: ${permission}`
                    });
                }
            }

            next();
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