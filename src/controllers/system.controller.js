// src/controllers/system.controller.js
const User = require('../models/user.model');
const Role = require('../models/role.model');
const Permission = require('../models/permission.model');
const Organization = require('../models/organization.model');
const OrganizationMember = require('../models/organizationMember.model');
const AuditLog = require('../models/auditLog.model');
const SystemConfig = require('../models/systemConfig.model');
const Backup = require('../models/backup.model');

// ========== USER MANAGEMENT ==========

// @desc    Get all users in organization
// @route   GET /api/system/users
// @access  Private (requires system.users_view)
const getUsers = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const members = await OrganizationMember.find({ 
            organization: organizationId,
            status: 'active'
        })
        .populate('user', 'firstName lastName email avatar isActive')
        .populate('roles', 'name description')
        .sort('-createdAt');

        const users = members.map(member => ({
            id: member.user._id,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            email: member.user.email,
            avatar: member.user.avatar,
            isActive: member.user.isActive,
            roles: member.roles,
            jobTitle: member.jobTitle,
            department: member.department,
            joinedAt: member.joinedAt
        }));

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
};

// @desc    Get single user
// @route   GET /api/system/users/:id
// @access  Private (requires system.users_view)
const getUser = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const member = await OrganizationMember.findOne({
            user: req.params.id,
            organization: organizationId,
            status: 'active'
        })
        .populate('user', 'firstName lastName email avatar isActive createdAt lastLogin')
        .populate('roles', 'name description hierarchy');

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'User not found in this organization'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: member.user._id,
                firstName: member.user.firstName,
                lastName: member.user.lastName,
                email: member.user.email,
                avatar: member.user.avatar,
                isActive: member.user.isActive,
                createdAt: member.user.createdAt,
                lastLogin: member.user.lastLogin,
                roles: member.roles,
                jobTitle: member.jobTitle,
                department: member.department,
                joinedAt: member.joinedAt
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user'
        });
    }
};

// @desc    Create user (invite)
// @route   POST /api/system/users
// @access  Private (requires system.users_manage)
const createUser = async (req, res) => {
    try {
        const { email, firstName, lastName, roleIds, jobTitle, department } = req.body;
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        // Check if user already exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create user if doesn't exist
            const tempPassword = Math.random().toString(36).slice(-8);
            user = await User.create({
                email,
                firstName,
                lastName,
                password: tempPassword,
                isActive: true
            });
            
            // TODO: Send welcome email with temp password
        }

        // Check if already a member
        const existingMember = await OrganizationMember.findOne({
            user: user._id,
            organization: organizationId
        });

        if (existingMember) {
            return res.status(400).json({
                success: false,
                message: 'User is already a member of this organization'
            });
        }

        // Verify roles exist
        let roles = [];
        if (roleIds && roleIds.length > 0) {
            roles = await Role.find({ _id: { $in: roleIds } });
            if (roles.length !== roleIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more roles are invalid'
                });
            }
        }

        // Add to organization
        const member = await OrganizationMember.create({
            user: user._id,
            organization: organizationId,
            roles: roleIds || [],
            jobTitle,
            department,
            status: 'active',
            invitedBy: req.user.userId,
            joinedAt: new Date()
        });

        // Add organization to user's list
        await User.findByIdAndUpdate(user._id, {
            $addToSet: { organizations: organizationId }
        });

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'user_created',
            target: user._id,
            details: { email, roles: roleIds }
        });

        res.status(201).json({
            success: true,
            message: 'User added to organization successfully',
            data: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                roles: roles.map(r => ({ id: r._id, name: r.name })),
                jobTitle,
                department
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user'
        });
    }
};

// @desc    Update user
// @route   PUT /api/system/users/:id
// @access  Private (requires system.users_manage)
const updateUser = async (req, res) => {
    try {
        const { firstName, lastName, roleIds, jobTitle, department, isActive } = req.body;
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const member = await OrganizationMember.findOne({
            user: req.params.id,
            organization: organizationId
        }).populate('user');

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'User not found in this organization'
            });
        }

        // Update user profile
        if (firstName || lastName) {
            const updateFields = {};
            if (firstName) updateFields.firstName = firstName;
            if (lastName) updateFields.lastName = lastName;
            await User.findByIdAndUpdate(member.user._id, updateFields);
        }

        // Update member roles and info
        if (roleIds) {
            const roles = await Role.find({ _id: { $in: roleIds } });
            if (roles.length !== roleIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more roles are invalid'
                });
            }
            member.roles = roleIds;
        }
        
        if (jobTitle) member.jobTitle = jobTitle;
        if (department) member.department = department;
        if (isActive !== undefined) {
            member.status = isActive ? 'active' : 'inactive';
            await User.findByIdAndUpdate(member.user._id, { isActive });
        }
        
        await member.save();

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'user_updated',
            target: member.user._id,
            details: req.body
        });

        res.status(200).json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
};

// @desc    Delete user (remove from organization)
// @route   DELETE /api/system/users/:id
// @access  Private (requires system.users_manage)
const deleteUser = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const member = await OrganizationMember.findOne({
            user: req.params.id,
            organization: organizationId
        }).populate('user');

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'User not found in this organization'
            });
        }

        // Don't allow removing the last admin
        if (member.roles.length > 0) {
            const adminRole = await Role.findOne({ name: 'Organization Admin' });
            if (adminRole && member.roles.includes(adminRole._id)) {
                const adminCount = await OrganizationMember.countDocuments({
                    organization: organizationId,
                    roles: adminRole._id,
                    status: 'active'
                });
                
                if (adminCount <= 1) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot remove the last organization admin'
                    });
                }
            }
        }

        // Remove from organization
        await member.deleteOne();

        // Remove organization from user's list if they have no other memberships
        const otherMemberships = await OrganizationMember.countDocuments({
            user: member.user._id,
            status: 'active'
        });

        if (otherMemberships === 0) {
            await User.findByIdAndUpdate(member.user._id, {
                $pull: { organizations: organizationId },
                $unset: { defaultOrganization: 1 }
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'user_removed',
            target: member.user._id,
            details: { email: member.user.email }
        });

        res.status(200).json({
            success: true,
            message: 'User removed from organization successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove user'
        });
    }
};

// ========== ROLE MANAGEMENT ==========

// @desc    Get all roles (with organization context)
// @route   GET /api/system/roles
// @access  Private (requires system.roles_view)
const getRoles = async (req, res) => {
    try {
        const roles = await Role.find({})
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
// @route   GET /api/system/roles/:id
// @access  Private (requires system.roles_view)
const getRole = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id).populate('permissions');

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

// @desc    Create role
// @route   POST /api/system/roles
// @access  Private (requires system.roles_manage)
const createRole = async (req, res) => {
    try {
        const { name, description, category, permissions, hierarchy } = req.body;
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

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
            hierarchy: hierarchy || 0,
            organization: organizationId
        });

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'role_created',
            target: role._id,
            details: { name }
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
// @route   PUT /api/system/roles/:id
// @access  Private (requires system.roles_manage)
const updateRole = async (req, res) => {
    try {
        const { name, description, category, permissions, hierarchy, isActive } = req.body;
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

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

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'role_updated',
            target: role._id,
            details: req.body
        });

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
// @route   DELETE /api/system/roles/:id
// @access  Private (requires system.roles_manage)
const deleteRole = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        // Check if role is assigned to any users
        const usersWithRole = await OrganizationMember.countDocuments({ roles: role._id });
        if (usersWithRole > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete role assigned to users'
            });
        }

        await role.deleteOne();

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'role_deleted',
            target: role._id,
            details: { name: role.name }
        });

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

// @desc    Assign role to user
// @route   POST /api/system/roles/assign/:userId
// @access  Private (requires system.users_manage)
const assignRoleToUser = async (req, res) => {
    try {
        const { roleIds } = req.body;
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const member = await OrganizationMember.findOne({
            user: req.params.userId,
            organization: organizationId
        });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'User not found in this organization'
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

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'roles_assigned',
            target: req.params.userId,
            details: { roles: roleIds }
        });

        res.status(200).json({
            success: true,
            message: 'Roles assigned successfully',
            data: {
                userId: req.params.userId,
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

// ========== PERMISSION MANAGEMENT ==========

// @desc    Get all permissions
// @route   GET /api/system/permissions
// @access  Private (requires system.permissions_view)
const getPermissions = async (req, res) => {
    try {
        const permissions = await Permission.find().sort({ module: 1, resource: 1, action: 1 });

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

// @desc    Get single permission
// @route   GET /api/system/permissions/:id
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

// ========== AUDIT LOGS ==========

// @desc    Get audit logs
// @route   GET /api/system/audit-logs
// @access  Private (requires system.audit_view)
const getAuditLogs = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { action, userId, startDate, endDate, limit = 100 } = req.query;

        const filter = { organization: organizationId };
        
        if (action) filter.action = action;
        if (userId) filter.user = userId;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const logs = await AuditLog.find(filter)
            .populate('user', 'firstName lastName email')
            .sort('-createdAt')
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs'
        });
    }
};

// ========== SYSTEM CONFIGURATION ==========

// @desc    Get system configuration
// @route   GET /api/system/config
// @access  Private (requires system.config_view)
const getSystemConfig = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        let config = await SystemConfig.findOne({ organization: organizationId });
        
        if (!config) {
            // Create default config if none exists
            config = await SystemConfig.create({
                organization: organizationId,
                settings: {}
            });
        }

        res.status(200).json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Get system config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system configuration'
        });
    }
};

// @desc    Update system configuration
// @route   PUT /api/system/config
// @access  Private (requires system.config_manage)
const updateSystemConfig = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { settings } = req.body;

        let config = await SystemConfig.findOne({ organization: organizationId });
        
        if (!config) {
            config = new SystemConfig({ organization: organizationId });
        }

        config.settings = { ...config.settings, ...settings };
        config.updatedBy = req.user.userId;
        await config.save();

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'config_updated',
            details: { settings: Object.keys(settings) }
        });

        res.status(200).json({
            success: true,
            message: 'System configuration updated successfully',
            data: config
        });
    } catch (error) {
        console.error('Update system config error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update system configuration'
        });
    }
};

// ========== BACKUP MANAGEMENT ==========

// @desc    Get all backups
// @route   GET /api/system/backups
// @access  Private (requires system.backups_manage)
const getBackups = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const backups = await Backup.find({ organization: organizationId })
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: backups.length,
            data: backups
        });
    } catch (error) {
        console.error('Get backups error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch backups'
        });
    }
};

// @desc    Create backup
// @route   POST /api/system/backups
// @access  Private (requires system.backups_manage)
const createBackup = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { type = 'full', description } = req.body;

        const backup = await Backup.create({
            organization: organizationId,
            type,
            description,
            createdBy: req.user.userId,
            status: 'in_progress'
        });

        // TODO: Trigger actual backup process asynchronously
        // This would call a background job to perform the backup

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'backup_created',
            target: backup._id,
            details: { type }
        });

        res.status(201).json({
            success: true,
            message: 'Backup started successfully',
            data: backup
        });
    } catch (error) {
        console.error('Create backup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create backup'
        });
    }
};

// @desc    Restore backup
// @route   POST /api/system/backups/:id/restore
// @access  Private (requires system.backups_manage)
const restoreBackup = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const backup = await Backup.findOne({
            _id: req.params.id,
            organization: organizationId
        });

        if (!backup) {
            return res.status(404).json({
                success: false,
                message: 'Backup not found'
            });
        }

        // TODO: Trigger restore process asynchronously

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'backup_restored',
            target: backup._id
        });

        res.status(200).json({
            success: true,
            message: 'Restore started successfully'
        });
    } catch (error) {
        console.error('Restore backup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to restore backup'
        });
    }
};

// @desc    Delete backup
// @route   DELETE /api/system/backups/:id
// @access  Private (requires system.backups_manage)
const deleteBackup = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const backup = await Backup.findOneAndDelete({
            _id: req.params.id,
            organization: organizationId
        });

        if (!backup) {
            return res.status(404).json({
                success: false,
                message: 'Backup not found'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'backup_deleted',
            target: backup._id
        });

        res.status(200).json({
            success: true,
            message: 'Backup deleted successfully'
        });
    } catch (error) {
        console.error('Delete backup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete backup'
        });
    }
};

module.exports = {
    // User Management
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    
    // Role Management
    getRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    assignRoleToUser,
    
    // Permission Management
    getPermissions,
    getPermission,
    
    // Audit Logs
    getAuditLogs,
    
    // System Configuration
    getSystemConfig,
    updateSystemConfig,
    
    // Backup Management
    getBackups,
    createBackup,
    restoreBackup,
    deleteBackup
};