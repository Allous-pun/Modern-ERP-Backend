// src/controllers/role.controller.js
const Role = require('../models/role.model');
const Permission = require('../models/permission.model');
const OrganizationMember = require('../models/organizationMember.model');
const User = require('../models/user.model');

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private (requires system.permissions_view)
const getRoles = async (req, res) => {
    try {
        const roles = await Role.find()
            .populate('permissions', 'name module resource action')
            .sort({ hierarchy: -1, name: 1 });

        res.status(200).json({
            success: true,
            count: roles.length,
            data: roles
        });
    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch roles'
        });
    }
};

// @desc    Get single role
// @route   GET /api/roles/:id
// @access  Private (requires system.permissions_view)
const getRole = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id)
            .populate('permissions');

        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        res.status(200).json({
            success: true,
            data: role
        });
    } catch (error) {
        console.error('Get role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch role'
        });
    }
};

// @desc    Create new role
// @route   POST /api/roles
// @access  Private (requires system.roles_manage)
const createRole = async (req, res) => {
    try {
        const { name, description, category, permissions, hierarchy } = req.body;

        // Check if role already exists
        const existingRole = await Role.findOne({ name });
        if (existingRole) {
            return res.status(400).json({
                success: false,
                message: 'Role already exists'
            });
        }

        // Verify permissions exist
        if (permissions && permissions.length > 0) {
            const validPermissions = await Permission.find({
                _id: { $in: permissions }
            });
            
            if (validPermissions.length !== permissions.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more permissions are invalid'
                });
            }
        }

        const role = await Role.create({
            name,
            description,
            category,
            permissions: permissions || [],
            hierarchy: hierarchy || 0
        });

        res.status(201).json({
            success: true,
            message: 'Role created successfully',
            data: role
        });
    } catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create role'
        });
    }
};

// @desc    Update role
// @route   PUT /api/roles/:id
// @access  Private (requires system.roles_manage)
const updateRole = async (req, res) => {
    try {
        const { name, description, category, permissions, hierarchy, isActive } = req.body;

        const role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        // Verify permissions exist if provided
        if (permissions) {
            const validPermissions = await Permission.find({
                _id: { $in: permissions }
            });
            
            if (validPermissions.length !== permissions.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more permissions are invalid'
                });
            }
        }

        // Update fields
        if (name) role.name = name;
        if (description) role.description = description;
        if (category) role.category = category;
        if (permissions) role.permissions = permissions;
        if (hierarchy !== undefined) role.hierarchy = hierarchy;
        if (isActive !== undefined) role.isActive = isActive;

        await role.save();

        res.status(200).json({
            success: true,
            message: 'Role updated successfully',
            data: role
        });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update role'
        });
    }
};

// @desc    Delete role
// @route   DELETE /api/roles/:id
// @access  Private (requires system.roles_manage)
const deleteRole = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        // Check if role is assigned to any organization members
        const membersWithRole = await OrganizationMember.countDocuments({ 
            roles: role._id 
        });
        
        if (membersWithRole > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete role assigned to organization members'
            });
        }

        // Check if role is assigned to any supreme users
        const usersWithRole = await User.countDocuments({ roles: role._id });
        if (usersWithRole > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete role assigned to users'
            });
        }

        await role.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Role deleted successfully'
        });
    } catch (error) {
        console.error('Delete role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete role'
        });
    }
};

// @desc    Assign role to organization member
// @route   POST /api/roles/assign/member/:memberId
// @access  Private (requires system.users_manage)
const assignRoleToMember = async (req, res) => {
    try {
        const { roleIds } = req.body;
        const member = await OrganizationMember.findById(req.params.memberId);

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Organization member not found'
            });
        }

        // Verify roles exist
        const roles = await Role.find({ _id: { $in: roleIds } });
        if (roles.length !== roleIds.length) {
            return res.status(400).json({
                success: false,
                message: 'One or more roles are invalid'
            });
        }

        member.roles = roleIds;
        await member.save();

        res.status(200).json({
            success: true,
            message: 'Roles assigned successfully',
            data: {
                memberId: member._id,
                name: `${member.personalInfo.firstName} ${member.personalInfo.lastName}`,
                roles: roles.map(r => ({ id: r._id, name: r.name }))
            }
        });
    } catch (error) {
        console.error('Assign role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign roles'
        });
    }
};

// @desc    Assign role to supreme user
// @route   POST /api/roles/assign/user/:userId
// @access  Private (requires system.users_manage)
const assignRoleToUser = async (req, res) => {
    try {
        const { roleIds } = req.body;
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Supreme user not found'
            });
        }

        // Verify roles exist
        const roles = await Role.find({ _id: { $in: roleIds } });
        if (roles.length !== roleIds.length) {
            return res.status(400).json({
                success: false,
                message: 'One or more roles are invalid'
            });
        }

        user.roles = roleIds;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Roles assigned successfully',
            data: {
                userId: user._id,
                email: user.email,
                roles: roles.map(r => ({ id: r._id, name: r.name }))
            }
        });
    } catch (error) {
        console.error('Assign role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign roles'
        });
    }
};

// @desc    Get organization member permissions
// @route   GET /api/roles/member/:memberId/permissions
// @access  Private (requires system.users_view)
const getMemberPermissions = async (req, res) => {
    try {
        const member = await OrganizationMember.findById(req.params.memberId)
            .populate({
                path: 'roles',
                populate: {
                    path: 'permissions',
                    model: 'Permission'
                }
            });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Organization member not found'
            });
        }

        // Collect all unique permissions
        const permissions = new Set();
        const permissionDetails = [];

        for (const role of member.roles) {
            for (const permission of role.permissions) {
                const permString = `${permission.module}.${permission.resource}_${permission.action}`;
                if (!permissions.has(permString)) {
                    permissions.add(permString);
                    permissionDetails.push({
                        id: permission._id,
                        name: permission.name,
                        module: permission.module,
                        resource: permission.resource,
                        action: permission.action,
                        permissionString: permString
                    });
                }
            }
        }

        res.status(200).json({
            success: true,
            data: {
                memberId: member._id,
                name: `${member.personalInfo.firstName} ${member.personalInfo.lastName}`,
                email: member.personalInfo.email,
                organizationId: member.organization,
                roles: member.roles.map(r => ({ id: r._id, name: r.name })),
                permissions: permissionDetails,
                permissionStrings: Array.from(permissions)
            }
        });
    } catch (error) {
        console.error('Get member permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch member permissions'
        });
    }
};

// @desc    Get supreme user permissions
// @route   GET /api/roles/user/:userId/permissions
// @access  Private (requires system.users_view)
const getUserPermissions = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .populate({
                path: 'roles',
                populate: {
                    path: 'permissions',
                    model: 'Permission'
                }
            });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Supreme user not found'
            });
        }

        // Collect all unique permissions
        const permissions = new Set();
        const permissionDetails = [];

        for (const role of user.roles) {
            for (const permission of role.permissions) {
                const permString = `${permission.module}.${permission.resource}_${permission.action}`;
                if (!permissions.has(permString)) {
                    permissions.add(permString);
                    permissionDetails.push({
                        id: permission._id,
                        name: permission.name,
                        module: permission.module,
                        resource: permission.resource,
                        action: permission.action,
                        permissionString: permString
                    });
                }
            }
        }

        res.status(200).json({
            success: true,
            data: {
                userId: user._id,
                email: user.email,
                displayName: user.displayName,
                roles: user.roles.map(r => ({ id: r._id, name: r.name })),
                permissions: permissionDetails,
                permissionStrings: Array.from(permissions)
            }
        });
    } catch (error) {
        console.error('Get user permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user permissions'
        });
    }
};

module.exports = {
    getRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    assignRoleToMember,  // New: for organization members
    assignRoleToUser,    // Existing: for supreme users
    getMemberPermissions, // New: for organization members
    getUserPermissions    // Existing: for supreme users
};