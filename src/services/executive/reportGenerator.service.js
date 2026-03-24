// src/services/executive/scheduledReportRunner.service.js
const cron = require('node-cron');
const ExecutiveReport = require('../../models/executive/executiveReport.model');
const ScheduledReport = require('../../models/executive/scheduledReport.model');
const reportGenerator = require('./reportGenerator.service');

class ScheduledReportRunner {
    constructor() {
        this.isRunning = false;
        this.scheduleTasks = new Map();
    }
    
    /**
     * Initialize the scheduler
     */
    init() {
        // Run every minute to check for due reports
        cron.schedule('* * * * *', () => {
            this.checkAndRunScheduledReports();
        });
        
        // Schedule daily cleanup
        this.scheduleCleanup();
        
        console.log('Scheduled report runner initialized');
    }
    
    /**
     * Schedule daily cleanup of old reports
     */
    scheduleCleanup() {
        // Run cleanup daily at 2 AM
        cron.schedule('0 2 * * *', async () => {
            console.log('Running daily report cleanup...');
            try {
                // Clean up old report files
                const cleanupResult = await reportGenerator.cleanupOldReports(30);
                console.log(`File cleanup completed: ${cleanupResult.deletedCount} files deleted, ${(cleanupResult.totalSize / 1024 / 1024).toFixed(2)} MB freed`);
                
                // Also cleanup scheduled report history older than 90 days
                await this.cleanupScheduledReportHistory();
                
                // Get storage stats after cleanup
                const stats = await reportGenerator.getStorageStats();
                console.log(`Current report storage: ${stats.fileCount} files, ${stats.totalSizeMB.toFixed(2)} MB`);
            } catch (error) {
                console.error('Error during scheduled cleanup:', error);
            }
        });
        
        console.log('Report cleanup scheduled (daily at 2 AM)');
    }
    
    /**
     * Cleanup old scheduled report history
     * @param {number} daysOld - Keep history entries newer than this (default: 90)
     */
    async cleanupScheduledReportHistory(daysOld = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            // Update each scheduled report to remove old history entries
            const result = await ScheduledReport.updateMany(
                { 
                    'history.runDate': { $lt: cutoffDate }
                },
                {
                    $pull: {
                        history: { runDate: { $lt: cutoffDate } }
                    }
                }
            );
            
            // Also find and mark failed schedules with no runs in the last 6 months as archived
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            
            const inactiveSchedules = await ScheduledReport.updateMany(
                {
                    status: 'failed',
                    lastRun: { $lt: sixMonthsAgo },
                    isActive: true
                },
                {
                    isActive: false,
                    status: 'archived',
                    $set: { 
                        archivedAt: new Date(),
                        archivedReason: 'Inactive for 6 months' 
                    }
                }
            );
            
            console.log(`Cleaned up ${result.modifiedCount} scheduled report history entries older than ${daysOld} days`);
            if (inactiveSchedules.modifiedCount > 0) {
                console.log(`Archived ${inactiveSchedules.modifiedCount} inactive failed schedules`);
            }
            
            return { 
                historyCleaned: result.modifiedCount,
                schedulesArchived: inactiveSchedules.modifiedCount 
            };
        } catch (error) {
            console.error('Error cleaning scheduled report history:', error);
            return { error: error.message };
        }
    }
    
    /**
     * Check and run due scheduled reports
     */
    async checkAndRunScheduledReports() {
        if (this.isRunning) {
            console.log('Previous run still in progress, skipping...');
            return;
        }
        
        this.isRunning = true;
        
        try {
            const now = new Date();
            const dueReports = await ScheduledReport.find({
                isActive: true,
                status: 'active',
                'schedule.nextRun': { $lte: now }
            });
            
            console.log(`Found ${dueReports.length} scheduled reports due to run`);
            
            for (const schedule of dueReports) {
                await this.runScheduledReport(schedule);
            }
            
        } catch (error) {
            console.error('Error checking scheduled reports:', error);
        } finally {
            this.isRunning = false;
        }
    }
    
    /**
     * Run a single scheduled report
     */
    async runScheduledReport(schedule) {
        const startTime = Date.now();
        
        try {
            console.log(`Running scheduled report: ${schedule.name}`);
            
            // Get the full template document
            const ReportTemplate = require('../../models/executive/reportTemplate.model');
            const template = await ReportTemplate.findById(schedule.report.template);
            
            if (!template) {
                throw new Error(`Template ${schedule.report.template} not found`);
            }
            
            // Generate report based on template and config
            const reportData = await this.generateReportFromTemplate(template, schedule.report.config);
            
            // Create executive report
            const report = new ExecutiveReport({
                organization: schedule.organization,
                name: `${schedule.name} - ${new Date().toLocaleDateString()}`,
                description: schedule.description,
                reportType: template.templateType,
                targetRoles: template.targetRoles,
                period: {
                    startDate: this.calculateStartDate(schedule.schedule),
                    endDate: new Date(),
                    type: schedule.schedule.frequency
                },
                content: reportData.content,
                dataSources: reportData.dataSources,
                visualization: template.visualization || {},
                status: 'published',
                generatedAt: new Date(),
                generatedBy: schedule.createdBy,
                createdBy: schedule.createdBy
            });
            
            await report.save();
            
            // Generate export files for each format
            const exports = [];
            for (const format of schedule.distribution.formats) {
                try {
                    const fileData = await reportGenerator.generateReport(report, format);
                    exports.push({
                        format,
                        url: fileData.url,
                        generatedAt: new Date(),
                        size: fileData.size
                    });
                } catch (error) {
                    console.error(`Error generating ${format} for ${schedule.name}:`, error);
                    // Continue with other formats even if one fails
                }
            }
            
            if (exports.length === 0) {
                throw new Error('No export formats were successfully generated');
            }
            
            report.exports = exports;
            await report.save();
            
            // Record successful run
            await schedule.recordRun('success', report._id, null, Date.now() - startTime);
            
            console.log(`Scheduled report completed: ${schedule.name} (${exports.length} format(s) generated)`);
            
        } catch (error) {
            console.error(`Error running scheduled report ${schedule.name}:`, error);
            
            // Record failure
            await schedule.recordRun('failed', null, error.message, Date.now() - startTime);
            
            // Handle retries
            if (schedule.retry.attempts < schedule.retry.maxAttempts) {
                schedule.retry.attempts += 1;
                schedule.retry.lastAttempt = new Date();
                schedule.retry.nextAttempt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
                await schedule.save();
                console.log(`Scheduled report ${schedule.name} will retry in 5 minutes (attempt ${schedule.retry.attempts}/${schedule.retry.maxAttempts})`);
            } else {
                schedule.status = 'failed';
                await schedule.save();
                console.log(`Scheduled report ${schedule.name} marked as failed after ${schedule.retry.maxAttempts} attempts`);
            }
        }
    }

    /**
     * Generate report data from template
     */
    async generateReportFromTemplate(template, config) {
        // Handle case where template.structure might be undefined
        if (!template.structure || !template.structure.sections) {
            return {
                content: {
                    sections: [{
                        title: 'Report Content',
                        content: 'No content available',
                        order: 1,
                        metrics: []
                    }]
                },
                dataSources: []
            };
        }
        
        return {
            content: {
                sections: template.structure.sections.map(section => ({
                    title: section.title,
                    content: section.description || '',
                    order: section.order,
                    metrics: section.dataSource?.metrics?.map(metric => ({
                        name: metric,
                        value: Math.random() * 1000000,
                        change: Math.random() * 20 - 10,
                        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)]
                    })) || []
                }))
            },
            dataSources: []
        };
    }
    
    /**
     * Calculate start date based on frequency
     */
    calculateStartDate(schedule) {
        const now = new Date();
        switch (schedule.frequency) {
            case 'daily':
                return new Date(now.setDate(now.getDate() - 1));
            case 'weekly':
                return new Date(now.setDate(now.getDate() - 7));
            case 'monthly':
                return new Date(now.setMonth(now.getMonth() - 1));
            case 'quarterly':
                return new Date(now.setMonth(now.getMonth() - 3));
            default:
                return new Date(now.setDate(now.getDate() - 7));
        }
    }
    
    /**
     * Manual trigger for cleanup (can be called from admin API)
     */
    async manualCleanup(daysOld = 30, historyDaysOld = 90) {
        console.log('Running manual cleanup...');
        
        const fileCleanup = await reportGenerator.cleanupOldReports(daysOld);
        const historyCleanup = await this.cleanupScheduledReportHistory(historyDaysOld);
        const storageStats = await reportGenerator.getStorageStats();
        
        return {
            fileCleanup,
            historyCleanup,
            storageStats
        };
    }
    
    /**
     * Get runner status and statistics
     */
    async getStatus() {
        const activeSchedules = await ScheduledReport.countDocuments({ 
            isActive: true, 
            status: 'active' 
        });
        
        const failedSchedules = await ScheduledReport.countDocuments({ 
            status: 'failed' 
        });
        
        const stats = await reportGenerator.getStorageStats();
        
        return {
            isRunning: this.isRunning,
            activeSchedules,
            failedSchedules,
            storageStats: stats,
            lastRun: this.lastRun,
            timestamp: new Date()
        };
    }
}

module.exports = new ScheduledReportRunner();
