// src/controllers/organization.controller.js
const Organization = require('../models/organization.model');
const OrganizationSettings = require('../models/organizationSettings.model');
const OrganizationSubscription = require('../models/organizationSubscription.model');
const OrganizationMember = require('../models/organizationMember.model');
const Role = require('../models/role.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ============================================
// PUBLIC ORGANIZATION CREATION (First step)
// ============================================

/**
 * @desc    Create new organization (Public - business owner registers)
 * @route   POST /api/organizations/register
 * @access  Public
 */
const registerOrganization = async (req, res) => {
    try {
        const {
            // Organization info
            name, legalName, registrationNumber, taxNumber,
            industry, organizationSize, email, phone, website, address,
            country = 'KE',
            
            // Admin user info (first user) - Gets SUPER ADMINISTRATOR role
            adminFirstName, adminLastName, adminEmail, adminPassword,
            adminPhone, adminJobTitle = 'Founder & CEO',
            
            // Preferences
            timezone = 'Africa/Nairobi',
            baseCurrency = 'KSH',
            language = 'en'
        } = req.body;

        // Validate required admin fields
        if (!adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
            return res.status(400).json({
                success: false,
                message: 'Admin user information is required (firstName, lastName, email, password)'
            });
        }

        // Generate slug from name
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        // Check if slug exists
        const existingOrg = await Organization.findOne({ slug });
        if (existingOrg) {
            return res.status(400).json({
                success: false,
                message: 'Organization with similar name already exists'
            });
        }

        // Check if admin email already used in any organization
        const existingAdmin = await OrganizationMember.findOne({
            'personalInfo.email': adminEmail
        });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered in another organization'
            });
        }

        // ============================================
        // GET THE SUPER ADMINISTRATOR ROLE
        // ============================================
        const superAdminRole = await Role.findOne({ name: 'Super Administrator' });
        if (!superAdminRole) {
            return res.status(500).json({
                success: false,
                message: 'System configuration error: Super Administrator role not found'
            });
        }

        // Hash admin password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // ============================================
        // 1. CREATE ORGANIZATION
        // ============================================
        const organization = await Organization.create({
            name,
            legalName,
            slug,
            registrationNumber,
            taxNumber,
            industry: industry || 'other',
            organizationSize: organizationSize || '1-10',
            email,
            phone,
            website,
            address: {
                ...address,
                country: address?.country || country
            },
            // Basic subscription info (will be overridden by detailed subscription)
            subscription: {
                plan: 'active',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
                maxUsers: 5,
                maxStorage: 1024
            },
            status: 'active',
            isActive: true,
            isVerified: false
        });

        // ============================================
        // 2. CREATE ORGANIZATION SETTINGS
        // ============================================
        await OrganizationSettings.create({
            organization: organization._id,
            timezone,
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',
            firstDayOfWeek: 1,
            fiscalYearStart: '01-01',
            fiscalYearEnd: '12-31',
            baseCurrency,
            multiCurrencyEnabled: false,
            acceptedCurrencies: [baseCurrency],
            taxSystem: 'simple',
            taxRates: [],
            defaultLanguage: language,
            languages: [{ code: language, name: 'English', isActive: true }],
            passwordPolicy: {
                minLength: 8,
                requireUppercase: true,
                requireNumbers: true,
                requireSpecialChars: false,
                expiryDays: 90
            },
            sessionTimeout: 30,
            maxLoginAttempts: 5,
            emailNotifications: true,
            notificationChannels: ['email', 'in-app'],
            features: {
                twoFactorAuth: false,
                ssoEnabled: false,
                apiAccess: false,
                webhooks: false
            },
            theme: {
                primaryColor: '#3498db',
                secondaryColor: '#2c3e50'
            }
        });

        // ============================================
        // 3. CREATE TRIAL SUBSCRIPTION
        // ============================================
        await OrganizationSubscription.create({
            organization: organization._id,
            planName: 'trial',
            planCode: 'trial',
            billingCycle: 'monthly',
            billingCurrency: baseCurrency,
            price: 0,
            maxUsers: 5,
            maxStorage: 1024, // 1GB in MB
            maxModules: 10,
            allowedModules: [],
            restrictedModules: [],
            features: {
                apiAccess: false,
                customReports: false,
                advancedAnalytics: false,
                prioritySupport: false,
                whiteLabel: false
            },
            startDate: new Date(),
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            renewalDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            status: 'trial',
            autoRenew: true,
            paymentMethod: 'none'
        });

        // ============================================
        // 4. CREATE ADMIN MEMBER (First user) WITH SUPER ADMINISTRATOR ROLE
        // ============================================
        const adminMember = await OrganizationMember.create({
            organization: organization._id,
            personalInfo: {
                firstName: adminFirstName,
                lastName: adminLastName,
                displayName: `${adminFirstName} ${adminLastName}`,
                email: adminEmail,
                phoneNumber: adminPhone,
                dateOfBirth: null,
                gender: 'prefer-not-to-say'
            },
            auth: {
                password: hashedPassword,
                isEmailVerified: false,
                loginAttempts: 0,
                passwordChangedAt: new Date()
            },
            roles: [superAdminRole._id], // ASSIGN SUPER ADMINISTRATOR ROLE
            jobTitle: adminJobTitle,
            isBranchManager: false,
            status: 'active',
            isDefault: true,
            joinedAt: new Date()
        });

        // ============================================
        // 5. GENERATE AUTH TOKEN FOR ADMIN
        // ============================================
        const token = jwt.sign(
            { 
                memberId: adminMember._id,
                organizationId: organization._id,
                email: adminEmail,
                role: 'Super Administrator'
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Populate role for response
        await adminMember.populate('roles', 'name description hierarchy');

        res.status(201).json({
            success: true,
            message: 'Organization registered successfully. You are now the Super Administrator.',
            data: {
                organization: {
                    _id: organization._id,
                    name: organization.name,
                    slug: organization.slug,
                    email: organization.email,
                    status: organization.status
                },
                admin: {
                    _id: adminMember._id,
                    name: `${adminFirstName} ${adminLastName}`,
                    email: adminEmail,
                    jobTitle: adminJobTitle,
                    roles: adminMember.roles.map(r => ({
                        id: r._id,
                        name: r.name,
                        hierarchy: r.hierarchy
                    }))
                },
                token,
                expiresIn: '7d'
            }
        });

    } catch (error) {
        console.error('Register organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register organization',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============================================
// ORGANIZATION MANAGEMENT
// ============================================

/**
 * @desc    Get organization details
 * @route   GET /api/organizations
 * @access  Private (Organization Members)
 */
const getOrganization = async (req, res) => {
    try {
        const organization = await Organization.findById(req.organization.id);

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Get settings
        const settings = await OrganizationSettings.findOne({
            organization: organization._id
        });

        // Get subscription
        const subscription = await OrganizationSubscription.findOne({
            organization: organization._id
        });

        // Get member count
        const memberCount = await OrganizationMember.countDocuments({
            organization: organization._id,
            status: 'active'
        });

        res.status(200).json({
            success: true,
            data: {
                organization: {
                    _id: organization._id,
                    name: organization.name,
                    legalName: organization.legalName,
                    slug: organization.slug,
                    email: organization.email,
                    phone: organization.phone,
                    website: organization.website,
                    address: organization.address,
                    industry: organization.industry,
                    organizationSize: organization.organizationSize,
                    registrationNumber: organization.registrationNumber,
                    taxNumber: organization.taxNumber,
                    status: organization.status,
                    isVerified: organization.isVerified,
                    logo: organization.logo,
                    favicon: organization.favicon,
                    createdAt: organization.createdAt
                },
                settings,
                subscription,
                stats: {
                    memberCount,
                    maxUsers: subscription?.maxUsers || 5,
                    storageUsed: 0, // To be implemented
                    maxStorage: subscription?.maxStorage || 1024
                }
            }
        });
    } catch (error) {
        console.error('Get organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch organization'
        });
    }
};

/**
 * @desc    Update organization basic info
 * @route   PUT /api/organizations
 * @access  Private (Organization Admin only)
 */
const updateOrganization = async (req, res) => {
    try {
        const {
            name, legalName, registrationNumber, taxNumber,
            industry, organizationSize, email, phone, website, address,
            logo, favicon
        } = req.body;

        const organization = await Organization.findById(req.organization.id);

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: 'Organization not found'
            });
        }

        // Update fields
        if (name) {
            // Update slug if name changes
            const newSlug = name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            
            // Check if new slug conflicts with another organization
            if (newSlug !== organization.slug) {
                const existingOrg = await Organization.findOne({ slug: newSlug });
                if (existingOrg && existingOrg._id.toString() !== organization._id.toString()) {
                    return res.status(400).json({
                        success: false,
                        message: 'Organization with similar name already exists'
                    });
                }
                organization.slug = newSlug;
            }
            organization.name = name;
        }
        
        if (legalName) organization.legalName = legalName;
        if (registrationNumber) organization.registrationNumber = registrationNumber;
        if (taxNumber) organization.taxNumber = taxNumber;
        if (industry) organization.industry = industry;
        if (organizationSize) organization.organizationSize = organizationSize;
        if (email) organization.email = email;
        if (phone) organization.phone = phone;
        if (website) organization.website = website;
        if (address) organization.address = { ...organization.address, ...address };
        if (logo) organization.logo = logo;
        if (favicon) organization.favicon = favicon;

        await organization.save();

        res.status(200).json({
            success: true,
            message: 'Organization updated successfully',
            data: {
                _id: organization._id,
                name: organization.name,
                slug: organization.slug,
                email: organization.email,
                phone: organization.phone,
                website: organization.website,
                address: organization.address,
                logo: organization.logo,
                favicon: organization.favicon
            }
        });
    } catch (error) {
        console.error('Update organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update organization'
        });
    }
};

// ============================================
// SETTINGS MANAGEMENT
// ============================================

/**
 * @desc    Update organization settings
 * @route   PUT /api/organizations/settings
 * @access  Private (Organization Admin only)
 */
const updateSettings = async (req, res) => {
    try {
        const {
            timezone, dateFormat, timeFormat, firstDayOfWeek,
            fiscalYearStart, fiscalYearEnd, baseCurrency, multiCurrencyEnabled,
            acceptedCurrencies, taxSystem, taxRates, defaultLanguage,
            passwordPolicy, sessionTimeout, maxLoginAttempts,
            emailNotifications, notificationChannels, features, theme
        } = req.body;

        const settings = await OrganizationSettings.findOne({
            organization: req.organization.id
        });

        if (!settings) {
            return res.status(404).json({
                success: false,
                message: 'Organization settings not found'
            });
        }

        // Update provided fields
        if (timezone) settings.timezone = timezone;
        if (dateFormat) settings.dateFormat = dateFormat;
        if (timeFormat) settings.timeFormat = timeFormat;
        if (firstDayOfWeek !== undefined) settings.firstDayOfWeek = firstDayOfWeek;
        if (fiscalYearStart) settings.fiscalYearStart = fiscalYearStart;
        if (fiscalYearEnd) settings.fiscalYearEnd = fiscalYearEnd;
        if (baseCurrency) settings.baseCurrency = baseCurrency;
        if (multiCurrencyEnabled !== undefined) settings.multiCurrencyEnabled = multiCurrencyEnabled;
        if (acceptedCurrencies) settings.acceptedCurrencies = acceptedCurrencies;
        if (taxSystem) settings.taxSystem = taxSystem;
        if (taxRates) settings.taxRates = taxRates;
        if (defaultLanguage) settings.defaultLanguage = defaultLanguage;
        if (passwordPolicy) settings.passwordPolicy = { ...settings.passwordPolicy, ...passwordPolicy };
        if (sessionTimeout) settings.sessionTimeout = sessionTimeout;
        if (maxLoginAttempts) settings.maxLoginAttempts = maxLoginAttempts;
        if (emailNotifications !== undefined) settings.emailNotifications = emailNotifications;
        if (notificationChannels) settings.notificationChannels = notificationChannels;
        if (features) settings.features = { ...settings.features, ...features };
        if (theme) settings.theme = { ...settings.theme, ...theme };

        settings.updatedBy = req.member.id;
        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: settings
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings'
        });
    }
};

/**
 * @desc    Get organization settings
 * @route   GET /api/organizations/settings
 * @access  Private (Organization Members)
 */
const getSettings = async (req, res) => {
    try {
        const settings = await OrganizationSettings.findOne({
            organization: req.organization.id
        });

        if (!settings) {
            return res.status(404).json({
                success: false,
                message: 'Organization settings not found'
            });
        }

        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings'
        });
    }
};

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * @desc    Get organization subscription
 * @route   GET /api/organizations/subscription
 * @access  Private (Organization Members)
 */
const getSubscription = async (req, res) => {
    try {
        const subscription = await OrganizationSubscription.findOne({
            organization: req.organization.id
        });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }

        // Get current member count
        const memberCount = await OrganizationMember.countDocuments({
            organization: req.organization.id,
            status: 'active'
        });

        res.status(200).json({
            success: true,
            data: {
                ...subscription.toObject(),
                currentUsage: {
                    members: memberCount,
                    membersPercent: (memberCount / subscription.maxUsers) * 100
                }
            }
        });
    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription'
        });
    }
};

// ============================================
// DASHBOARD STATS
// ============================================

/**
 * @desc    Get organization dashboard stats
 * @route   GET /api/organizations/dashboard
 * @access  Private (Organization Members)
 */
const getDashboardStats = async (req, res) => {
    try {
        const [memberCount, subscription, settings] = await Promise.all([
            OrganizationMember.countDocuments({
                organization: req.organization.id,
                status: 'active'
            }),
            OrganizationSubscription.findOne({
                organization: req.organization.id
            }),
            OrganizationSettings.findOne({
                organization: req.organization.id
            })
        ]);

        res.status(200).json({
            success: true,
            data: {
                organization: {
                    id: req.organization.id,
                    name: req.organization.name,
                    status: req.organization.status
                },
                stats: {
                    totalMembers: memberCount,
                    maxUsers: subscription?.maxUsers || 5,
                    membersPercent: subscription ? (memberCount / subscription.maxUsers) * 100 : 0,
                    subscriptionStatus: subscription?.status || 'trial',
                    planName: subscription?.planName || 'trial',
                    trialEndsAt: subscription?.trialEndsAt,
                    daysLeft: subscription?.trialEndsAt ? 
                        Math.ceil((subscription.trialEndsAt - new Date()) / (1000 * 60 * 60 * 24)) : 0
                },
                settings: {
                    timezone: settings?.timezone,
                    currency: settings?.baseCurrency,
                    language: settings?.defaultLanguage
                }
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard stats'
        });
    }
};

// ============================================
// MEMBER PROFILE
// ============================================

/**
 * @desc    Get current member profile
 * @route   GET /api/organizations/members/profile
 * @access  Private (Organization Members)
 */
const getMyProfile = async (req, res) => {
    try {
        const member = await OrganizationMember.findById(req.user.memberId)
            .populate('roles', 'name description hierarchy category')
            .populate('invitedBy', 'personalInfo.firstName personalInfo.lastName personalInfo.email')
            .populate('reportsTo', 'personalInfo.firstName personalInfo.lastName jobTitle');

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                _id: member._id,
                personalInfo: member.personalInfo,
                avatar: member.avatar,
                jobTitle: member.jobTitle,
                department: member.department,
                employeeId: member.employeeId,
                roles: member.roles,
                reportsTo: member.reportsTo,
                status: member.status,
                joinedAt: member.joinedAt,
                invitedBy: member.invitedBy,
                lastActive: member.lastActive,
                createdAt: member.createdAt,
                organizationId: member.organization
            }
        });
    } catch (error) {
        console.error('Get my profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
};

// @desc    Update current member's own profile
// @route   PUT /api/organizations/members/profile
// @access  Private (Organization Members)
const updateMyProfile = async (req, res) => {
    try {
        const { jobTitle, department, phoneNumber, dateOfBirth, gender } = req.body;

        const member = await OrganizationMember.findOne({
            _id: req.user.memberId,
            organization: req.organization.id
        });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Update allowed fields (members can update their own limited info)
        if (jobTitle) member.jobTitle = jobTitle;
        if (department) member.department = department;
        
        // Update personal info
        if (phoneNumber) member.personalInfo.phoneNumber = phoneNumber;
        if (dateOfBirth) member.personalInfo.dateOfBirth = dateOfBirth;
        if (gender) member.personalInfo.gender = gender;

        await member.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                _id: member._id,
                personalInfo: member.personalInfo,
                jobTitle: member.jobTitle,
                department: member.department
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

// ============================================
// MEMBER MANAGEMENT (With Role Assignment)
// ============================================

/**
 * @desc    Invite a new member to organization (with role assignment)
 * @route   POST /api/organizations/members/invite
 * @access  Private (Organization Admin only)
 */
const inviteMember = async (req, res) => {
    try {
        const { email, firstName, lastName, roleIds, jobTitle, department } = req.body;

        if (!email || !firstName || !lastName || !roleIds || roleIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Email, firstName, lastName, and at least one role are required'
            });
        }

        // Check if email already exists in this organization
        const existingMember = await OrganizationMember.findOne({
            organization: req.organization.id,
            'personalInfo.email': email
        });

        if (existingMember) {
            return res.status(400).json({
                success: false,
                message: 'User with this email is already a member of this organization'
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

        // Check if inviter has permission to assign these roles
        const inviter = await OrganizationMember.findById(req.user.memberId).populate('roles');
        if (!inviter) {
            return res.status(404).json({
                success: false,
                message: 'Inviter not found'
            });
        }
        
        const isSuperAdmin = inviter.roles.some(r => r.name === 'Super Administrator');
        
        if (!isSuperAdmin) {
            const hasSuperAdminRole = roles.some(r => r.name === 'Super Administrator');
            if (hasSuperAdminRole) {
                return res.status(403).json({
                    success: false,
                    message: 'Only Super Administrators can assign the Super Administrator role'
                });
            }
        }

        // Check subscription limits
        const subscription = await OrganizationSubscription.findOne({
            organization: req.organization.id
        });

        if (!subscription) {
            return res.status(400).json({
                success: false,
                message: 'Organization subscription not found'
            });
        }

        const memberCount = await OrganizationMember.countDocuments({
            organization: req.organization.id,
            status: 'active'
        });

        if (memberCount >= subscription.maxUsers) {
            return res.status(400).json({
                success: false,
                message: `Maximum user limit (${subscription.maxUsers}) reached for your subscription`
            });
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8) + 
                            Math.random().toString(36).slice(-8).toUpperCase();
        
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        // Create member
        const member = await OrganizationMember.create({
            organization: req.organization.id,
            personalInfo: {
                firstName,
                lastName,
                displayName: `${firstName} ${lastName}`,
                email,
                phoneNumber: null,
                dateOfBirth: null,
                gender: 'prefer-not-to-say'
            },
            auth: {
                password: hashedPassword,
                isEmailVerified: false,
                loginAttempts: 0,
                passwordChangedAt: new Date()
            },
            roles: roleIds,
            jobTitle: jobTitle || null,
            department: department || null,
            status: 'active', // Set to active directly since we're creating the member
            invitedBy: req.user.memberId,
            joinedAt: new Date()
        });

        await member.populate('roles', 'name description');

        res.status(201).json({
            success: true,
            message: 'Member invited successfully',
            data: {
                _id: member._id,
                name: `${firstName} ${lastName}`,
                email,
                jobTitle: member.jobTitle,
                department: member.department,
                roles: member.roles.map(r => ({
                    id: r._id,
                    name: r.name,
                    description: r.description
                })),
                status: member.status,
                tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined
            }
        });

    } catch (error) {
        console.error('Invite member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to invite member',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Get all organization members with their roles
 * @route   GET /api/organizations/members
 * @access  Private (Organization Members)
 */
const getMembers = async (req, res) => {
    try {
        const members = await OrganizationMember.find({
            organization: req.organization.id,
            status: { $in: ['active', 'pending'] }
        })
        .populate('roles', 'name description hierarchy category')
        .populate('invitedBy', 'personalInfo.firstName personalInfo.lastName personalInfo.email')
        .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: members.length,
            data: members.map(m => ({
                _id: m._id,
                name: m.fullName,
                firstName: m.personalInfo.firstName,
                lastName: m.personalInfo.lastName,
                email: m.personalInfo.email,
                avatar: m.avatar,
                jobTitle: m.jobTitle,
                department: m.department,
                roles: m.roles.map(r => ({
                    id: r._id,
                    name: r.name,
                    description: r.description,
                    category: r.category,
                    hierarchy: r.hierarchy
                })),
                status: m.status,
                joinedAt: m.joinedAt,
                invitedBy: m.invitedBy ? {
                    name: `${m.invitedBy.personalInfo?.firstName} ${m.invitedBy.personalInfo?.lastName}`,
                    email: m.invitedBy.personalInfo?.email
                } : null,
                isActive: m.status === 'active'
            }))
        });
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch members'
        });
    }
};

/**
 * @desc    Get single member details
 * @route   GET /api/organizations/members/:memberId
 * @access  Private (Organization Members)
 */
const getMember = async (req, res) => {
    try {
        const member = await OrganizationMember.findOne({
            _id: req.params.memberId,
            organization: req.organization.id
        })
        .populate('roles', 'name description hierarchy category')
        .populate('invitedBy', 'personalInfo.firstName personalInfo.lastName personalInfo.email')
        .populate('reportsTo', 'personalInfo.firstName personalInfo.lastName jobTitle');

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                _id: member._id,
                personalInfo: member.personalInfo,
                avatar: member.avatar,
                jobTitle: member.jobTitle,
                department: member.department,
                employeeId: member.employeeId,
                roles: member.roles,
                reportsTo: member.reportsTo,
                status: member.status,
                joinedAt: member.joinedAt,
                invitedBy: member.invitedBy,
                lastActive: member.lastActive,
                createdAt: member.createdAt
            }
        });
    } catch (error) {
        console.error('Get member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch member'
        });
    }
};

/**
 * @desc    Update member roles
 * @route   PUT /api/organizations/members/:memberId/roles
 * @access  Private (Organization Admin only)
 */
const updateMemberRoles = async (req, res) => {
    try {
        const { roleIds } = req.body;
        const { memberId } = req.params;

        if (!roleIds || !Array.isArray(roleIds)) {
            return res.status(400).json({
                success: false,
                message: 'roleIds array is required'
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

        // Check if current user has permission to modify roles
        const currentUser = await OrganizationMember.findById(req.member.id).populate('roles');
        const isSuperAdmin = currentUser.roles.some(r => r.name === 'Super Administrator');

        // Get the member to update
        const member = await OrganizationMember.findOne({
            _id: memberId,
            organization: req.organization.id
        });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Get Super Admin role ID
        const superAdminRole = await Role.findOne({ name: 'Super Administrator' });
        
        // Check if trying to remove Super Admin from the last Super Admin
        if (member.roles.includes(superAdminRole._id) && !roleIds.includes(superAdminRole._id.toString())) {
            const superAdminCount = await OrganizationMember.countDocuments({
                organization: req.organization.id,
                roles: superAdminRole._id,
                status: 'active'
            });

            if (superAdminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot remove the last Super Administrator'
                });
            }
        }

        // Check if trying to assign Super Admin without permission
        if (!isSuperAdmin && roleIds.includes(superAdminRole._id.toString())) {
            return res.status(403).json({
                success: false,
                message: 'Only Super Administrators can assign the Super Administrator role'
            });
        }

        member.roles = roleIds;
        await member.save();
        await member.populate('roles', 'name description');

        res.status(200).json({
            success: true,
            message: 'Member roles updated successfully',
            data: {
                _id: member._id,
                name: member.fullName,
                roles: member.roles.map(r => ({
                    id: r._id,
                    name: r.name,
                    description: r.description
                }))
            }
        });

    } catch (error) {
        console.error('Update member roles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update member roles'
        });
    }
};

/**
 * @desc    Update member details
 * @route   PUT /api/organizations/members/:memberId
 * @access  Private (Organization Admin or Self)
 */
const updateMember = async (req, res) => {
    try {
        const { memberId } = req.params;
        const { jobTitle, department, employeeId, reportsTo, personalInfo } = req.body;

        // Check if user is updating themselves or is an admin
        const isSelf = req.member.id === memberId;
        const currentUser = await OrganizationMember.findById(req.member.id).populate('roles');
        const isAdmin = currentUser.roles.some(r => 
            r.name === 'Super Administrator' || r.name === 'Organization Admin'
        );

        if (!isSelf && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this member'
            });
        }

        const member = await OrganizationMember.findOne({
            _id: memberId,
            organization: req.organization.id
        });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Update fields (admins can update more than self)
        if (jobTitle) member.jobTitle = jobTitle;
        if (department) member.department = department;
        if (employeeId) member.employeeId = employeeId;
        
        // Only admins can update reportsTo
        if (reportsTo && isAdmin) {
            const reportsToMember = await OrganizationMember.findOne({
                _id: reportsTo,
                organization: req.organization.id
            });
            if (!reportsToMember) {
                return res.status(400).json({
                    success: false,
                    message: 'ReportsTo member not found in this organization'
                });
            }
            member.reportsTo = reportsTo;
        }

        // Self can update limited personal info
        if (personalInfo && isSelf) {
            if (personalInfo.phoneNumber) member.personalInfo.phoneNumber = personalInfo.phoneNumber;
            if (personalInfo.dateOfBirth) member.personalInfo.dateOfBirth = personalInfo.dateOfBirth;
            if (personalInfo.gender) member.personalInfo.gender = personalInfo.gender;
        }

        await member.save();

        res.status(200).json({
            success: true,
            message: 'Member updated successfully',
            data: {
                _id: member._id,
                name: member.fullName,
                jobTitle: member.jobTitle,
                department: member.department,
                employeeId: member.employeeId,
                reportsTo: member.reportsTo
            }
        });

    } catch (error) {
        console.error('Update member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update member'
        });
    }
};

/**
 * @desc    Remove member from organization (soft delete)
 * @route   DELETE /api/organizations/members/:memberId
 * @access  Private (Organization Admin only)
 */
const removeMember = async (req, res) => {
    try {
        const { memberId } = req.params;

        const member = await OrganizationMember.findOne({
            _id: memberId,
            organization: req.organization.id
        });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Don't allow removing the last Super Administrator
        const superAdminRole = await Role.findOne({ name: 'Super Administrator' });
        if (member.roles.includes(superAdminRole._id)) {
            const superAdminCount = await OrganizationMember.countDocuments({
                organization: req.organization.id,
                roles: superAdminRole._id,
                status: 'active'
            });

            if (superAdminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot remove the last Super Administrator'
                });
            }
        }

        // Soft delete - set status to inactive
        member.status = 'inactive';
        await member.save();

        res.status(200).json({
            success: true,
            message: 'Member removed successfully'
        });

    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove member'
        });
    }
};

/**
 * @desc    Reactivate a removed member
 * @route   PUT /api/organizations/members/:memberId/reactivate
 * @access  Private (Organization Admin only)
 */
const reactivateMember = async (req, res) => {
    try {
        const { memberId } = req.params;

        const member = await OrganizationMember.findOne({
            _id: memberId,
            organization: req.organization.id
        });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Check subscription limits before reactivating
        const subscription = await OrganizationSubscription.findOne({
            organization: req.organization.id
        });

        if (subscription) {
            const activeCount = await OrganizationMember.countDocuments({
                organization: req.organization.id,
                status: 'active'
            });

            if (activeCount >= subscription.maxUsers) {
                return res.status(400).json({
                    success: false,
                    message: `Maximum user limit (${subscription.maxUsers}) reached. Cannot reactivate member.`
                });
            }
        }

        member.status = 'active';
        await member.save();

        res.status(200).json({
            success: true,
            message: 'Member reactivated successfully'
        });

    } catch (error) {
        console.error('Reactivate member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reactivate member'
        });
    }
};

module.exports = {
    // Public
    registerOrganization,
    
    // Organization CRUD
    getOrganization,
    updateOrganization,
    
    // Settings
    getSettings,
    updateSettings,
    
    // Subscription
    getSubscription,
    
    // Dashboard
    getDashboardStats,
    
    // Member Profile
    getMyProfile,
    updateMyProfile,
    
    // Member Management
    inviteMember,
    getMembers,
    getMember,
    updateMemberRoles,
    updateMember,
    removeMember,
    reactivateMember
};