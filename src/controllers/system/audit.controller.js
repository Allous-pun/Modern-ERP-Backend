// src/controllers/system/audit.controller.js
const Audit = require('../../models/system/audit.model');
const mongoose = require('mongoose');

/**
 * @desc    Get audit logs with filters
 * @route   GET /api/system/audit-logs
 * @access  Private (requires system.audit_view)
 */
const getAuditLogs = async (req, res) => {
    try {
        const {
            action,
            targetType,
            actorId,
            startDate,
            endDate,
            success,
            search,
            page = 1,
            limit = 50
        } = req.query;

        const skip = (page - 1) * limit;
        const query = { organization: req.organization.id };

        // Apply filters
        if (action) query.action = action;
        if (targetType) query.targetType = targetType;
        if (actorId) query.actor = actorId;
        if (success !== undefined) query.success = success === 'true';
        
        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        
        // Search in description or targetName
        if (search) {
            query.$or = [
                { description: { $regex: search, $options: 'i' } },
                { targetName: { $regex: search, $options: 'i' } },
                { actorEmail: { $regex: search, $options: 'i' } },
                { actorName: { $regex: search, $options: 'i' } }
            ];
        }

        // Get total count for pagination
        const total = await Audit.countDocuments(query);

        // Get paginated results
        const logs = await Audit.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Enhance logs with additional info
        const enhancedLogs = logs.map(log => ({
            ...log,
            timeAgo: getTimeAgo(log.createdAt),
            actor: log.actorName || log.actorEmail,
            changes: log.changes && Object.keys(log.changes).length > 0 ? log.changes : undefined
        }));

        res.status(200).json({
            success: true,
            count: enhancedLogs.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: enhancedLogs
        });

    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs'
        });
    }
};

/**
 * @desc    Get audit log by ID
 * @route   GET /api/system/audit-logs/:id
 * @access  Private (requires system.audit_view)
 */
const getAuditLogById = async (req, res) => {
    try {
        const { id } = req.params;

        const log = await Audit.findOne({
            _id: id,
            organization: req.organization.id
        }).lean();

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Audit log not found'
            });
        }

        // Enhance with time ago
        const enhancedLog = {
            ...log,
            timeAgo: getTimeAgo(log.createdAt)
        };

        res.status(200).json({
            success: true,
            data: enhancedLog
        });

    } catch (error) {
        console.error('Get audit log error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit log'
        });
    }
};

/**
 * @desc    Get audit log statistics
 * @route   GET /api/system/audit-logs/stats
 * @access  Private (requires system.audit_view)
 */
const getAuditStats = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        console.log('Stats query:', {
            organization: req.organization.id,
            startDate
        });

        // Get total counts
        const totalLogs = await Audit.countDocuments({
            organization: req.organization.id
        });

        const logsInRange = await Audit.countDocuments({
            organization: req.organization.id,
            createdAt: { $gte: startDate }
        });

        const successfulLogs = await Audit.countDocuments({
            organization: req.organization.id,
            success: true,
            createdAt: { $gte: startDate }
        });

        const failedLogs = await Audit.countDocuments({
            organization: req.organization.id,
            success: false,
            createdAt: { $gte: startDate }
        });

        // Get counts by action
        const byAction = await Audit.aggregate([
            {
                $match: {
                    organization: req.organization.id,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Get counts by target type
        const byTargetType = await Audit.aggregate([
            {
                $match: {
                    organization: req.organization.id,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$targetType',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get counts by actor
        const byActor = await Audit.aggregate([
            {
                $match: {
                    organization: req.organization.id,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        actor: '$actor',
                        actorName: '$actorName',
                        actorEmail: '$actorEmail'
                    },
                    count: { $sum: 1 },
                    lastAction: { $max: '$createdAt' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Get timeline data (by day)
        const timeline = await Audit.aggregate([
            {
                $match: {
                    organization: req.organization.id,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    date: { $first: '$createdAt' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totals: {
                    totalLogs,
                    logsInLast30Days: logsInRange,
                    successfulLogs,
                    failedLogs
                },
                byAction,
                byTargetType,
                byActor,
                timeline
            }
        });

    } catch (error) {
        console.error('Get audit stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit statistics'
        });
    }
};

/**
 * @desc    Export audit logs
 * @route   GET /api/system/audit-logs/export
 * @access  Private (requires system.audit_view)
 */
const exportAuditLogs = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            action,
            targetType,
            format = 'json'
        } = req.query;

        const query = { organization: req.organization.id };

        // Apply date filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        if (action) query.action = action;
        if (targetType) query.targetType = targetType;

        const logs = await Audit.find(query)
            .sort({ createdAt: -1 })
            .lean();

        // Prepare export data
        const exportData = logs.map(log => ({
            timestamp: log.createdAt,
            actor: log.actorName || log.actorEmail,
            action: log.action,
            targetType: log.targetType,
            targetName: log.targetName,
            description: log.description,
            ipAddress: log.metadata?.ipAddress,
            userAgent: log.metadata?.userAgent,
            success: log.success,
            responseTime: log.metadata?.responseTime,
            module: log.context?.module
        }));

        if (format === 'csv') {
            // Convert to CSV
            const headers = ['Timestamp', 'Actor', 'Action', 'Target Type', 'Target Name', 'Description', 'IP Address', 'Success', 'Module'];
            const csvRows = [
                headers.join(','),
                ...exportData.map(row => [
                    row.timestamp,
                    `"${row.actor}"`,
                    row.action,
                    row.targetType,
                    `"${row.targetName || ''}"`,
                    `"${row.description}"`,
                    row.ipAddress,
                    row.success,
                    row.module
                ].join(','))
            ];
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
            return res.status(200).send(csvRows.join('\n'));
        }

        // Default JSON export
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
        res.status(200).json(exportData);

    } catch (error) {
        console.error('Export audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export audit logs'
        });
    }
};

/**
 * @desc    Get audit log summary for a specific target
 * @route   GET /api/system/audit-logs/target/:targetType/:targetId
 * @access  Private (requires system.audit_view)
 */
const getAuditLogsByTarget = async (req, res) => {
    try {
        const { targetType, targetId } = req.params;
        const { limit = 20 } = req.query;

        const logs = await Audit.find({
            organization: req.organization.id,
            targetType,
            targetId
        })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

        const enhancedLogs = logs.map(log => ({
            ...log,
            timeAgo: getTimeAgo(log.createdAt)
        }));

        res.status(200).json({
            success: true,
            count: enhancedLogs.length,
            data: enhancedLogs
        });

    } catch (error) {
        console.error('Get audit logs by target error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs'
        });
    }
};

/**
 * @desc    Clean up old audit logs (based on retention policy)
 * @route   DELETE /api/system/audit-logs/cleanup
 * @access  Private (requires system.audit_manage)
 */
const cleanupAuditLogs = async (req, res) => {
    try {
        const { days = 90 } = req.query;
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const result = await Audit.deleteMany({
            organization: req.organization.id,
            createdAt: { $lt: cutoffDate }
        });

        res.status(200).json({
            success: true,
            message: `Cleaned up ${result.deletedCount} audit logs older than ${days} days`
        });

    } catch (error) {
        console.error('Cleanup audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup audit logs'
        });
    }
};

// Helper function to get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
    }
    return 'just now';
}

module.exports = {
    getAuditLogs,
    getAuditLogById,
    getAuditStats,
    exportAuditLogs,
    getAuditLogsByTarget,
    cleanupAuditLogs
};