// src/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Role = require('../models/role.model');
const Organization = require('../models/organization.model');
const OrganizationMember = require('../models/organizationMember.model');
const { generateToken, generateRefreshToken } = require('../utils/token.utils');
const jwt = require('jsonwebtoken');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { 
            email, 
            password,
            firstName,
            lastName,
            displayName,
            phoneNumber,
            dateOfBirth,
            gender,
            bio,
            address,
            organizationId  // Optional: if registering as admin of an organization
        } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Check if this is the first user in the entire system
        const userCount = await User.countDocuments();
        const isFirstUser = userCount === 0;

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user object
        const userData = {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            displayName: displayName || `${firstName} ${lastName}`,
            phoneNumber,
            dateOfBirth,
            gender,
            bio,
            address
        };

        // If first user globally, assign Super Administrator role
        if (isFirstUser) {
            const superAdminRole = await Role.findOne({ name: 'Super Administrator' });
            if (superAdminRole) {
                userData.roles = [superAdminRole._id];
                console.log('👑 First user - assigning Super Administrator role');
            }
        }

        // Create user
        const user = await User.create(userData);

        // If organizationId is provided, add user as Organization Admin
        if (organizationId) {
            const organization = await Organization.findById(organizationId);
            if (organization) {
                // Try to find Organization Admin role, but don't fail if it doesn't exist
                let adminRole = await Role.findOne({ name: 'Organization Admin' });
                
                // If role doesn't exist, create it on the fly
                if (!adminRole) {
                    console.log('⚠️ Organization Admin role not found, creating it...');
                    adminRole = await Role.create({
                        name: 'Organization Admin',
                        description: 'Can manage organization settings and members',
                        category: 'system',
                        hierarchy: 800,
                        permissions: [],
                        isDefault: true
                    });
                }

                // Add as member (even if we had to create the role)
                await OrganizationMember.create({
                    user: user._id,
                    organization: organizationId,
                    roles: [adminRole._id],
                    jobTitle: 'Organization Admin',
                    status: 'active',
                    isDefault: true,
                    joinedAt: new Date()
                });

                // Update user's organizations
                user.organizations = [organizationId];
                user.defaultOrganization = organizationId;
                await user.save();

                console.log(`🏢 User added as admin to organization: ${organization.name}`);
            }
        }

        // Generate token
        const token = generateToken(user._id, user.email);
        const refreshToken = generateRefreshToken(user._id);

        // Fetch user with populated roles for response
        const populatedUser = await User.findById(user._id)
            .populate('roles', 'name description')
            .populate('organizations', 'name slug');

        res.status(201).json({
            success: true,
            message: isFirstUser ? 'Registration successful - Super Administrator account created' : 
                     organizationId ? 'Registration successful - Organization Admin account created' : 
                     'Registration successful',
            data: {
                user: {
                    id: populatedUser._id,
                    email: populatedUser.email,
                    firstName: populatedUser.firstName,
                    lastName: populatedUser.lastName,
                    displayName: populatedUser.displayName,
                    avatar: populatedUser.avatar,
                    phoneNumber: populatedUser.phoneNumber,
                    dateOfBirth: populatedUser.dateOfBirth,
                    gender: populatedUser.gender,
                    bio: populatedUser.bio,
                    address: populatedUser.address,
                    roles: populatedUser.roles,
                    organizations: populatedUser.organizations,
                    defaultOrganization: populatedUser.defaultOrganization,
                    isEmailVerified: populatedUser.isEmailVerified,
                    createdAt: populatedUser.createdAt
                },
                token,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Register user with invite token
// @route   POST /api/auth/register/invite
// @access  Public
const registerWithInvite = async (req, res) => {
    try {
        const { 
            email, 
            password,
            firstName,
            lastName,
            displayName,
            phoneNumber,
            dateOfBirth,
            gender,
            bio,
            address,
            inviteToken
        } = req.body;

        // Verify invite token
        const Invite = require('../models/invite.model');
        const invite = await Invite.findOne({ 
            token: inviteToken,
            email,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        }).populate('organization');

        if (!invite) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired invite token'
            });
        }

        // Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            // Check if already a member
            const existingMember = await OrganizationMember.findOne({
                user: user._id,
                organization: invite.organization._id
            });

            if (existingMember) {
                return res.status(400).json({
                    success: false,
                    message: 'User is already a member of this organization'
                });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (!user) {
            // Create new user
            user = await User.create({
                email,
                password: hashedPassword,
                firstName,
                lastName,
                displayName: displayName || `${firstName} ${lastName}`,
                phoneNumber,
                dateOfBirth,
                gender,
                bio,
                address
            });
        }

        // Get roles from invite or default to Employee
        let roles = [];
        if (invite.roles && invite.roles.length > 0) {
            roles = invite.roles;
        } else {
            const defaultRole = await Role.findOne({ name: 'Employee' });
            if (defaultRole) {
                roles = [defaultRole._id];
            }
        }

        // Add user as member
        await OrganizationMember.create({
            user: user._id,
            organization: invite.organization._id,
            roles,
            jobTitle: invite.jobTitle || null,
            department: invite.department || null,
            status: 'active',
            invitedBy: invite.invitedBy,
            joinedAt: new Date()
        });

        // Add organization to user's list
        await User.findByIdAndUpdate(user._id, {
            $addToSet: { organizations: invite.organization._id },
            ...(!user.defaultOrganization && { $set: { defaultOrganization: invite.organization._id } })
        });

        // Mark invite as accepted
        invite.status = 'accepted';
        invite.acceptedAt = new Date();
        await invite.save();

        // Generate token
        const token = generateToken(user._id, user.email);
        const refreshToken = generateRefreshToken(user._id);

        // Fetch user with populated data
        const populatedUser = await User.findById(user._id)
            .populate('roles', 'name description')
            .populate('organizations', 'name slug');

        res.status(201).json({
            success: true,
            message: 'Registration successful - You are now a member of the organization',
            data: {
                user: {
                    id: populatedUser._id,
                    email: populatedUser.email,
                    firstName: populatedUser.firstName,
                    lastName: populatedUser.lastName,
                    displayName: populatedUser.displayName,
                    avatar: populatedUser.avatar,
                    phoneNumber: populatedUser.phoneNumber,
                    dateOfBirth: populatedUser.dateOfBirth,
                    gender: populatedUser.gender,
                    bio: populatedUser.bio,
                    address: populatedUser.address,
                    roles: populatedUser.roles,
                    organizations: populatedUser.organizations,
                    defaultOrganization: populatedUser.defaultOrganization,
                    isEmailVerified: populatedUser.isEmailVerified,
                    createdAt: populatedUser.createdAt
                },
                token,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Invite registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user with password field
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if account is locked
        if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.status(423).json({
                success: false,
                message: 'Account temporarily locked. Try again later.'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            // Increment login attempts
            user.loginAttempts += 1;
            
            // Lock account after 5 failed attempts
            if (user.loginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
            }
            
            await user.save();
            
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Reset login attempts on successful login
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id, user.email);
        const refreshToken = generateRefreshToken(user._id);

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        // Get user with populated data
        const populatedUser = await User.findById(user._id)
            .populate('roles', 'name description category hierarchy')
            .populate('organizations', 'name slug');

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: populatedUser._id,
                    email: populatedUser.email,
                    firstName: populatedUser.firstName,
                    lastName: populatedUser.lastName,
                    displayName: populatedUser.displayName,
                    avatar: populatedUser.avatar,
                    phoneNumber: populatedUser.phoneNumber,
                    dateOfBirth: populatedUser.dateOfBirth,
                    gender: populatedUser.gender,
                    bio: populatedUser.bio,
                    address: populatedUser.address,
                    roles: populatedUser.roles,
                    organizations: populatedUser.organizations,
                    defaultOrganization: populatedUser.defaultOrganization,
                    isSuperAdmin: populatedUser.roles?.some(role => role.name === 'Super Administrator'),
                    isEmailVerified: populatedUser.isEmailVerified,
                    lastLogin: populatedUser.lastLogin
                },
                token,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .populate('roles', 'name description category hierarchy')
            .populate('organizations', 'name slug')
            .populate('defaultOrganization', 'name slug');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is Super Admin
        const isSuperAdmin = user.roles?.some(role => role.name === 'Super Administrator');

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    phoneNumber: user.phoneNumber,
                    dateOfBirth: user.dateOfBirth,
                    gender: user.gender,
                    bio: user.bio,
                    address: user.address,
                    roles: user.roles,
                    organizations: user.organizations,
                    defaultOrganization: user.defaultOrganization,
                    isSuperAdmin,
                    isEmailVerified: user.isEmailVerified,
                    isActive: user.isActive,
                    createdAt: user.createdAt,
                    lastLogin: user.lastLogin
                }
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const { 
            firstName,
            lastName,
            displayName,
            phoneNumber,
            dateOfBirth,
            gender,
            bio,
            address 
        } = req.body;
        
        // Build update object
        const updateFields = {};
        if (firstName) updateFields.firstName = firstName;
        if (lastName) updateFields.lastName = lastName;
        if (displayName) updateFields.displayName = displayName;
        if (phoneNumber) updateFields.phoneNumber = phoneNumber;
        if (dateOfBirth) updateFields.dateOfBirth = dateOfBirth;
        if (gender) updateFields.gender = gender;
        if (bio) updateFields.bio = bio;
        if (address) updateFields.address = address;

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            updateFields,
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    phoneNumber: user.phoneNumber,
                    dateOfBirth: user.dateOfBirth,
                    gender: user.gender,
                    bio: user.bio,
                    address: user.address,
                    isEmailVerified: user.isEmailVerified,
                    updatedAt: user.updatedAt
                }
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
};

// @desc    Upload user avatar
// @route   POST /api/auth/avatar
// @access  Private
const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Get the uploaded file URL from Cloudinary
        const avatarUrl = req.file.path;

        // Update user's avatar in database
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { avatar: avatarUrl },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Avatar uploaded successfully',
            data: {
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload avatar',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Delete user avatar
// @route   DELETE /api/auth/avatar
// @access  Private
const deleteAvatar = async (req, res) => {
    try {
        // Get current user to find avatar public_id
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // If user has an avatar, delete it from Cloudinary
        if (user.avatar) {
            // Extract public_id from URL
            const urlParts = user.avatar.split('/');
            const filename = urlParts[urlParts.length - 1];
            const publicId = `erp/avatars/${filename.split('.')[0]}`;
            
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryError) {
                console.error('Cloudinary delete error:', cloudinaryError);
                // Continue even if Cloudinary delete fails
            }
        }

        // Remove avatar from user document
        user.avatar = null;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Avatar deleted successfully'
        });
    } catch (error) {
        console.error('Avatar delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete avatar'
        });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
    res.cookie('token', 'none', {
        httpOnly: true,
        expires: new Date(Date.now() + 10 * 1000)
    });

    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Generate new access token
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        const newToken = generateToken(user._id, user.email);

        res.status(200).json({
            success: true,
            data: {
                token: newToken
            }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
};

module.exports = {
    register,
    registerWithInvite,
    login,
    getProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    logout,
    refreshToken
};