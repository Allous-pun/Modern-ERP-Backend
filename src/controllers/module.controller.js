// src/controllers/module.controller.js
const Module = require('../models/module.model');
const InstalledModule = require('../models/installedModule.model');
const Organization = require('../models/organization.model');
const User = require('../models/user.model');
const OrganizationMember = require('../models/organizationMember.model');
const Role = require('../models/role.model');

// ========== MODULE REGISTRY ENDPOINTS ==========

// @desc    Get all available modules
// @route   GET /api/modules/available
// @access  Private (requires system.modules_view)
const getAvailableModules = async (req, res) => {
    try {
        const { category, isCore, isPaid } = req.query;
        
        // Build filter
        const filter = { isActive: true };
        if (category) filter.category = category;
        if (isCore !== undefined) filter.isCore = isCore === 'true';
        if (isPaid !== undefined) filter.isPaid = isPaid === 'true';
        
        const modules = await Module.find(filter)
            .sort({ displayOrder: 1, name: 1 });
        
        // Get user's organization
        let organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        let installedModules = [];
        if (organizationId) {
            installedModules = await InstalledModule.find({
                organization: organizationId,
                status: { $in: ['active', 'trial'] }
            }).distinct('module');
        }
        
        // Add installed flag to each module
        const modulesWithStatus = modules.map(module => ({
            ...module.toObject(),
            isInstalled: installedModules.some(id => id.equals(module._id))
        }));
        
        res.status(200).json({
            success: true,
            count: modulesWithStatus.length,
            data: modulesWithStatus
        });
    } catch (error) {
        console.error('Get modules error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch modules'
        });
    }
};

// @desc    Get single module
// @route   GET /api/modules/:slug
// @access  Private (requires system.modules_view)
const getModuleBySlug = async (req, res) => {
    try {
        const module = await Module.findOne({ slug: req.params.slug });
        
        if (!module) {
            return res.status(404).json({
                success: false,
                message: 'Module not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: module
        });
    } catch (error) {
        console.error('Get module error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch module'
        });
    }
};

// ========== INSTALLED MODULES ENDPOINTS ==========

// @desc    Get installed modules for current organization
// @route   GET /api/modules/installed
// @access  Private
const getInstalledModules = async (req, res) => {
    try {
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
        
        const installedModules = await InstalledModule.find({
            organization: organizationId
        })
        .populate('module')
        .populate('installedBy', 'firstName lastName email');
        
        res.status(200).json({
            success: true,
            count: installedModules.length,
            data: installedModules
        });
    } catch (error) {
        console.error('Get installed modules error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch installed modules'
        });
    }
};

// @desc    Install a module for organization
// @route   POST /api/modules/install/:slug
// @access  Private (requires system.modules_manage)
const installModule = async (req, res) => {
    try {
        const { slug } = req.params;
        const settings = req.body?.settings || {};
        
        // Get user
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Determine organization ID
        let organizationId = req.headers['x-organization-id'];
        
        if (!organizationId && user.defaultOrganization) {
            organizationId = user.defaultOrganization;
        }
        
        if (!organizationId && user.organizations && user.organizations.length > 0) {
            organizationId = user.organizations[0];
        }

        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'No organization specified. Please provide X-Organization-ID header'
            });
        }

        // Verify organization exists
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Verify user belongs to this organization
        const member = await OrganizationMember.findOne({
            user: user._id,
            organization: organizationId,
            status: 'active'
        });

        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this organization'
            });
        }

        // Find the module
        const module = await Module.findOne({ slug });
        
        if (!module) {
            return res.status(404).json({
                success: false,
                message: 'Module not found'
            });
        }
        
        // Check if already installed
        const existing = await InstalledModule.findOne({
            organization: organizationId,
            module: module._id
        });
        
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Module already installed'
            });
        }
        
        // Check dependencies
        if (module.dependencies && module.dependencies.length > 0) {
            const dependencies = await Module.find({ slug: { $in: module.dependencies } });
            const dependencyIds = dependencies.map(d => d._id);
            
            const installedDeps = await InstalledModule.countDocuments({
                organization: organizationId,
                module: { $in: dependencyIds },
                status: { $in: ['active', 'trial'] }
            });
            
            if (installedDeps !== module.dependencies.length) {
                return res.status(400).json({
                    success: false,
                    message: `Module dependencies not installed: ${module.dependencies.join(', ')}`
                });
            }
        }
        
        // Check subscription limits
        const subscription = organization.subscription;
        const installedCount = await InstalledModule.countDocuments({
            organization: organizationId,
            status: { $in: ['active', 'trial'] }
        });

        if (subscription?.maxModules && installedCount >= subscription.maxModules) {
            return res.status(400).json({
                success: false,
                message: `Maximum module limit (${subscription.maxModules}) reached`
            });
        }
        
        // Install module
        const installedModule = await InstalledModule.create({
            organization: organizationId,
            module: module._id,
            moduleSlug: module.slug,
            installedBy: user._id,
            settings,
            enabledFeatures: module.features.map(f => f.key),
            status: module.trialAvailable ? 'trial' : 'active',
            subscription: {
                plan: module.trialAvailable ? 'trial' : 'active',
                renewalDate: module.trialAvailable ? 
                    new Date(Date.now() + module.trialDays * 24 * 60 * 60 * 1000) : null,
                billingCycle: 'monthly',
                currency: 'USD'
            }
        });

        // Optional: Auto-assign module permissions to Organization Admin role
        // This is a nice-to-have feature
        try {
            const orgAdminRole = await Role.findOne({ 
                name: 'Organization Admin',
                organization: organizationId 
            });
            
            if (orgAdminRole) {
                // Get all permissions for this module
                const Permission = require('../models/permission.model');
                const modulePermissions = await Permission.find({ 
                    module: module.permissionPrefix 
                });
                
                // Add these permissions to the Organization Admin role
                const newPermissions = modulePermissions
                    .map(p => p._id)
                    .filter(id => !orgAdminRole.permissions.includes(id));
                
                if (newPermissions.length > 0) {
                    orgAdminRole.permissions.push(...newPermissions);
                    await orgAdminRole.save();
                }
            }
        } catch (roleError) {
            // Log but don't fail the installation
            console.log('⚠️ Could not auto-assign permissions:', roleError.message);
        }
        
        // Populate for response
        await installedModule.populate('module');
        await installedModule.populate('installedBy', 'firstName lastName email');
        
        res.status(201).json({
            success: true,
            message: 'Module installed successfully',
            data: installedModule
        });
    } catch (error) {
        console.error('Install module error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to install module'
        });
    }
};

// @desc    Uninstall a module
// @route   DELETE /api/modules/uninstall/:slug
// @access  Private (requires system.modules_manage)
const uninstallModule = async (req, res) => {
    try {
        const { slug } = req.params;
        
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        let organizationId = req.headers['x-organization-id'] || user.defaultOrganization;
        
        const module = await Module.findOne({ slug });
        
        if (!module) {
            return res.status(404).json({
                success: false,
                message: 'Module not found'
            });
        }
        
        // Check if core module
        if (module.isCore) {
            return res.status(400).json({
                success: false,
                message: 'Core modules cannot be uninstalled'
            });
        }
        
        // Check if other modules depend on this
        const dependentModules = await Module.find({ dependencies: slug });
        
        if (dependentModules.length > 0) {
            const installedDependents = await InstalledModule.countDocuments({
                organization: organizationId,
                moduleSlug: { $in: dependentModules.map(m => m.slug) },
                status: { $in: ['active', 'trial'] }
            });
            
            if (installedDependents > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot uninstall: other modules depend on ${module.name}`
                });
            }
        }
        
        // Uninstall module
        await InstalledModule.deleteOne({
            organization: organizationId,
            module: module._id
        });
        
        res.status(200).json({
            success: true,
            message: 'Module uninstalled successfully'
        });
    } catch (error) {
        console.error('Uninstall module error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to uninstall module'
        });
    }
};

// @desc    Update module settings
// @route   PUT /api/modules/installed/:id/settings
// @access  Private (requires system.modules_manage)
const updateModuleSettings = async (req, res) => {
    try {
        const { id } = req.params;
        const { settings, enabledFeatures } = req.body;
        
        const installedModule = await InstalledModule.findById(id);
        
        if (!installedModule) {
            return res.status(404).json({
                success: false,
                message: 'Installed module not found'
            });
        }
        
        if (settings) {
            installedModule.settings = { ...installedModule.settings, ...settings };
        }
        
        if (enabledFeatures) {
            installedModule.enabledFeatures = enabledFeatures;
        }
        
        await installedModule.save();
        
        await installedModule.populate('module');
        
        res.status(200).json({
            success: true,
            message: 'Module settings updated',
            data: installedModule
        });
    } catch (error) {
        console.error('Update module settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update module settings'
        });
    }
};

// @desc    Check if module is installed
// @route   GET /api/modules/check/:slug
// @access  Private
const checkModuleInstalled = async (req, res) => {
    try {
        const { slug } = req.params;
        
        let organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const module = await Module.findOne({ slug });
        
        if (!module) {
            return res.status(404).json({
                success: false,
                message: 'Module not found'
            });
        }
        
        const installed = await InstalledModule.findOne({
            organization: organizationId,
            module: module._id,
            status: { $in: ['active', 'trial'] }
        });
        
        res.status(200).json({
            success: true,
            data: {
                isInstalled: !!installed,
                module: module.name,
                settings: installed?.settings || null,
                enabledFeatures: installed?.enabledFeatures || [],
                status: installed?.status || null
            }
        });
    } catch (error) {
        console.error('Check module error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check module installation'
        });
    }
};

module.exports = {
    getAvailableModules,
    getModuleBySlug,
    getInstalledModules,
    installModule,
    uninstallModule,
    updateModuleSettings,
    checkModuleInstalled
};