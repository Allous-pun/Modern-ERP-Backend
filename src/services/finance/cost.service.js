// src/services/finance/cost.service.js
const mongoose = require('mongoose');
const { CostCenter, CostAllocation, CostSummary } = require('../../models/finance/costCenter.model');
const JournalEntry = require('../../models/finance/journalEntry.model');
const Invoice = require('../../models/finance/invoice.model');
const Audit = require('../../models/system/audit.model');

class CostService {
    /**
     * Create cost center
     */
    static async createCostCenter(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const costCenter = new CostCenter({
                ...data,
                organization: organizationId,
                createdBy: actor.id,
                updatedBy: actor.id
            });
            
            await costCenter.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'create',
                targetType: 'cost_center',
                targetId: costCenter._id,
                targetName: `${costCenter.code} - ${costCenter.name}`,
                description: `Created cost center: ${costCenter.code} - ${costCenter.name}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return costCenter;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get cost centers
     */
    static async getCostCenters(filters, organizationId, page = 1, limit = 50) {
        const query = { organization: organizationId };
        
        if (filters.type) query.type = filters.type;
        if (filters.isActive !== undefined) query.isActive = filters.isActive === 'true';
        if (filters.search) {
            query.$or = [
                { code: { $regex: filters.search, $options: 'i' } },
                { name: { $regex: filters.search, $options: 'i' } }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const [costCenters, total] = await Promise.all([
            CostCenter.find(query)
                .populate('parentCostCenter', 'code name')
                .populate('manager', 'personalInfo.firstName personalInfo.lastName')
                .sort({ type: 1, code: 1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            CostCenter.countDocuments(query)
        ]);
        
        return { costCenters, total, page: parseInt(page), pages: Math.ceil(total / limit) };
    }
    
    /**
     * Get cost center by ID
     */
    static async getCostCenterById(costCenterId, organizationId) {
        const costCenter = await CostCenter.findOne({
            _id: costCenterId,
            organization: organizationId
        })
            .populate('parentCostCenter', 'code name')
            .populate('manager', 'personalInfo.firstName personalInfo.lastName')
            .lean();
        
        if (!costCenter) {
            throw new Error('Cost center not found');
        }
        
        return costCenter;
    }
    
    /**
     * Update cost center
     */
    static async updateCostCenter(costCenterId, data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const costCenter = await CostCenter.findOne({
                _id: costCenterId,
                organization: organizationId
            }).session(session);
            
            if (!costCenter) {
                throw new Error('Cost center not found');
            }
            
            const beforeState = costCenter.toObject();
            
            Object.assign(costCenter, data);
            costCenter.updatedBy = actor.id;
            await costCenter.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'update',
                targetType: 'cost_center',
                targetId: costCenter._id,
                targetName: `${costCenter.code} - ${costCenter.name}`,
                description: `Updated cost center: ${costCenter.code} - ${costCenter.name}`,
                context: { module: 'finance' },
                success: true,
                data: { before: beforeState, after: costCenter.toObject() }
            }], { session });
            
            await session.commitTransaction();
            return costCenter;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Delete cost center
     */
    static async deleteCostCenter(costCenterId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const costCenter = await CostCenter.findOne({
                _id: costCenterId,
                organization: organizationId
            }).session(session);
            
            if (!costCenter) {
                throw new Error('Cost center not found');
            }
            
            // Check if has child cost centers
            const childCount = await CostCenter.countDocuments({
                parentCostCenter: costCenterId,
                organization: organizationId
            }).session(session);
            
            if (childCount > 0) {
                throw new Error('Cannot delete cost center with child cost centers');
            }
            
            // Check if has allocations
            const allocationCount = await CostAllocation.countDocuments({
                costCenter: costCenterId,
                organization: organizationId
            }).session(session);
            
            if (allocationCount > 0) {
                throw new Error('Cannot delete cost center with existing allocations');
            }
            
            costCenter.isActive = false;
            costCenter.updatedBy = actor.id;
            await costCenter.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'delete',
                targetType: 'cost_center',
                targetId: costCenter._id,
                targetName: `${costCenter.code} - ${costCenter.name}`,
                description: `Deactivated cost center: ${costCenter.code} - ${costCenter.name}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return costCenter;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Create cost allocation
     */
    static async createCostAllocation(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Verify cost center exists
            const costCenter = await CostCenter.findOne({
                _id: data.costCenter,
                organization: organizationId,
                isActive: true
            }).session(session);
            
            if (!costCenter) {
                throw new Error('Cost center not found or inactive');
            }
            
            // Generate allocation number
            const allocationNumber = await CostAllocation.generateAllocationNumber(organizationId);
            
            const allocation = new CostAllocation({
                ...data,
                allocationNumber,
                organization: organizationId,
                createdBy: actor.id,
                updatedBy: actor.id
            });
            
            await allocation.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'create',
                targetType: 'cost_allocation',
                targetId: allocation._id,
                targetName: allocation.allocationNumber,
                description: `Created cost allocation: ${allocation.allocationNumber} - ${allocation.description}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return allocation;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get cost allocations
     */
    static async getCostAllocations(filters, organizationId, page = 1, limit = 50) {
        const query = { organization: organizationId };
        
        if (filters.costCenter) query.costCenter = filters.costCenter;
        if (filters.startDate) query.date = { $gte: new Date(filters.startDate) };
        if (filters.endDate) query.date = { ...query.date, $lte: new Date(filters.endDate) };
        if (filters.sourceType) query.sourceType = filters.sourceType;
        
        const skip = (page - 1) * limit;
        
        const [allocations, total] = await Promise.all([
            CostAllocation.find(query)
                .populate('costCenter', 'code name type')
                .populate('createdBy', 'personalInfo.firstName personalInfo.lastName')
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            CostAllocation.countDocuments(query)
        ]);
        
        return { allocations, total, page: parseInt(page), pages: Math.ceil(total / limit) };
    }
    
    /**
     * Get cost center summary
     */
    static async getCostCenterSummary(organizationId, costCenterId, startDate, endDate) {
        // Get allocations for the cost center
        const allocations = await CostAllocation.find({
            organization: organizationId,
            costCenter: costCenterId,
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }).populate('sourceType');
        
        // Get direct expenses from journal entries and invoices
        const journalEntries = await JournalEntry.find({
            organization: organizationId,
            date: { $gte: new Date(startDate), $lte: new Date(endDate) },
            status: 'posted'
        });
        
        const invoices = await Invoice.find({
            organization: organizationId,
            type: 'purchase',
            date: { $gte: new Date(startDate), $lte: new Date(endDate) },
            status: { $in: ['approved', 'paid'] }
        });
        
        // Calculate totals
        let totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
        
        let totalDirect = 0;
        // Sum journal entries for cost center (would need a cost center field in journal entries)
        // For now, just use allocations
        
        const summary = {
            costCenterId,
            period: { startDate, endDate },
            totalAllocated,
            totalDirect,
            totalCost: totalAllocated + totalDirect,
            allocations: allocations.map(a => ({
                id: a._id,
                date: a.date,
                description: a.description,
                amount: a.amount,
                sourceType: a.sourceType
            }))
        };
        
        return summary;
    }
    
    /**
     * Get organization cost summary by cost center
     */
    static async getOrganizationCostSummary(organizationId, startDate, endDate) {
        // Get all active cost centers
        const costCenters = await CostCenter.find({
            organization: organizationId,
            isActive: true
        }).lean();
        
        // Get all allocations in period
        const allocations = await CostAllocation.find({
            organization: organizationId,
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }).lean();
        
        // Group by cost center
        const summary = costCenters.map(cc => {
            const centerAllocations = allocations.filter(a => 
                a.costCenter.toString() === cc._id.toString()
            );
            const totalAllocated = centerAllocations.reduce((sum, a) => sum + a.amount, 0);
            
            return {
                costCenterId: cc._id,
                costCenterCode: cc.code,
                costCenterName: cc.name,
                type: cc.type,
                totalAllocated,
                allocationCount: centerAllocations.length
            };
        });
        
        // Sort by total allocated descending
        summary.sort((a, b) => b.totalAllocated - a.totalAllocated);
        
        const totalCost = summary.reduce((sum, cc) => sum + cc.totalAllocated, 0);
        
        return {
            period: { startDate, endDate },
            totalCost,
            byCostCenter: summary
        };
    }
}

module.exports = CostService;
