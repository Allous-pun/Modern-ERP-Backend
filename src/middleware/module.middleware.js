// src/middleware/module.middleware.js
const InstalledModule = require('../models/installedModule.model');
const Module = require('../models/module.model');
const Organization = require('../models/organization.model');

/**
 * Middleware to check if a module is installed for the user's organization
 * @param {string} moduleSlug - Slug of the module to check
 */
const requireModule = (moduleSlug) => {
    return async (req, res, next) => {
        try {
            // User should already be attached by auth middleware
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Get organization ID from headers or from user context
            let organizationId = req.headers['x-organization-id'];
            
            // For organization users, get org from their context
            if (!organizationId && req.user.organizationId) {
                organizationId = req.user.organizationId;
            }
            
            // For supreme users, they need to specify org
            if (!organizationId && req.user.isSupreme) {
                return res.status(400).json({
                    success: false,
                    message: 'Supreme users must specify X-Organization-ID header'
                });
            }

            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'No organization specified. Please provide X-Organization-ID header'
                });
            }

            // Find the module
            const module = await Module.findOne({ slug: moduleSlug });
            if (!module) {
                return res.status(404).json({
                    success: false,
                    message: `Module '${moduleSlug}' not found`
                });
            }

            // Check if module is installed and active
            const installedModule = await InstalledModule.findOne({
                organization: organizationId,
                module: module._id,
                status: { $in: ['active', 'trial'] }
            });

            if (!installedModule) {
                return res.status(403).json({
                    success: false,
                    message: `Module '${module.name}' is not installed for your organization`
                });
            }

            // Check if organization subscription is valid (for paid modules)
            const organization = await Organization.findById(organizationId);
            if (module.isPaid && organization.subscription?.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: `Module '${module.name}' requires an active subscription`
                });
            }

            // Attach module info to request for later use
            req.module = {
                id: module._id,
                slug: module.slug,
                name: module.name,
                settings: installedModule.settings,
                enabledFeatures: installedModule.enabledFeatures,
                status: installedModule.status
            };

            // Update usage stats (asynchronous - don't await)
            InstalledModule.updateOne(
                { _id: installedModule._id },
                { 
                    $inc: { 'usage.accessCount': 1 },
                    $set: { 'usage.lastAccessed': new Date() }
                }
            ).exec();

            next();
        } catch (error) {
            console.error('Module check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking module installation'
            });
        }
    };
};

/**
 * Middleware to check if ANY of the specified modules are installed
 * @param {string[]} moduleSlugs - Array of module slugs
 */
const requireAnyModule = (moduleSlugs) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            let organizationId = req.headers['x-organization-id'] || req.user.organizationId;

            if (!organizationId && req.user.isSupreme) {
                return res.status(400).json({
                    success: false,
                    message: 'Supreme users must specify X-Organization-ID header'
                });
            }

            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'No organization specified'
                });
            }

            // Find all modules
            const modules = await Module.find({ slug: { $in: moduleSlugs } });
            const moduleIds = modules.map(m => m._id);

            // Check if any module is installed
            const installedModule = await InstalledModule.findOne({
                organization: organizationId,
                module: { $in: moduleIds },
                status: { $in: ['active', 'trial'] }
            });

            if (!installedModule) {
                return res.status(403).json({
                    success: false,
                    message: `None of the required modules are installed. Required: ${moduleSlugs.join(', ')}`
                });
            }

            next();
        } catch (error) {
            console.error('Module check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking module installation'
            });
        }
    };
};

/**
 * Middleware to check if ALL specified modules are installed
 * @param {string[]} moduleSlugs - Array of module slugs
 */
const requireAllModules = (moduleSlugs) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            let organizationId = req.headers['x-organization-id'] || req.user.organizationId;

            if (!organizationId && req.user.isSupreme) {
                return res.status(400).json({
                    success: false,
                    message: 'Supreme users must specify X-Organization-ID header'
                });
            }

            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'No organization specified'
                });
            }

            // Find all modules
            const modules = await Module.find({ slug: { $in: moduleSlugs } });
            
            if (modules.length !== moduleSlugs.length) {
                const found = modules.map(m => m.slug);
                const missing = moduleSlugs.filter(slug => !found.includes(slug));
                return res.status(404).json({
                    success: false,
                    message: `Modules not found: ${missing.join(', ')}`
                });
            }

            const moduleIds = modules.map(m => m._id);

            // Check if all modules are installed
            const installedCount = await InstalledModule.countDocuments({
                organization: organizationId,
                module: { $in: moduleIds },
                status: { $in: ['active', 'trial'] }
            });

            if (installedCount !== moduleSlugs.length) {
                return res.status(403).json({
                    success: false,
                    message: `Not all required modules are installed. Required: ${moduleSlugs.join(', ')}`
                });
            }

            next();
        } catch (error) {
            console.error('Module check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking module installation'
            });
        }
    };
};

/**
 * Middleware to check if a specific feature is enabled for an installed module
 * @param {string} moduleSlug - Module slug
 * @param {string} featureKey - Feature key to check
 */
const requireFeature = (moduleSlug, featureKey) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            let organizationId = req.headers['x-organization-id'] || req.user.organizationId;

            if (!organizationId && req.user.isSupreme) {
                return res.status(400).json({
                    success: false,
                    message: 'Supreme users must specify X-Organization-ID header'
                });
            }

            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'No organization specified'
                });
            }

            // Find the module
            const module = await Module.findOne({ slug: moduleSlug });
            if (!module) {
                return res.status(404).json({
                    success: false,
                    message: `Module '${moduleSlug}' not found`
                });
            }

            // Check if module is installed
            const installedModule = await InstalledModule.findOne({
                organization: organizationId,
                module: module._id,
                status: { $in: ['active', 'trial'] }
            });

            if (!installedModule) {
                return res.status(403).json({
                    success: false,
                    message: `Module '${module.name}' is not installed`
                });
            }

            // Check if feature is enabled
            if (!installedModule.enabledFeatures.includes(featureKey)) {
                return res.status(403).json({
                    success: false,
                    message: `Feature '${featureKey}' is not enabled for this module`
                });
            }

            next();
        } catch (error) {
            console.error('Feature check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking feature availability'
            });
        }
    };
};

/**
 * Get all active modules for sidebar rendering
 * @route GET /api/modules/active
 */
const getActiveModules = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        let organizationId = req.headers['x-organization-id'] || req.user.organizationId;

        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'No organization specified'
            });
        }

        const installedModules = await InstalledModule.find({
            organization: organizationId,
            status: { $in: ['active', 'trial'] }
        })
        .populate('module')
        .sort({ 'module.displayOrder': 1 });

        const activeModules = installedModules.map(im => ({
            id: im.module._id,
            name: im.module.name,
            slug: im.module.slug,
            icon: im.module.icon,
            color: im.module.color,
            routeBase: im.module.routeBase,
            sidebarGroup: im.module.sidebarGroup,
            displayOrder: im.module.displayOrder,
            status: im.status,
            enabledFeatures: im.enabledFeatures,
            settings: im.settings
        }));

        res.status(200).json({
            success: true,
            count: activeModules.length,
            data: activeModules
        });
    } catch (error) {
        console.error('Get active modules error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch active modules'
        });
    }
};

module.exports = {
    requireModule,
    requireAnyModule,
    requireAllModules,
    requireFeature,
    getActiveModules
};