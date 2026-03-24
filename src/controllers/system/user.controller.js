// src/controllers/system/user.controller.js
const OrganizationMember = require('../../models/organizationMember.model');
const Role = require('../../models/role.model');
const bcrypt = require('bcryptjs');

/**
 * @desc    Get all organization members (employees)
 * @route   GET /api/system/users
 * @access  Private (requires system.users_view)
 */
const getUsers = async (req, res) => {
    try {
        const { 
            status, 
            department, 
            role, 
            search,
            page = 1, 
            limit = 20 
        } = req.query;

        const skip = (page - 1) * limit;
        const query = { organization: req.organization.id };

        // Apply filters
        if (status) query.status = status;
        if (department) query.department = department;
        if (role) query.roles = role;
        
        // Search by name or email
        if (search) {
            query.$or = [
                { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
                { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
                { 'personalInfo.email': { $regex: search, $options: 'i' } }
            ];
        }

        const [users, total] = await Promise.all([
            OrganizationMember.find(query)
                .populate('roles', 'name description hierarchy category')
                .populate('invitedBy', 'personalInfo.firstName personalInfo.lastName personalInfo.email')
                .populate('reportsTo', 'personalInfo.firstName personalInfo.lastName jobTitle')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            OrganizationMember.countDocuments(query)
        ]);

        // Transform data for response
        const transformedUsers = users.map(user => ({
            _id: user._id,
            personalInfo: user.personalInfo,
            avatar: user.avatar,
            jobTitle: user.jobTitle,
            department: user.department,
            employeeId: user.employeeId,
            roles: user.roles,
            reportsTo: user.reportsTo,
            status: user.status,
            employmentType: user.employmentType,
            isBranchManager: user.isBranchManager,
            branch: user.branch,
            joinedAt: user.joinedAt,
            invitedBy: user.invitedBy,
            lastActive: user.lastActive,
            createdAt: user.createdAt
        }));

        res.status(200).json({
            success: true,
            count: transformedUsers.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: transformedUsers
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
};

/**
 * @desc    Get single user by ID
 * @route   GET /api/system/users/:id
 * @access  Private (requires system.users_view)
 */
const getUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await OrganizationMember.findOne({
            _id: id,
            organization: req.organization.id
        })
        .populate('roles', 'name description hierarchy category')
        .populate('invitedBy', 'personalInfo.firstName personalInfo.lastName personalInfo.email')
        .populate('reportsTo', 'personalInfo.firstName personalInfo.lastName jobTitle')
        .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                personalInfo: user.personalInfo,
                avatar: user.avatar,
                jobTitle: user.jobTitle,
                department: user.department,
                employeeId: user.employeeId,
                roles: user.roles,
                reportsTo: user.reportsTo,
                status: user.status,
                employmentType: user.employmentType,
                isBranchManager: user.isBranchManager,
                branch: user.branch,
                joinedAt: user.joinedAt,
                invitedBy: user.invitedBy,
                lastActive: user.lastActive,
                createdAt: user.createdAt
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

/**
 * @desc    Create a new user (employee)
 * @route   POST /api/system/users
 * @access  Private (requires system.users_manage)
 */
const createUser = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            phoneNumber,
            jobTitle,
            department,
            employeeId,
            roleIds,
            reportsTo,
            employmentType = 'full_time',
            branch
        } = req.body;

        // Check if user already exists in this organization
        const existingUser = await OrganizationMember.findOne({
            organization: req.organization.id,
            'personalInfo.email': email
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists in your organization'
            });
        }

        // Verify roles exist and belong to organization's roles (if needed)
        if (roleIds && roleIds.length > 0) {
            const roles = await Role.find({ _id: { $in: roleIds } });
            if (roles.length !== roleIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more roles are invalid'
                });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await OrganizationMember.create({
            organization: req.organization.id,
            personalInfo: {
                firstName,
                lastName,
                displayName: `${firstName} ${lastName}`,
                email,
                phoneNumber,
                dateOfBirth: null,
                gender: 'prefer-not-to-say'
            },
            auth: {
                password: hashedPassword,
                isEmailVerified: false,
                loginAttempts: 0,
                passwordChangedAt: new Date()
            },
            roles: roleIds || [],
            jobTitle,
            department,
            employeeId,
            reportsTo,
            employmentType,
            branch,
            status: 'active',
            invitedBy: req.user.memberId,
            joinedAt: new Date()
        });

        // Populate for response
        await user.populate('roles', 'name description');
        await user.populate('reportsTo', 'personalInfo.firstName personalInfo.lastName jobTitle');

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                _id: user._id,
                personalInfo: user.personalInfo,
                jobTitle: user.jobTitle,
                department: user.department,
                employeeId: user.employeeId,
                roles: user.roles,
                reportsTo: user.reportsTo,
                status: user.status
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

/**
 * @desc    Update a user
 * @route   PUT /api/system/users/:id
 * @access  Private (requires system.users_manage)
 */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            firstName,
            lastName,
            phoneNumber,
            jobTitle,
            department,
            employeeId,
            roleIds,
            reportsTo,
            employmentType,
            branch,
            status
        } = req.body;

        const user = await OrganizationMember.findOne({
            _id: id,
            organization: req.organization.id
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify roles if provided
        if (roleIds) {
            const roles = await Role.find({ _id: { $in: roleIds } });
            if (roles.length !== roleIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more roles are invalid'
                });
            }
            user.roles = roleIds;
        }

        // Update personal info
        if (firstName) user.personalInfo.firstName = firstName;
        if (lastName) user.personalInfo.lastName = lastName;
        if (firstName || lastName) {
            user.personalInfo.displayName = `${user.personalInfo.firstName} ${user.personalInfo.lastName}`;
        }
        if (phoneNumber) user.personalInfo.phoneNumber = phoneNumber;

        // Update other fields
        if (jobTitle) user.jobTitle = jobTitle;
        if (department) user.department = department;
        if (employeeId) user.employeeId = employeeId;
        if (reportsTo) user.reportsTo = reportsTo;
        if (employmentType) user.employmentType = employmentType;
        if (branch) user.branch = branch;
        if (status) user.status = status;

        await user.save();

        // Populate for response
        await user.populate('roles', 'name description');
        await user.populate('reportsTo', 'personalInfo.firstName personalInfo.lastName jobTitle');

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: {
                _id: user._id,
                personalInfo: user.personalInfo,
                jobTitle: user.jobTitle,
                department: user.department,
                employeeId: user.employeeId,
                roles: user.roles,
                reportsTo: user.reportsTo,
                status: user.status
            }
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
};

/**
 * @desc    Delete/deactivate a user
 * @route   DELETE /api/system/users/:id
 * @access  Private (requires system.users_manage)
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await OrganizationMember.findOne({
            _id: id,
            organization: req.organization.id
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Don't allow deleting the last Super Administrator
        const superAdminRole = await Role.findOne({ name: 'Super Administrator' });
        if (user.roles.includes(superAdminRole._id)) {
            const superAdminCount = await OrganizationMember.countDocuments({
                organization: req.organization.id,
                roles: superAdminRole._id,
                status: 'active'
            });

            if (superAdminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete the last Super Administrator'
                });
            }
        }

        // Soft delete - set status to inactive
        user.status = 'inactive';
        await user.save();

        res.status(200).json({
            success: true,
            message: 'User deactivated successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
};

/**
 * @desc    Bulk update user status (activate/deactivate multiple users)
 * @route   PATCH /api/system/users/bulk/status
 * @access  Private (requires system.users_manage)
 */
const bulkUpdateUserStatus = async (req, res) => {
    try {
        const { userIds, status } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'User IDs array is required'
            });
        }

        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        // Don't allow deactivating the last Super Administrator
        if (status === 'inactive') {
            const superAdminRole = await Role.findOne({ name: 'Super Administrator' });
            
            for (const userId of userIds) {
                const user = await OrganizationMember.findById(userId);
                if (user && user.roles.includes(superAdminRole._id)) {
                    const superAdminCount = await OrganizationMember.countDocuments({
                        organization: req.organization.id,
                        roles: superAdminRole._id,
                        status: 'active'
                    });

                    if (superAdminCount <= 1) {
                        return res.status(400).json({
                            success: false,
                            message: 'Cannot deactivate the last Super Administrator'
                        });
                    }
                }
            }
        }

        const result = await OrganizationMember.updateMany(
            { 
                _id: { $in: userIds },
                organization: req.organization.id
            },
            { $set: { status } }
        );

        res.status(200).json({
            success: true,
            message: 'Users updated successfully',
            data: {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount
            }
        });

    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update users'
        });
    }
};

module.exports = {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    bulkUpdateUserStatus
};