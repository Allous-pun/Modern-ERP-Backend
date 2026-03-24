// src/services/executive/auditHelper.service.js
const Audit = require('../../models/system/audit.model');

/**
 * Helper function to log executive actions to audit trail
 */
const logExecutiveAction = async ({
    req,
    action,
    targetType,
    targetId = null,
    targetName = null,
    changes = {},
    description,
    success = true,
    error = null,
    data = {}
}) => {
    try {
        // Get actor info (either User or OrganizationMember)
        const actor = req.user;
        const actorModel = req.user?.isSupreme ? 'User' : 'OrganizationMember';
        
        // Get actor ID safely - try multiple possible locations
        const actorId = req.user?.memberId || req.user?.id || req.user?._id || req.member?._id;
        
        if (!actorId) {
            console.error('Cannot create audit log: No actor ID found', {
                user: req.user,
                member: req.member,
                hasUser: !!req.user,
                hasMember: !!req.member
            });
            return;
        }

        console.log('Creating audit log with:', {
            actorId,
            actorModel,
            action,
            targetType,
            organization: req.organization?.id || req.user?.organizationId
        });

        // For now, all executive actions use 'other' target type
        // You can get more specific later by mapping specific actions
        const finalTargetType = 'other';

        const auditLog = new Audit({
            organization: req.organization?.id || req.user?.organizationId,
            actor: actorId,
            actorModel,
            actorEmail: req.user?.email,
            actorName: req.user?.displayName || 
                      `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 
                      req.user?.email || 
                      'Unknown User',
            
            // Action info
            action,
            targetType: finalTargetType,
            targetId,
            targetName,
            
            // Changes
            changes,
            
            // Metadata
            metadata: {
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
                requestId: req.id,
                responseTime: null
            },
            
            // Description
            description,
            
            // Context
            context: {
                module: 'executive',
                source: 'web'
            },
            
            // Data before/after if needed
            data: data.before || data.after ? data : {},
            
            // Success/Error
            success,
            error: error ? {
                message: error.message || error,
                stack: error.stack
            } : null,
            
            // Set expiry (90 days from now)
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        });

        await auditLog.save();
        console.log('Audit log saved successfully');
        return auditLog;
    } catch (auditError) {
        // Don't let audit logging break the main operation
        console.error('Failed to create audit log:', {
            error: auditError.message,
            stack: auditError.stack,
            name: auditError.name
        });
    }
};

module.exports = {
    logExecutiveAction
};