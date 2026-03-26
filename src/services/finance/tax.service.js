// src/services/finance/tax.service.js
const mongoose = require('mongoose');
const { TaxRate, TaxReturn } = require('../../models/finance/tax.model');
const Invoice = require('../../models/finance/invoice.model');
const Audit = require('../../models/system/audit.model');

class TaxService {
    /**
     * Create tax rate
     */
    static async createTaxRate(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const taxRate = new TaxRate({
                ...data,
                organization: organizationId,
                createdBy: actor.id,
                updatedBy: actor.id
            });
            
            await taxRate.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'create',
                targetType: 'tax_rate',
                targetId: taxRate._id,
                targetName: `${taxRate.code} - ${taxRate.name}`,
                description: `Created tax rate: ${taxRate.code} - ${taxRate.name} (${taxRate.rate}%)`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return taxRate;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get tax rates
     */
    static async getTaxRates(filters, organizationId, page = 1, limit = 50) {
        const query = { organization: organizationId };
        
        if (filters.type) query.type = filters.type;
        if (filters.isActive !== undefined) query.isActive = filters.isActive === 'true';
        if (filters.search) {
            query.$or = [
                { name: { $regex: filters.search, $options: 'i' } },
                { code: { $regex: filters.search, $options: 'i' } }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const [taxRates, total] = await Promise.all([
            TaxRate.find(query)
                .populate('taxPayableAccount', 'code name')
                .populate('taxExpenseAccount', 'code name')
                .sort({ type: 1, rate: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            TaxRate.countDocuments(query)
        ]);
        
        return { taxRates, total, page: parseInt(page), pages: Math.ceil(total / limit) };
    }
    
    /**
     * Get tax rate by ID
     */
    static async getTaxRateById(taxRateId, organizationId) {
        const taxRate = await TaxRate.findOne({
            _id: taxRateId,
            organization: organizationId
        })
            .populate('taxPayableAccount', 'code name')
            .populate('taxExpenseAccount', 'code name')
            .lean();
        
        if (!taxRate) {
            throw new Error('Tax rate not found');
        }
        
        return taxRate;
    }
    
    /**
     * Update tax rate
     */
    static async updateTaxRate(taxRateId, data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const taxRate = await TaxRate.findOne({
                _id: taxRateId,
                organization: organizationId
            }).session(session);
            
            if (!taxRate) {
                throw new Error('Tax rate not found');
            }
            
            const beforeState = taxRate.toObject();
            
            Object.assign(taxRate, data);
            taxRate.updatedBy = actor.id;
            await taxRate.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'update',
                targetType: 'tax_rate',
                targetId: taxRate._id,
                targetName: `${taxRate.code} - ${taxRate.name}`,
                description: `Updated tax rate: ${taxRate.code} - ${taxRate.name}`,
                context: { module: 'finance' },
                success: true,
                data: { before: beforeState, after: taxRate.toObject() }
            }], { session });
            
            await session.commitTransaction();
            return taxRate;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Delete tax rate (soft delete)
     */
    static async deleteTaxRate(taxRateId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const taxRate = await TaxRate.findOne({
                _id: taxRateId,
                organization: organizationId
            }).session(session);
            
            if (!taxRate) {
                throw new Error('Tax rate not found');
            }
            
            taxRate.isActive = false;
            taxRate.updatedBy = actor.id;
            await taxRate.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'delete',
                targetType: 'tax_rate',
                targetId: taxRate._id,
                targetName: `${taxRate.code} - ${taxRate.name}`,
                description: `Deactivated tax rate: ${taxRate.code} - ${taxRate.name}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return taxRate;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get active tax rates
     */
    static async getActiveTaxRates(organizationId, type = null) {
        const query = {
            organization: organizationId,
            isActive: true,
            effectiveFrom: { $lte: new Date() },
            $or: [
                { effectiveTo: null },
                { effectiveTo: { $gte: new Date() } }
            ]
        };
        
        if (type) query.type = type;
        
        const taxRates = await TaxRate.find(query)
            .populate('taxPayableAccount', 'code name')
            .sort({ rate: -1 })
            .lean();
        
        return taxRates;
    }
    
    /**
     * Calculate tax for an amount
     */
    static async calculateTax(amount, taxRateCode, organizationId) {
        const taxRate = await TaxRate.findOne({
            organization: organizationId,
            code: taxRateCode,
            isActive: true,
            effectiveFrom: { $lte: new Date() },
            $or: [
                { effectiveTo: null },
                { effectiveTo: { $gte: new Date() } }
            ]
        });
        
        if (!taxRate) {
            throw new Error(`Tax rate ${taxRateCode} not found or not active`);
        }
        
        const taxAmount = amount * (taxRate.rate / 100);
        
        return {
            rate: taxRate.rate,
            amount: taxAmount,
            total: amount + taxAmount,
            taxRateId: taxRate._id,
            taxRateCode: taxRate.code
        };
    }
    
    /**
     * Create tax return
     */
    static async createTaxReturn(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const returnNumber = await TaxReturn.generateReturnNumber(organizationId, data.taxType);
            
            const taxReturn = new TaxReturn({
                ...data,
                returnNumber,
                organization: organizationId,
                createdBy: actor.id,
                updatedBy: actor.id
            });
            
            await taxReturn.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'create',
                targetType: 'tax_return',
                targetId: taxReturn._id,
                targetName: taxReturn.returnNumber,
                description: `Created tax return: ${taxReturn.returnNumber}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return taxReturn;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get tax returns
     */
    static async getTaxReturns(filters, organizationId, page = 1, limit = 50) {
        const query = { organization: organizationId };
        
        if (filters.taxType) query.taxType = filters.taxType;
        if (filters.status) query.status = filters.status;
        if (filters.startDate) query.periodStart = { $gte: new Date(filters.startDate) };
        if (filters.endDate) query.periodEnd = { $lte: new Date(filters.endDate) };
        
        const skip = (page - 1) * limit;
        
        const [taxReturns, total] = await Promise.all([
            TaxReturn.find(query)
                .populate('filedBy', 'personalInfo.firstName personalInfo.lastName')
                .sort({ periodEnd: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            TaxReturn.countDocuments(query)
        ]);
        
        return { taxReturns, total, page: parseInt(page), pages: Math.ceil(total / limit) };
    }
    
    /**
     * File tax return
     */
    static async fileTaxReturn(returnId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const taxReturn = await TaxReturn.findOne({
                _id: returnId,
                organization: organizationId
            }).session(session);
            
            if (!taxReturn) {
                throw new Error('Tax return not found');
            }
            
            if (taxReturn.status !== 'draft' && taxReturn.status !== 'submitted') {
                throw new Error(`Cannot file tax return with status: ${taxReturn.status}`);
            }
            
            taxReturn.status = 'filed';
            taxReturn.filedBy = actor.id;
            taxReturn.filedAt = new Date();
            await taxReturn.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'file',
                targetType: 'tax_return',
                targetId: taxReturn._id,
                targetName: taxReturn.returnNumber,
                description: `Filed tax return: ${taxReturn.returnNumber}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return taxReturn;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get tax summary for a period
     */
    static async getTaxSummary(organizationId, startDate, endDate) {
        // Get all invoices in the period
        const invoices = await Invoice.find({
            organization: organizationId,
            date: { $gte: new Date(startDate), $lte: new Date(endDate) },
            status: { $in: ['approved', 'paid'] }
        });
        
        let taxableSales = 0;
        let taxCollected = 0;
        let taxablePurchases = 0;
        let taxPaid = 0;
        
        for (const invoice of invoices) {
            if (invoice.type === 'sales') {
                taxableSales += invoice.subtotal;
                taxCollected += invoice.taxTotal;
            } else if (invoice.type === 'purchase') {
                taxablePurchases += invoice.subtotal;
                taxPaid += invoice.taxTotal;
            }
        }
        
        const netTaxPayable = taxCollected - taxPaid;
        
        return {
            period: { startDate, endDate },
            taxableSales,
            taxCollected,
            taxablePurchases,
            taxPaid,
            netTaxPayable
        };
    }
}

module.exports = TaxService;
