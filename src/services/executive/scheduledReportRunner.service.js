// src/services/executive/scheduledReportRunner.service.js
const cron = require('node-cron');
const ExecutiveReport = require('../../models/executive/executiveReport.model');
const ScheduledReport = require('../../models/executive/scheduledReport.model');

class ScheduledReportRunner {
    constructor() {
        this.isRunning = false;
        this.enabled = false; // DISABLE AUTO-GENERATION
    }
    
    /**
     * Initialize the scheduler - DISABLED
     */
    init() {
        // DISABLED - No automatic report generation
        console.log('⚠️  Scheduled report runner is DISABLED');
        console.log('   Reports will only be generated manually via the "Generate" tab');
        console.log('   To enable, set this.enabled = true in the constructor');
    }
    
    /**
     * Process all scheduled reports for today - DISABLED
     */
    async processScheduledReports() {
        if (!this.enabled) {
            console.log('Scheduled report generation is disabled');
            return;
        }
        
        if (this.isRunning) {
            console.log('Previous run still in progress, skipping...');
            return;
        }
        
        this.isRunning = true;
        
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const pendingReports = await ScheduledReport.find({
                status: 'pending',
                scheduledDate: {
                    $gte: today,
                    $lt: tomorrow
                }
            }).populate('report.template');
            
            console.log(`📊 Found ${pendingReports.length} report(s) scheduled for today`);
            
            for (const schedule of pendingReports) {
                await this.generateScheduledReport(schedule);
            }
            
        } catch (error) {
            console.error('Error processing scheduled reports:', error);
        } finally {
            this.isRunning = false;
        }
    }
    
    /**
     * Generate a single scheduled report - DISABLED
     */
    async generateScheduledReport(schedule) {
        if (!this.enabled) {
            console.log('Scheduled report generation is disabled');
            return;
        }
        
        try {
            console.log(`📄 Generating scheduled report: ${schedule.name}`);
            
            const template = schedule.report.template;
            
            if (!template) {
                throw new Error(`Template not found`);
            }
            
            const reportData = await this.generateReportFromTemplate(template, schedule.report.config);
            
            const report = new ExecutiveReport({
                organization: schedule.organization,
                name: schedule.name,
                description: schedule.description || `Scheduled report generated on ${new Date().toLocaleDateString()}`,
                reportType: template.templateType,
                targetRoles: template.targetRoles,
                period: {
                    startDate: this.calculateStartDate(schedule.scheduledDate),
                    endDate: new Date(),
                    type: 'custom'
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
            
            schedule.status = 'generated';
            schedule.generatedReportId = report._id;
            schedule.generatedAt = new Date();
            await schedule.save();
            
            console.log(`✅ Scheduled report generated: ${schedule.name} (Report ID: ${report._id})`);
            
        } catch (error) {
            console.error(`❌ Error generating scheduled report ${schedule.name}:`, error.message);
            
            schedule.status = 'failed';
            schedule.error = error.message;
            await schedule.save();
        }
    }
    
    /**
     * Generate report data from template
     */
    async generateReportFromTemplate(template, config) {
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
     * Calculate start date based on scheduled date
     */
    calculateStartDate(scheduledDate) {
        const date = new Date(scheduledDate);
        return new Date(date.setMonth(date.getMonth() - 1));
    }
    
    /**
     * Manually process a specific scheduled report (for admin use)
     */
    async processNow(scheduleId) {
        if (!this.enabled) {
            console.log('Scheduled report generation is disabled. To enable, set this.enabled = true');
            return null;
        }
        
        const schedule = await ScheduledReport.findById(scheduleId).populate('report.template');
        if (!schedule) {
            throw new Error('Schedule not found');
        }
        await this.generateScheduledReport(schedule);
        return schedule;
    }
    
    /**
     * Delete all pending scheduled reports (clean up)
     */
    async deleteAllPendingSchedules() {
        const result = await ScheduledReport.deleteMany({ status: 'pending' });
        console.log(`Deleted ${result.deletedCount} pending scheduled reports`);
        return result;
    }
    
    /**
     * Get pending scheduled reports count
     */
    async getPendingCount() {
        return await ScheduledReport.countDocuments({ status: 'pending' });
    }
    
    /**
     * Get scheduled reports statistics
     */
    async getStats() {
        const pending = await ScheduledReport.countDocuments({ status: 'pending' });
        const generated = await ScheduledReport.countDocuments({ status: 'generated' });
        const failed = await ScheduledReport.countDocuments({ status: 'failed' });
        
        return { pending, generated, failed };
    }
}

module.exports = new ScheduledReportRunner();
