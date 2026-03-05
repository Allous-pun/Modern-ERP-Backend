// src/middleware/audit.middleware.js
const Audit = require('../models/system/audit.model');
const crypto = require('crypto');

/**
 * Middleware to automatically log actions
 */
const auditLogger = (options = {}) => {
    return async (req, res, next) => {
        // Store original send function
        const originalSend = res.json;
        const startTime = Date.now();
        
        // Generate request ID for tracking
        const requestId = crypto.randomBytes(16).toString('hex');
        
        // Capture response
        res.json = function(body) {
            res.locals.responseBody = body;
            res.locals.statusCode = res.statusCode;
            originalSend.call(this, body);
        };
        
        // Continue to next middleware
        next();
        
        // Log after response is sent
        res.on('finish', async () => {
            try {
                // Don't log if no user (public routes)
                if (!req.user) return;
                
                const responseTime = Date.now() - startTime;
                
                // Determine actor type
                const actorModel = req.user.isSupreme ? 'User' : 'OrganizationMember';
                const actorId = req.user.isSupreme ? req.user.userId : req.user.memberId;
                
                // Get actor info
                let actorEmail = req.user.email;
                let actorName = req.user.displayName || `${req.user.firstName} ${req.user.lastName}`;
                
                // Build description
                const method = req.method;
                const url = req.originalUrl;
                const action = options.action || determineAction(method, url);
                
                // Determine target type from URL pattern
                const targetType = options.targetType || determineTargetType(url);
                
                // Extract target ID from params
                const targetId = req.params.id || req.params.userId || req.params.riskId || 
                                req.params.complianceId || req.params.backupId;
                
                // Get target name from request body or params
                let targetName = options.targetName || 
                                req.body?.name || 
                                req.body?.title || 
                                req.body?.email ||
                                targetId;
                
                // Don't log GET requests for lists (too noisy)
                if (method === 'GET' && !targetId) return;
                
                // Create audit log
                const auditLog = new Audit({
                    organization: req.organization?.id || req.user.organizationId,
                    actor: actorId,
                    actorModel,
                    actorEmail,
                    actorName,
                    action: options.action || determineAction(method, url),
                    targetType,
                    targetId,
                    targetName,
                    changes: options.changes || extractChanges(req),
                    metadata: {
                        ipAddress: req.ip || req.connection.remoteAddress,
                        userAgent: req.get('User-Agent'),
                        timestamp: new Date(),
                        requestId,
                        responseTime,
                        statusCode: res.statusCode
                    },
                    description: options.description || generateDescription(req, action, targetName),
                    context: {
                        module: options.module || determineModule(url),
                        source: req.headers['x-source'] || 'web',
                        sessionId: req.session?.id
                    },
                    data: {
                        before: options.before,
                        after: options.after
                    },
                    success: res.statusCode < 400,
                    error: res.statusCode >= 400 ? {
                        message: res.locals.responseBody?.message,
                        stack: res.locals.responseBody?.stack
                    } : undefined,
                    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
                });
                
                await auditLog.save();
                
            } catch (error) {
                console.error('Audit logging error:', error);
            }
        });
    };
};

/**
 * Helper function to determine action from HTTP method and URL
 */
function determineAction(method, url) {
    if (method === 'GET') return 'view';
    if (method === 'POST') {
        if (url.includes('/login')) return 'login';
        if (url.includes('/logout')) return 'logout';
        if (url.includes('/invite')) return 'invite_user';
        if (url.includes('/backup')) return 'create_backup';
        if (url.includes('/restore')) return 'restore_backup';
        if (url.includes('/activate')) return 'activate_organization';
        if (url.includes('/deactivate')) return 'deactivate_organization';
        if (url.includes('/consent')) return 'record_consent';
        if (url.includes('/dsr')) return 'create_dsr';
        if (url.includes('/breach')) return 'report_breach';
        if (url.includes('/risk')) return 'create_risk';
        if (url.includes('/assessment')) return 'create_assessment';
        if (url.includes('/compliance')) return 'create_compliance_framework';
        if (url.includes('/privacy/policies')) return 'create_privacy_policy';
        if (url.includes('/dpa')) return 'upload_dpa';
        return 'create';
    }
    if (method === 'PUT' || method === 'PATCH') {
        if (url.includes('/status')) return 'update_status';
        if (url.includes('/password')) return 'password_change';
        if (url.includes('/role')) return 'update_user_role';
        if (url.includes('/settings')) return 'update_settings';
        if (url.includes('/withdraw')) return 'withdraw_consent';
        return 'update';
    }
    if (method === 'DELETE') {
        if (url.includes('/backup')) return 'delete_backup';
        return 'delete';
    }
    return method.toLowerCase();
}

/**
 * Helper function to determine target type from URL
 */
function determineTargetType(url) {
    if (url.includes('/user')) return 'user';
    if (url.includes('/organization')) return 'organization';
    if (url.includes('/role')) return 'role';
    if (url.includes('/permission')) return 'permission';
    if (url.includes('/module')) return 'module';
    if (url.includes('/risk')) return 'risk';
    if (url.includes('/assessment')) return 'assessment';
    if (url.includes('/compliance')) return 'compliance';
    if (url.includes('/audit')) return 'audit';
    if (url.includes('/backup')) return 'backup';
    if (url.includes('/privacy')) {
        if (url.includes('/consent')) return 'consent';
        if (url.includes('/dsr')) return 'dsr';
        if (url.includes('/breach')) return 'breach';
        if (url.includes('/policy')) return 'policy';
        return 'privacy';
    }
    if (url.includes('/setting')) return 'setting';
    if (url.includes('/subscription')) return 'subscription';
    if (url.includes('/member')) return 'member';
    if (url.includes('/invite')) return 'invite';
    return 'other';
}

/**
 * Helper function to determine module from URL
 */
function determineModule(url) {
    if (url.includes('/api/system')) return 'system';
    if (url.includes('/api/security')) return 'security';
    if (url.includes('/api/executive')) return 'executive';
    if (url.includes('/api/finance')) return 'finance';
    if (url.includes('/api/hr')) return 'hr';
    if (url.includes('/api/sales')) return 'sales';
    if (url.includes('/api/organizations')) return 'organization';
    if (url.includes('/api/supreme')) return 'supreme';
    return 'other';
}

/**
 * Helper function to extract changes from request
 */
function extractChanges(req) {
    const changes = {};
    
    // For PUT/PATCH requests, log what's being updated
    if (req.method === 'PUT' || req.method === 'PATCH') {
        if (req.body) {
            changes.requestBody = req.body;
        }
    }
    
    return changes;
}

/**
 * Helper function to generate human-readable description
 */
function generateDescription(req, action, targetName) {
    const user = req.user?.displayName || req.user?.email || 'User';
    const target = targetName ? ` "${targetName}"` : '';
    
    const actionMap = {
        'login': `${user} logged in`,
        'logout': `${user} logged out`,
        'create': `${user} created${target}`,
        'update': `${user} updated${target}`,
        'delete': `${user} deleted${target}`,
        'view': `${user} viewed${target}`,
        'invite_user': `${user} invited new user${target}`,
        'activate_organization': `${user} activated organization${target}`,
        'deactivate_organization': `${user} deactivated organization${target}`,
        'create_backup': `${user} created a backup`,
        'restore_backup': `${user} restored from backup${target}`,
        'delete_backup': `${user} deleted backup${target}`,
        'record_consent': `${user} recorded consent for${target}`,
        'withdraw_consent': `${user} withdrew consent for${target}`,
        'create_dsr': `${user} created data subject request${target}`,
        'update_dsr': `${user} updated data subject request${target}`,
        'report_breach': `${user} reported data breach${target}`,
        'update_breach': `${user} updated data breach${target}`,
        'create_risk': `${user} created risk${target}`,
        'update_risk': `${user} updated risk${target}`,
        'archive_risk': `${user} archived risk${target}`,
        'create_assessment': `${user} created risk assessment${target}`,
        'create_compliance_framework': `${user} added compliance framework${target}`,
        'update_compliance': `${user} updated compliance${target}`,
        'create_audit': `${user} created audit record${target}`,
        'create_privacy_policy': `${user} created new privacy policy version ${target}`,
        'upload_dpa': `${user} uploaded data processing agreement${target}`,
        'update_security_policies': `${user} updated security policies`,
        'enable_2fa': `${user} enabled two-factor authentication`,
        'disable_2fa': `${user} disabled two-factor authentication`,
        'install_module': `${user} installed module${target}`,
        'uninstall_module': `${user} uninstalled module${target}`,
        'update_module_settings': `${user} updated module settings${target}`,
        'update_user_role': `${user} updated user roles${target}`,
        'activate_user': `${user} activated user${target}`,
        'deactivate_user': `${user} deactivated user${target}`,
        'update_subscription': `${user} updated subscription${target}`,
        'data_export': `${user} exported data${target}`,
        'data_import': `${user} imported data${target}`,
        'data_anonymize': `${user} anonymized data${target}`
    };
    
    return actionMap[action] || `${user} performed ${action} on${target}`;
}

module.exports = auditLogger;