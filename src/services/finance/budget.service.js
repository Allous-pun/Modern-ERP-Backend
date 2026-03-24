// src/services/finance/budget.service.js
const mongoose = require('mongoose');
const Budget = require('../../models/finance/budget.model');
const { Account } = require('../../models/finance/account.model');
const JournalEntry = require('../../models/finance/journalEntry.model');
const Audit = require('../../models/system/audit.model');

class BudgetService {
    /**
     * Create budget
     */
    static async createBudget(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Validate accounts exist and are active
            for (const item of data.lineItems) {
                const account = await Account.findOne({
                    _id: item.account,
                    organization: organizationId,
                    deletedAt: null,
                    isActive: true
                }).session(session);
                
                if (!account) {
                    throw new Error(`Account ${item.account} not found or inactive`);
                }
            }
            
            // Generate budget number
            const budgetNumber = await Budget.generateBudgetNumber(organizationId);
            
            // Calculate totals
            const totalBudget = data.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
            
            // Create budget
            const budget = new Budget({
                ...data,
                budgetNumber,
                organization: organizationId,
                totalBudget: totalBudget,
                createdBy: actor.id,
                updatedBy: actor.id
            });
            
            await budget.save({ session });
            
            // Create audit log
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'create',
                targetType: 'budget',
                targetId: budget._id,
                targetName: budget.name,
                description: `Created budget: ${budget.name} (${budget.budgetNumber})`,
                context: { module: 'finance' },
                success: true,
                data: { after: budget.toObject() }
            }], { session });
            
            await session.commitTransaction();
            return budget;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get budgets with filters
     */
    static async getBudgets(filters, organizationId, page = 1, limit = 50) {
        const query = { organization: organizationId };
        
        if (filters.fiscalYear) query.fiscalYear = parseInt(filters.fiscalYear);
        if (filters.status) query.status = filters.status;
        if (filters.search) {
            query.$or = [
                { name: { $regex: filters.search, $options: 'i' } },
                { budgetNumber: { $regex: filters.search, $options: 'i' } },
                { description: { $regex: filters.search, $options: 'i' } }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const [budgets, total] = await Promise.all([
            Budget.find(query)
                .populate('lineItems.account', 'code name type category')
                .populate('createdBy', 'personalInfo.firstName personalInfo.lastName')
                .populate('approvedBy', 'personalInfo.firstName personalInfo.lastName')
                .sort({ fiscalYear: -1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Budget.countDocuments(query)
        ]);
        
        return {
            budgets,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        };
    }
    
    /**
     * Get budget by ID
     */
    static async getBudgetById(budgetId, organizationId) {
        const budget = await Budget.findOne({
            _id: budgetId,
            organization: organizationId
        })
            .populate('lineItems.account', 'code name type category')
            .populate('createdBy', 'personalInfo.firstName personalInfo.lastName')
            .populate('approvedBy', 'personalInfo.firstName personalInfo.lastName')
            .lean();
        
        if (!budget) {
            throw new Error('Budget not found');
        }
        
        return budget;
    }
    
    /**
     * Update budget (only if draft)
     */
    static async updateBudget(budgetId, data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const budget = await Budget.findOne({
                _id: budgetId,
                organization: organizationId
            }).session(session);
            
            if (!budget) {
                throw new Error('Budget not found');
            }
            
            if (budget.status !== 'draft') {
                throw new Error(`Cannot update budget with status: ${budget.status}`);
            }
            
            const beforeState = budget.toObject();
            
            // Update fields
            if (data.name) budget.name = data.name;
            if (data.description) budget.description = data.description;
            if (data.fiscalYear) budget.fiscalYear = data.fiscalYear;
            if (data.periodType) budget.periodType = data.periodType;
            if (data.startDate) budget.startDate = data.startDate;
            if (data.endDate) budget.endDate = data.endDate;
            if (data.lineItems) {
                // Validate accounts
                for (const item of data.lineItems) {
                    const account = await Account.findOne({
                        _id: item.account,
                        organization: organizationId,
                        deletedAt: null,
                        isActive: true
                    }).session(session);
                    
                    if (!account) {
                        throw new Error(`Account ${item.account} not found or inactive`);
                    }
                }
                budget.lineItems = data.lineItems;
                budget.totalBudget = data.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
            }
            
            budget.updatedBy = actor.id;
            await budget.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'update',
                targetType: 'budget',
                targetId: budget._id,
                targetName: budget.name,
                description: `Updated budget: ${budget.name} (${budget.budgetNumber})`,
                context: { module: 'finance' },
                success: true,
                data: { before: beforeState, after: budget.toObject() }
            }], { session });
            
            await session.commitTransaction();
            return budget;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Submit budget for review
     */
    static async submitForReview(budgetId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const budget = await Budget.findOne({
                _id: budgetId,
                organization: organizationId
            }).session(session);
            
            if (!budget) {
                throw new Error('Budget not found');
            }
            
            if (budget.status !== 'draft') {
                throw new Error(`Cannot submit budget with status: ${budget.status}`);
            }
            
            budget.status = 'review';
            budget.updatedBy = actor.id;
            await budget.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'submit',
                targetType: 'budget',
                targetId: budget._id,
                targetName: budget.name,
                description: `Submitted budget for review: ${budget.name} (${budget.budgetNumber})`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return budget;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Approve budget
     */
    static async approveBudget(budgetId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const budget = await Budget.findOne({
                _id: budgetId,
                organization: organizationId
            }).session(session);
            
            if (!budget) {
                throw new Error('Budget not found');
            }
            
            if (!budget.canApprove()) {
                throw new Error(`Cannot approve budget with status: ${budget.status}`);
            }
            
            budget.approve(actor.id);
            await budget.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'approve',
                targetType: 'budget',
                targetId: budget._id,
                targetName: budget.name,
                description: `Approved budget: ${budget.name} (${budget.budgetNumber})`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return budget;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Activate budget
     */
    static async activateBudget(budgetId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const budget = await Budget.findOne({
                _id: budgetId,
                organization: organizationId
            }).session(session);
            
            if (!budget) {
                throw new Error('Budget not found');
            }
            
            if (!budget.canActivate()) {
                throw new Error(`Cannot activate budget with status: ${budget.status}`);
            }
            
            budget.activate(actor.id);
            await budget.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'activate',
                targetType: 'budget',
                targetId: budget._id,
                targetName: budget.name,
                description: `Activated budget: ${budget.name} (${budget.budgetNumber})`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return budget;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Update actual amounts from journal entries
     */
    static async updateActualAmounts(budgetId, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const budget = await Budget.findOne({
                _id: budgetId,
                organization: organizationId
            }).session(session);
            
            if (!budget) {
                throw new Error('Budget not found');
            }
            
            // Get posted journal entries within budget period
            const journalEntries = await JournalEntry.find({
                organization: organizationId,
                status: 'posted',
                date: { $gte: budget.startDate, $lte: budget.endDate }
            }).session(session);
            
            // First, get all accounts with their types
            const accountIds = budget.lineItems.map(item => item.account);
            const accounts = await Account.find({
                _id: { $in: accountIds },
                organization: organizationId
            }).session(session);
            
            const accountTypeMap = {};
            accounts.forEach(acc => {
                accountTypeMap[acc._id.toString()] = acc.type;
            });
            
            // Calculate actual amounts per account based on account type
            const actualByAccount = {};
            
            for (const entry of journalEntries) {
                for (const line of entry.entries) {
                    const accountId = line.account.toString();
                    const accountType = accountTypeMap[accountId];
                    
                    if (!actualByAccount[accountId]) {
                        actualByAccount[accountId] = 0;
                    }
                    
                    // Calculate based on account type
                    // For asset and expense accounts: increase with debits
                    // For revenue, liability, equity accounts: increase with credits
                    if (accountType === 'asset' || accountType === 'expense') {
                        // Normal balance: Debit = positive
                        actualByAccount[accountId] += (line.debit || 0) - (line.credit || 0);
                    } else if (accountType === 'revenue' || accountType === 'liability' || accountType === 'equity') {
                        // Normal balance: Credit = positive
                        actualByAccount[accountId] += (line.credit || 0) - (line.debit || 0);
                    } else {
                        // Default: treat as debit - credit
                        actualByAccount[accountId] += (line.debit || 0) - (line.credit || 0);
                    }
                }
            }
            
            // Update line items with actual amounts
            let totalActual = 0;
            for (const item of budget.lineItems) {
                const accountId = item.account.toString();
                const actualAmount = actualByAccount[accountId] || 0;
                item.actualAmount = actualAmount;
                item.variance = item.amount - actualAmount;
                item.variancePercentage = item.amount > 0 ? (item.variance / item.amount) * 100 : 0;
                totalActual += actualAmount;
            }
            
            budget.totalActual = totalActual;
            budget.totalVariance = budget.totalBudget - totalActual;
            budget.updatedBy = null;
            
            await budget.save({ session });
            
            await session.commitTransaction();
            return budget;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get budget summary
     */
    static async getBudgetSummary(organizationId, fiscalYear) {
        const summary = await Budget.getSummary(organizationId, fiscalYear);
        return summary;
    }
    
    /**
     * Get budgets by fiscal year
     */
    static async getBudgetsByFiscalYear(organizationId, fiscalYear, status = null) {
        const budgets = await Budget.getByFiscalYear(organizationId, fiscalYear, status);
        return budgets;
    }
}

module.exports = BudgetService;
