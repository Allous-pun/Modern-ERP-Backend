// src/services/finance/asset.service.js
const mongoose = require('mongoose');
const { Asset, DepreciationSchedule } = require('../../models/finance/asset.model');
const JournalEntry = require('../../models/finance/journalEntry.model');
const Audit = require('../../models/system/audit.model');

class AssetService {
    /**
     * Create asset
     */
    static async createAsset(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const assetCode = await Asset.generateAssetCode(organizationId, data.category);
            
            const asset = new Asset({
                ...data,
                assetCode,
                organization: organizationId,
                currentValue: data.purchasePrice,
                createdBy: actor.id,
                updatedBy: actor.id
            });
            
            await asset.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'create',
                targetType: 'asset',
                targetId: asset._id,
                targetName: `${asset.assetCode} - ${asset.name}`,
                description: `Created asset: ${asset.assetCode} - ${asset.name}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return asset;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get assets
     */
    static async getAssets(filters, organizationId, page = 1, limit = 50) {
        const query = { organization: organizationId };
        
        if (filters.category) query.category = filters.category;
        if (filters.status) query.status = filters.status;
        if (filters.assignedTo) query.assignedTo = filters.assignedTo;
        if (filters.search) {
            query.$or = [
                { assetCode: { $regex: filters.search, $options: 'i' } },
                { name: { $regex: filters.search, $options: 'i' } }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const [assets, total] = await Promise.all([
            Asset.find(query)
                .populate('assignedTo', 'personalInfo.firstName personalInfo.lastName')
                .populate('costCenter', 'code name')
                .populate('assetAccountId', 'code name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Asset.countDocuments(query)
        ]);
        
        return { assets, total, page: parseInt(page), pages: Math.ceil(total / limit) };
    }
    
    /**
     * Get asset by ID
     */
    static async getAssetById(assetId, organizationId) {
        const asset = await Asset.findOne({
            _id: assetId,
            organization: organizationId
        })
            .populate('assignedTo', 'personalInfo.firstName personalInfo.lastName')
            .populate('costCenter', 'code name')
            .populate('assetAccountId', 'code name')
            .populate('depreciationAccountId', 'code name')
            .populate('accumulatedDepreciationAccountId', 'code name')
            .lean();
        
        if (!asset) {
            throw new Error('Asset not found');
        }
        
        return asset;
    }
    
    /**
     * Update asset
     */
    static async updateAsset(assetId, data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const asset = await Asset.findOne({
                _id: assetId,
                organization: organizationId
            }).session(session);
            
            if (!asset) {
                throw new Error('Asset not found');
            }
            
            const beforeState = asset.toObject();
            
            Object.assign(asset, data);
            asset.updatedBy = actor.id;
            await asset.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'update',
                targetType: 'asset',
                targetId: asset._id,
                targetName: `${asset.assetCode} - ${asset.name}`,
                description: `Updated asset: ${asset.assetCode} - ${asset.name}`,
                context: { module: 'finance' },
                success: true,
                data: { before: beforeState, after: asset.toObject() }
            }], { session });
            
            await session.commitTransaction();
            return asset;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Delete asset (soft delete - mark as disposed)
     */
    static async disposeAsset(assetId, disposalData, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const asset = await Asset.findOne({
                _id: assetId,
                organization: organizationId
            }).session(session);
            
            if (!asset) {
                throw new Error('Asset not found');
            }
            
            asset.status = 'disposed';
            asset.disposalDate = disposalData.disposalDate || new Date();
            asset.disposalAmount = disposalData.disposalAmount;
            asset.disposalReason = disposalData.disposalReason;
            asset.updatedBy = actor.id;
            await asset.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'dispose',
                targetType: 'asset',
                targetId: asset._id,
                targetName: `${asset.assetCode} - ${asset.name}`,
                description: `Disposed asset: ${asset.assetCode} - ${asset.name}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return asset;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Calculate and create depreciation schedule
     */
    static async calculateDepreciation(assetId, organizationId, startDate, endDate) {
        const asset = await Asset.findOne({
            _id: assetId,
            organization: organizationId
        });
        
        if (!asset) {
            throw new Error('Asset not found');
        }
        
        const schedules = [];
        let currentDate = new Date(startDate);
        let remainingValue = asset.currentValue;
        
        while (currentDate <= endDate && remainingValue > asset.residualValue) {
            const annualDepreciation = asset.calculateAnnualDepreciation();
            const monthlyDepreciation = annualDepreciation / 12;
            
            const depreciationAmount = Math.min(monthlyDepreciation, remainingValue - asset.residualValue);
            remainingValue -= depreciationAmount;
            
            schedules.push({
                assetId: asset._id,
                period: {
                    year: currentDate.getFullYear(),
                    month: currentDate.getMonth() + 1
                },
                startDate: new Date(currentDate),
                endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0),
                openingBalance: remainingValue + depreciationAmount,
                depreciationAmount,
                closingBalance: remainingValue,
                status: 'pending'
            });
            
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        return schedules;
    }
    
    /**
     * Post depreciation journal entry
     */
    static async postDepreciation(scheduleId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const schedule = await DepreciationSchedule.findOne({
                _id: scheduleId,
                organization: organizationId
            }).session(session);
            
            if (!schedule) {
                throw new Error('Depreciation schedule not found');
            }
            
            if (schedule.status === 'posted') {
                throw new Error('Depreciation already posted');
            }
            
            const asset = await Asset.findOne({
                _id: schedule.assetId,
                organization: organizationId
            }).session(session);
            
            if (!asset) {
                throw new Error('Asset not found');
            }
            
            // Create journal entry for depreciation
            const journalEntry = new JournalEntry({
                organization: organizationId,
                date: schedule.endDate,
                description: `Depreciation for ${asset.name} (${asset.assetCode}) - ${schedule.period.month}/${schedule.period.year}`,
                entries: [
                    {
                        account: asset.depreciationAccountId,
                        debit: schedule.depreciationAmount,
                        credit: 0,
                        description: `Depreciation expense`
                    },
                    {
                        account: asset.accumulatedDepreciationAccountId,
                        debit: 0,
                        credit: schedule.depreciationAmount,
                        description: `Accumulated depreciation`
                    }
                ],
                status: 'posted',
                createdBy: actor.id,
                updatedBy: actor.id
            });
            
            await journalEntry.save({ session });
            
            // Update schedule
            schedule.status = 'posted';
            schedule.journalEntryId = journalEntry._id;
            schedule.postedBy = actor.id;
            schedule.postedAt = new Date();
            await schedule.save({ session });
            
            // Update asset accumulated depreciation
            await asset.recordDepreciation(schedule.period, schedule.depreciationAmount, session);
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'post',
                targetType: 'depreciation',
                targetId: schedule._id,
                targetName: `${asset.assetCode} - ${asset.name}`,
                description: `Posted depreciation for ${asset.name} - ${schedule.period.month}/${schedule.period.year}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return { schedule, journalEntry };
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get depreciation schedules
     */
    static async getDepreciationSchedules(filters, organizationId, page = 1, limit = 50) {
        const query = { organization: organizationId };
        
        if (filters.assetId) query.assetId = filters.assetId;
        if (filters.status) query.status = filters.status;
        if (filters.year) query['period.year'] = parseInt(filters.year);
        if (filters.month) query['period.month'] = parseInt(filters.month);
        
        const skip = (page - 1) * limit;
        
        const [schedules, total] = await Promise.all([
            DepreciationSchedule.find(query)
                .populate('assetId', 'assetCode name category')
                .populate('postedBy', 'personalInfo.firstName personalInfo.lastName')
                .sort({ 'period.year': -1, 'period.month': -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            DepreciationSchedule.countDocuments(query)
        ]);
        
        return { schedules, total, page: parseInt(page), pages: Math.ceil(total / limit) };
    }
    
    /**
     * Get asset summary
     */
    static async getAssetSummary(organizationId) {
        const assets = await Asset.find({
            organization: organizationId,
            status: 'active'
        });
        
        const summary = {
            totalAssets: assets.length,
            totalValue: 0,
            totalDepreciation: 0,
            netBookValue: 0,
            byCategory: {}
        };
        
        for (const asset of assets) {
            summary.totalValue += asset.purchasePrice;
            summary.totalDepreciation += asset.accumulatedDepreciation;
            summary.netBookValue += asset.netBookValue;
            
            if (!summary.byCategory[asset.category]) {
                summary.byCategory[asset.category] = {
                    count: 0,
                    value: 0,
                    depreciation: 0,
                    netBookValue: 0
                };
            }
            
            summary.byCategory[asset.category].count++;
            summary.byCategory[asset.category].value += asset.purchasePrice;
            summary.byCategory[asset.category].depreciation += asset.accumulatedDepreciation;
            summary.byCategory[asset.category].netBookValue += asset.netBookValue;
        }
        
        return summary;
    }

    // ==================== NEW METHODS ====================

    /**
     * Generate depreciation schedule for an asset
     */
    static async generateDepreciationSchedule(assetId, organizationId, actor) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const asset = await Asset.findOne({
                _id: assetId,
                organization: organizationId
            }).session(session);
            
            if (!asset) {
                throw new Error('Asset not found');
            }
            
            // Check if schedule already exists for this asset
            const existingSchedules = await DepreciationSchedule.countDocuments({
                assetId: asset._id,
                organization: organizationId
            }).session(session);
            
            if (existingSchedules > 0) {
                throw new Error('Depreciation schedule already exists for this asset');
            }
            
            // Calculate depreciation from acquisition date to present
            const acquisitionDate = new Date(asset.acquisitionDate);
            const today = new Date();
            const schedules = [];
            
            // Start from the first month after acquisition
            let currentDate = new Date(acquisitionDate);
            currentDate.setMonth(currentDate.getMonth() + 1);
            currentDate.setDate(1);
            
            let remainingValue = asset.purchasePrice;
            let accumulatedDepreciation = 0;
            
            const annualDepreciation = asset.calculateAnnualDepreciation();
            const monthlyDepreciation = annualDepreciation / 12;
            
            while (currentDate <= today && remainingValue > asset.residualValue) {
                const depreciationAmount = Math.min(monthlyDepreciation, remainingValue - asset.residualValue);
                remainingValue -= depreciationAmount;
                accumulatedDepreciation += depreciationAmount;
                
                const periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
                const periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
                
                const schedule = new DepreciationSchedule({
                    organization: organizationId,
                    assetId: asset._id,
                    period: {
                        year: currentDate.getFullYear(),
                        month: currentDate.getMonth()
                    },
                    startDate: periodStart,
                    endDate: periodEnd,
                    openingBalance: remainingValue + depreciationAmount,
                    depreciationAmount,
                    closingBalance: remainingValue,
                    status: 'pending',
                    createdBy: actor.id
                });
                
                await schedule.save({ session });
                schedules.push(schedule);
                
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
            
            await session.commitTransaction();
            return schedules;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Generate and post depreciation for a period
     */
    static async generateAndPostDepreciation(assetId, year, month, actor, organizationId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const asset = await Asset.findOne({
            _id: assetId,
            organization: organizationId
        }).session(session);
        
        if (!asset) {
            throw new Error('Asset not found');
        }
        
        // Check if depreciation for this period already exists
        const existingSchedule = await DepreciationSchedule.findOne({
            assetId: asset._id,
            organization: organizationId,
            'period.year': year,
            'period.month': month
        }).session(session);
        
        if (existingSchedule && existingSchedule.status === 'posted') {
            throw new Error('Depreciation already posted for this period');
        }
        
        // Calculate depreciation for the period
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0);
        
        // Calculate months since acquisition
        const acquisitionDate = new Date(asset.acquisitionDate);
        let monthsSinceAcquisition = (year - acquisitionDate.getFullYear()) * 12 + (month - acquisitionDate.getMonth());
        
        if (monthsSinceAcquisition < 1) {
            throw new Error('Depreciation cannot be calculated before the asset is acquired');
        }
        
        const annualDepreciation = asset.calculateAnnualDepreciation();
        const monthlyDepreciation = annualDepreciation / 12;
        
        let depreciationAmount = monthlyDepreciation;
        let accumulatedDepreciation = monthlyDepreciation * monthsSinceAcquisition;
        
        // Cap at residual value
        if (asset.purchasePrice - accumulatedDepreciation <= asset.residualValue) {
            depreciationAmount = Math.max(0, asset.purchasePrice - asset.residualValue - (accumulatedDepreciation - monthlyDepreciation));
        }
        
        if (depreciationAmount <= 0) {
            throw new Error('Asset fully depreciated');
        }
        
        // Generate journal number
        const journalNumber = await JournalEntry.generateJournalNumber(organizationId);
        
        // Create journal entry
        const journalEntry = new JournalEntry({
            organization: organizationId,
            journalNumber,
            date: periodEnd,
            description: `Depreciation for ${asset.name} (${asset.assetCode}) - ${month}/${year}`,
            entries: [
                {
                    account: asset.depreciationAccountId,
                    debit: depreciationAmount,
                    credit: 0,
                    description: `Depreciation expense`
                },
                {
                    account: asset.accumulatedDepreciationAccountId,
                    debit: 0,
                    credit: depreciationAmount,
                    description: `Accumulated depreciation`
                }
            ],
            status: 'posted',
            createdBy: actor.id,
            updatedBy: actor.id
        });
        
        await journalEntry.save({ session });
        
        // Create or update schedule
        let schedule;
        if (existingSchedule) {
            schedule = existingSchedule;
            schedule.depreciationAmount = depreciationAmount;
            schedule.openingBalance = asset.currentValue;
            schedule.closingBalance = asset.currentValue - depreciationAmount;
            schedule.journalEntryId = journalEntry._id;
            schedule.status = 'posted';
            schedule.postedBy = actor.id;
            schedule.postedAt = new Date();
        } else {
            schedule = new DepreciationSchedule({
                organization: organizationId,
                assetId: asset._id,
                period: { year, month },
                startDate: periodStart,
                endDate: periodEnd,
                openingBalance: asset.currentValue,
                depreciationAmount,
                closingBalance: asset.currentValue - depreciationAmount,
                status: 'posted',
                journalEntryId: journalEntry._id,
                postedBy: actor.id,
                postedAt: new Date(),
                createdBy: actor.id
            });
        }
        
        await schedule.save({ session });
        
        // Update asset
        asset.accumulatedDepreciation += depreciationAmount;
        asset.currentValue = asset.purchasePrice - asset.accumulatedDepreciation;
        asset.updatedBy = actor.id;
        await asset.save({ session });
        
        await Audit.create([{
            organization: organizationId,
            actor: actor.id,
            actorModel: 'OrganizationMember',
            actorEmail: actor.email,
            actorName: actor.name,
            action: 'post',
            targetType: 'depreciation',
            targetId: schedule._id,
            targetName: `${asset.assetCode} - ${asset.name}`,
            description: `Posted depreciation for ${asset.name} - ${month}/${year}`,
            context: { module: 'finance' },
            success: true
        }], { session });
        
        await session.commitTransaction();
        return { schedule, journalEntry, asset };
        
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
}

module.exports = AssetService;
