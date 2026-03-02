// src/controllers/permission.controller.js
const Permission = require('../models/permission.model');

// @desc    Get all permissions
// @route   GET /api/permissions
// @access  Private (requires system.permissions_view)
const getPermissions = async (req, res) => {
    try {
        const permissions = await Permission.find()
            .sort({ module: 1, resource: 1, action: 1 });

        // Group by module for easier consumption
        const groupedPermissions = {};
        permissions.forEach(perm => {
            if (!groupedPermissions[perm.module]) {
                groupedPermissions[perm.module] = [];
            }
            groupedPermissions[perm.module].push({
                id: perm._id,
                name: perm.name,
                description: perm.description,
                resource: perm.resource,
                action: perm.action,
                permissionString: `${perm.module}.${perm.resource}_${perm.action}`
            });
        });

        res.status(200).json({
            success: true,
            count: permissions.length,
            data: permissions,
            grouped: groupedPermissions
        });
    } catch (error) {
        console.error('Get permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch permissions'
        });
    }
};

// @desc    Get permissions by module
// @route   GET /api/permissions/module/:module
// @access  Private (requires system.permissions_view)
const getPermissionsByModule = async (req, res) => {
    try {
        const { module } = req.params;
        
        const permissions = await Permission.find({ module })
            .sort({ resource: 1, action: 1 });

        res.status(200).json({
            success: true,
            count: permissions.length,
            data: permissions
        });
    } catch (error) {
        console.error('Get permissions by module error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch permissions'
        });
    }
};

// @desc    Get single permission
// @route   GET /api/permissions/:id
// @access  Private (requires system.permissions_view)
const getPermission = async (req, res) => {
    try {
        const permission = await Permission.findById(req.params.id);
        
        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Permission not found'
            });
        }

        res.status(200).json({
            success: true,
            data: permission
        });
    } catch (error) {
        console.error('Get permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch permission'
        });
    }
};

module.exports = {
    getPermissions,
    getPermissionsByModule,
    getPermission
};