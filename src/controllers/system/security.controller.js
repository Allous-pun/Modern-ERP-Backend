// src/controllers/system/security.controller.js
const OrganizationSettings = require('../../models/organizationSettings.model');

/**
 * @desc    Get security policies
 * @route   GET /api/system/security
 * @access  Private (requires security.policies_view)
 */
const getSecurityPolicies = async (req, res) => {
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
            data: {
                passwordPolicy: settings.passwordPolicy,
                sessionTimeout: settings.sessionTimeout,
                maxLoginAttempts: settings.maxLoginAttempts,
                twoFactorAuth: settings.features?.twoFactorAuth || false,
                ssoEnabled: settings.features?.ssoEnabled || false
            }
        });

    } catch (error) {
        console.error('Get security policies error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch security policies'
        });
    }
};

/**
 * @desc    Update security policies
 * @route   PUT /api/system/security
 * @access  Private (requires security.policies_manage)
 */
const updateSecurityPolicies = async (req, res) => {
    try {
        const {
            passwordPolicy,
            sessionTimeout,
            maxLoginAttempts,
            twoFactorAuth,
            ssoEnabled
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

        // Update password policy if provided
        if (passwordPolicy) {
            settings.passwordPolicy = {
                ...settings.passwordPolicy,
                ...passwordPolicy
            };
        }

        // Update other fields
        if (sessionTimeout !== undefined) settings.sessionTimeout = sessionTimeout;
        if (maxLoginAttempts !== undefined) settings.maxLoginAttempts = maxLoginAttempts;
        
        // Update feature flags
        if (twoFactorAuth !== undefined) {
            if (!settings.features) settings.features = {};
            settings.features.twoFactorAuth = twoFactorAuth;
        }
        
        if (ssoEnabled !== undefined) {
            if (!settings.features) settings.features = {};
            settings.features.ssoEnabled = ssoEnabled;
        }

        settings.updatedBy = req.user.memberId;
        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Security policies updated successfully',
            data: {
                passwordPolicy: settings.passwordPolicy,
                sessionTimeout: settings.sessionTimeout,
                maxLoginAttempts: settings.maxLoginAttempts,
                twoFactorAuth: settings.features?.twoFactorAuth || false,
                ssoEnabled: settings.features?.ssoEnabled || false
            }
        });

    } catch (error) {
        console.error('Update security policies error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update security policies'
        });
    }
};

module.exports = {
    getSecurityPolicies,
    updateSecurityPolicies
};