// src/middleware/settings.middleware.js
const OrganizationSettings = require('../models/organizationSettings.model');

/**
 * Middleware to attach organization settings to the request object
 * This makes settings available in all controllers via req.settings
 */
const attachSettings = async (req, res, next) => {
    try {
        // Only attach if organization context exists
        if (req.organization && req.organization.id) {
            const settings = await OrganizationSettings.findOne({
                organization: req.organization.id
            });
            
            // Attach settings to request object
            req.settings = settings || {};
            
            // Log for debugging (optional)
            if (process.env.NODE_ENV === 'development') {
                console.log(`Settings attached for org: ${req.organization.id}`);
            }
        } else {
            req.settings = {};
        }
        
        next();
    } catch (error) {
        console.error('Error attaching settings:', error);
        // Don't break the request, just attach empty settings
        req.settings = {};
        next();
    }
};

module.exports = attachSettings;