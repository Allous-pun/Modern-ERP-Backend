// src/controllers/supreme.controller.js
const User = require('../models/user.model');
const Organization = require('../models/organization.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ============================================
// AUTH CONTROLLERS
// ============================================

/**
 * Register a new supreme user
 * @route POST /api/v1/supreme/register
 * @access Public (but should be protected in production)
 */
exports.register = async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            isEmailVerified: true // Auto-verify for now
        });

        // Generate token
        const token = jwt.sign(
            { 
                userId: user._id,  // Changed from 'id' to 'userId'
                email: user.email,
                isSupreme: true     // Added this flag
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Supreme user registered successfully',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    displayName: user.displayName
                },
                token
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering supreme user',
            error: error.message
        });
    }
};

/**
 * Login supreme user
 * @route POST /api/v1/supreme/login
 * @access Public
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user with password
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated. Contact support.'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        
        // Log the action
        user.actionLog.push({
            action: 'logged_in',
            timestamp: new Date()
        });
        
        await user.save();

        // Generate token
        const token = jwt.sign(
            { 
                userId: user._id,  // Changed from 'id' to 'userId'
                email: user.email,
                isSupreme: true     // Added this flag
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    displayName: user.displayName
                },
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
};

/**
 * Get current supreme user profile
 * @route GET /api/v1/supreme/profile
 * @access Private
 */
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId); // Changed from req.user.id to req.user.userId
        
        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                displayName: user.displayName,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message
        });
    }
};

// ============================================
// DASHBOARD CONTROLLERS
// ============================================

/**
 * Get dashboard summary
 * @route GET /api/v1/supreme/dashboard
 * @access Private
 */
exports.getDashboard = async (req, res) => {
    try {
        const Organization = require('../models/organization.model');
        
        const [
            totalOrganizations,
            activeOrganizations,
            inactiveOrganizations,
            trialOrganizations,
            expiredToday
        ] = await Promise.all([
            Organization.countDocuments(),
            Organization.countDocuments({ status: 'active' }),
            Organization.countDocuments({ status: 'inactive' }),
            Organization.countDocuments({ 'subscription.plan': 'trial' }),
            Organization.countDocuments({
                'subscription.endDate': { 
                    $gte: new Date().setHours(0, 0, 0, 0),
                    $lt: new Date().setHours(23, 59, 59, 999)
                }
            })
        ]);

        // Get recent actions
        const user = await User.findById(req.user.userId); // Changed from req.user.id to req.user.userId
        const recentActions = user.actionLog.slice(-10).reverse();

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalOrganizations,
                    activeOrganizations,
                    inactiveOrganizations,
                    trialOrganizations,
                    expiredToday,
                    subscriptionPrice: 'KSH 100' // You can make this dynamic
                },
                recentActions,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard',
            error: error.message
        });
    }
};

// ============================================
// ORGANIZATION MANAGEMENT
// ============================================

/**
 * Get all organizations with filters
 * @route GET /api/v1/supreme/organizations
 * @access Private
 */
exports.getOrganizations = async (req, res) => {
    try {
        const { status, plan, page = 1, limit = 20 } = req.query;
        const Organization = require('../models/organization.model');
        
        const query = {};
        if (status) query.status = status;
        if (plan) query['subscription.plan'] = plan;

        const skip = (page - 1) * limit;

        const [organizations, total] = await Promise.all([
            Organization.find(query)
                .select('name email status subscription.plan subscription.startDate subscription.endDate subscription.status createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Organization.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: {
                organizations,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get organizations error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching organizations',
            error: error.message
        });
    }
};

/**
 * Get single organization details
 * @route GET /api/v1/supreme/organizations/:id
 * @access Private
 */
exports.getOrganization = async (req, res) => {
    try {
        const Organization = require('../models/organization.model');
        
        const organization = await Organization.findById(req.params.id)
            .select('name email phone website address status subscription createdAt');

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        res.status(200).json({
            success: true,
            data: organization
        });
    } catch (error) {
        console.error('Get organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching organization',
            error: error.message
        });
    }
};

/**
 * Activate organization
 * @route PATCH /api/v1/supreme/organizations/:id/activate
 * @access Private
 */
exports.activateOrganization = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId); // Changed from req.user.id to req.user.userId
        const organization = await user.activateOrganization(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Organization activated successfully',
            data: {
                id: organization._id,
                name: organization.name,
                status: organization.status,
                subscription: organization.subscription
            }
        });
    } catch (error) {
        console.error('Activate organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Error activating organization',
            error: error.message
        });
    }
};

/**
 * Deactivate organization
 * @route PATCH /api/v1/supreme/organizations/:id/deactivate
 * @access Private
 */
exports.deactivateOrganization = async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findById(req.user.userId); // Changed from req.user.id to req.user.userId
        const organization = await user.deactivateOrganization(req.params.id, reason || 'Subscription expired');

        res.status(200).json({
            success: true,
            message: 'Organization deactivated successfully',
            data: {
                id: organization._id,
                name: organization.name,
                status: organization.status,
                subscription: organization.subscription
            }
        });
    } catch (error) {
        console.error('Deactivate organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deactivating organization',
            error: error.message
        });
    }
};

/**
 * Get organizations with expired subscriptions
 * @route GET /api/v1/supreme/organizations/expired
 * @access Private
 */
exports.getExpiredOrganizations = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId); // Changed from req.user.id to req.user.userId
        const expiredOrgs = await user.getExpiredOrganizations();

        res.status(200).json({
            success: true,
            data: expiredOrgs
        });
    } catch (error) {
        console.error('Get expired organizations error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching expired organizations',
            error: error.message
        });
    }
};

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Update subscription price
 * @route PATCH /api/v1/supreme/subscription/price
 * @access Private
 */
exports.updateSubscriptionPrice = async (req, res) => {
    try {
        const { price, currency = 'KSH' } = req.body;

        if (!price || price < 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid price is required'
            });
        }

        const user = await User.findById(req.user.userId); // Changed from req.user.id to req.user.userId
        await user.updateSubscriptionPrice(price, currency);

        res.status(200).json({
            success: true,
            message: 'Subscription price updated successfully',
            data: {
                newPrice: price,
                currency,
                updatedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Update price error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating subscription price',
            error: error.message
        });
    }
};

/**
 * Get subscription settings
 * @route GET /api/v1/supreme/subscription/settings
 * @access Private
 */
exports.getSubscriptionSettings = async (req, res) => {
    try {
        // You can store this in SystemConfig model
        res.status(200).json({
            success: true,
            data: {
                currentPrice: 'KSH 100',
                currency: 'KSH',
                billingCycle: 'monthly',
                lastUpdated: new Date()
            }
        });
    } catch (error) {
        console.error('Get subscription settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching subscription settings',
            error: error.message
        });
    }
};

// ============================================
// ACTION LOGS
// ============================================

/**
 * Get action logs
 * @route GET /api/v1/supreme/logs
 * @access Private
 */
exports.getActionLogs = async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const user = await User.findById(req.user.userId); // Changed from req.user.id to req.user.userId
        
        const logs = user.actionLog.slice(-parseInt(limit)).reverse();

        res.status(200).json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching action logs',
            error: error.message
        });
    }
};

// ============================================
// LOGOUT
// ============================================

/**
 * Logout supreme user
 * @route POST /api/v1/supreme/logout
 * @access Private
 */
exports.logout = async (req, res) => {
    try {
        // Log the logout action (optional)
        const user = await User.findById(req.user.userId); // Changed from req.user.id to req.user.userId
        if (user) {
            user.actionLog.push({
                action: 'logged_out',
                timestamp: new Date()
            });
            await user.save();
        }

        // Clear cookie if you're using cookies
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging out',
            error: error.message
        });
    }
};