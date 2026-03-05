// src/controllers/system/backup.controller.js
const Backup = require('../../models/system/backup.model');
const OrganizationMember = require('../../models/organizationMember.model');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

// Ensure backup directory exists
const BACKUP_DIR = path.join(__dirname, '../../../backups');
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * @desc    Get all backups
 * @route   GET /api/system/backups
 * @access  Private (requires system.backups_manage)
 */
const getBackups = async (req, res) => {
    try {
        const { 
            status, 
            type,
            page = 1, 
            limit = 20 
        } = req.query;

        const skip = (page - 1) * limit;
        const query = { organization: req.organization.id };

        if (status) query.status = status;
        if (type) query.type = type;

        const [backups, total] = await Promise.all([
            Backup.find(query)
                .populate('createdBy', 'personalInfo.firstName personalInfo.lastName')
                .populate('restoredBy', 'personalInfo.firstName personalInfo.lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Backup.countDocuments(query)
        ]);

        // Add formatted size
        const backupsWithFormat = backups.map(backup => ({
            ...backup,
            formattedSize: (bytes => {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            })(backup.fileSize)
        }));

        res.status(200).json({
            success: true,
            count: backupsWithFormat.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: backupsWithFormat
        });

    } catch (error) {
        console.error('Get backups error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch backups'
        });
    }
};

/**
 * @desc    Get single backup by ID
 * @route   GET /api/system/backups/:id
 * @access  Private (requires system.backups_manage)
 */
const getBackup = async (req, res) => {
    try {
        const { id } = req.params;

        const backup = await Backup.findOne({
            _id: id,
            organization: req.organization.id
        })
        .populate('createdBy', 'personalInfo.firstName personalInfo.lastName')
        .populate('restoredBy', 'personalInfo.firstName personalInfo.lastName')
        .lean();

        if (!backup) {
            return res.status(404).json({
                success: false,
                message: 'Backup not found'
            });
        }

        // Add formatted size
        const formattedSize = (bytes => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        })(backup.fileSize);

        res.status(200).json({
            success: true,
            data: {
                ...backup,
                formattedSize
            }
        });

    } catch (error) {
        console.error('Get backup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch backup'
        });
    }
};

/**
 * @desc    Create a new backup
 * @route   POST /api/system/backups
 * @access  Private (requires system.backups_manage)
 */
const createBackup = async (req, res) => {
    try {
        const { includes = ['all'], notes } = req.body;

        // Generate backup filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${req.organization.id}-${timestamp}.gz`;
        const filePath = path.join(BACKUP_DIR, filename);

        // Get MongoDB URI from env
        const uri = process.env.MONGODB_URI;
        
        // Create backup record
        const backup = await Backup.create({
            organization: req.organization.id,
            filename,
            fileSize: 0,
            filePath,
            type: 'manual',
            status: 'pending',
            includes,
            createdBy: req.user.memberId,
            notes
        });

        // Respond immediately that backup is started
        res.status(202).json({
            success: true,
            message: 'Backup started',
            data: {
                _id: backup._id,
                filename: backup.filename,
                status: backup.status,
                createdAt: backup.createdAt
            }
        });

        // Perform backup asynchronously
        performBackup(backup._id, uri, filePath).catch(console.error);

    } catch (error) {
        console.error('Create backup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start backup'
        });
    }
};

/**
 * @desc    Restore from a backup
 * @route   POST /api/system/backups/:id/restore
 * @access  Private (requires system.backups_manage)
 */
const restoreBackup = async (req, res) => {
    try {
        const { id } = req.params;

        const backup = await Backup.findOne({
            _id: id,
            organization: req.organization.id,
            status: 'completed'
        });

        if (!backup) {
            return res.status(404).json({
                success: false,
                message: 'Completed backup not found'
            });
        }

        // Check if file exists
        if (!fs.existsSync(backup.filePath)) {
            backup.status = 'failed';
            backup.errorMessage = 'Backup file not found on disk';
            await backup.save();
            
            return res.status(404).json({
                success: false,
                message: 'Backup file not found'
            });
        }

        // Update backup status
        backup.status = 'restoring';
        await backup.save();

        // Get MongoDB URI
        const uri = process.env.MONGODB_URI;

        // Respond immediately
        res.status(202).json({
            success: true,
            message: 'Restore started',
            data: {
                _id: backup._id,
                filename: backup.filename,
                status: backup.status
            }
        });

        // Perform restore asynchronously
        performRestore(backup._id, uri, backup.filePath, req.user.memberId).catch(console.error);

    } catch (error) {
        console.error('Restore backup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start restore'
        });
    }
};

/**
 * @desc    Download a backup file
 * @route   GET /api/system/backups/:id/download
 * @access  Private (requires system.backups_manage)
 */
const downloadBackup = async (req, res) => {
    try {
        const { id } = req.params;

        const backup = await Backup.findOne({
            _id: id,
            organization: req.organization.id,
            status: 'completed'
        });

        if (!backup) {
            return res.status(404).json({
                success: false,
                message: 'Backup not found'
            });
        }

        // Check if file exists
        if (!fs.existsSync(backup.filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Backup file not found on disk'
            });
        }

        res.download(backup.filePath, backup.filename);

    } catch (error) {
        console.error('Download backup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download backup'
        });
    }
};

/**
 * @desc    Delete a backup
 * @route   DELETE /api/system/backups/:id
 * @access  Private (requires system.backups_manage)
 */
const deleteBackup = async (req, res) => {
    try {
        const { id } = req.params;

        const backup = await Backup.findOne({
            _id: id,
            organization: req.organization.id
        });

        if (!backup) {
            return res.status(404).json({
                success: false,
                message: 'Backup not found'
            });
        }

        // Delete file if exists
        if (fs.existsSync(backup.filePath)) {
            fs.unlinkSync(backup.filePath);
        }

        await backup.deleteOne();

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

/**
 * @desc    Get backup statistics
 * @route   GET /api/system/backups/stats
 * @access  Private (requires system.backups_manage)
 */
const getBackupStats = async (req, res) => {
    try {
        const stats = await Backup.aggregate([
            { $match: { organization: req.organization.id } },
            {
                $group: {
                    _id: null,
                    totalBackups: { $sum: 1 },
                    totalSize: { $sum: '$fileSize' },
                    completedBackups: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    failedBackups: {
                        $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
                    },
                    lastBackup: { $max: '$createdAt' },
                    avgBackupSize: { $avg: '$fileSize' }
                }
            }
        ]);

        const result = stats[0] || {
            totalBackups: 0,
            totalSize: 0,
            completedBackups: 0,
            failedBackups: 0,
            avgBackupSize: 0
        };

        // Format sizes
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        res.status(200).json({
            success: true,
            data: {
                ...result,
                totalSizeFormatted: formatBytes(result.totalSize),
                avgBackupSizeFormatted: formatBytes(result.avgBackupSize)
            }
        });

    } catch (error) {
        console.error('Get backup stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch backup statistics'
        });
    }
};

// ============================================
// HELPER FUNCTIONS (Background tasks)
// ============================================

async function performBackup(backupId, uri, filePath) {
    try {
        const backup = await Backup.findById(backupId);
        if (!backup) return;

        backup.status = 'in_progress';
        await backup.save();

        // Run mongodump
        const { stdout, stderr } = await execPromise(
            `mongodump --uri="${uri}" --archive="${filePath}" --gzip`
        );

        // Get file size
        const stats = fs.statSync(filePath);
        
        backup.fileSize = stats.size;
        backup.status = 'completed';
        backup.completedAt = new Date();
        await backup.save();

        console.log(`✅ Backup ${backupId} completed successfully`);

    } catch (error) {
        console.error(`❌ Backup ${backupId} failed:`, error);
        
        const backup = await Backup.findById(backupId);
        if (backup) {
            await backup.markFailed(error);
            
            // Clean up failed backup file
            if (fs.existsSync(backup.filePath)) {
                fs.unlinkSync(backup.filePath);
            }
        }
    }
}

async function performRestore(backupId, uri, filePath, userId) {
    try {
        const backup = await Backup.findById(backupId);
        if (!backup) return;

        // Run mongorestore
        const { stdout, stderr } = await execPromise(
            `mongorestore --uri="${uri}" --archive="${filePath}" --gzip --drop`
        );

        backup.status = 'completed';
        backup.restoredAt = new Date();
        backup.restoredBy = userId;
        backup.restoreCount += 1;
        await backup.save();

        console.log(`✅ Restore from backup ${backupId} completed successfully`);

    } catch (error) {
        console.error(`❌ Restore from backup ${backupId} failed:`, error);
        
        const backup = await Backup.findById(backupId);
        if (backup) {
            backup.status = 'completed'; // Revert status
            backup.errorMessage = error.message;
            backup.errorStack = error.stack;
            await backup.save();
        }
    }
}

module.exports = {
    getBackups,
    getBackup,
    createBackup,
    restoreBackup,
    downloadBackup,
    deleteBackup,
    getBackupStats
};