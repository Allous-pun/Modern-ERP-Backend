// src/services/finance/account.service.js
const { Account, ACCOUNT_TYPES, ACCOUNT_CATEGORIES } = require('../../models/finance/account.model');
const Audit = require('../../models/system/audit.model');
const mongoose = require('mongoose');

class AccountService {
    /**
     * Create a new account
     */
    static async createAccount(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Check if account code already exists
            const existingAccount = await Account.findOne({
                organization: organizationId,
                code: data.code.toUpperCase(),
                deletedAt: null
            }).session(session);
            
            if (existingAccount) {
                throw new Error(`Account with code ${data.code} already exists`);
            }
            
            // Check parent account if provided
            if (data.parentAccount) {
                const parentAccount = await Account.findOne({
                    _id: data.parentAccount,
                    organization: organizationId,
                    deletedAt: null
                }).session(session);
                
                if (!parentAccount) {
                    throw new Error('Parent account not found');
                }
            }
            
            // Create account
            const account = await Account.create([{
                ...data,
                organization: organizationId,
                createdBy: actor.id,
                updatedBy: actor.id
            }], { session });
            
            // Create audit log
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'create',
                targetType: 'account',
                targetId: account[0]._id,
                targetName: `${account[0].code} - ${account[0].name}`,
                description: `Created account: ${account[0].code} - ${account[0].name}`,
                context: { module: 'finance' },
                success: true,
                data: { after: account[0].toObject() }
            }], { session });
            
            await session.commitTransaction();
            return account[0];
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get accounts with filters
     */
    static async getAccounts(filters, organizationId, page = 1, limit = 50) {
        const query = {
            organization: organizationId,
            deletedAt: null
        };
        
        if (filters.type) query.type = filters.type;
        if (filters.category) query.category = filters.category;
        if (filters.isActive !== undefined) query.isActive = filters.isActive === 'true';
        if (filters.search) {
            query.$or = [
                { code: { $regex: filters.search, $options: 'i' } },
                { name: { $regex: filters.search, $options: 'i' } },
                { description: { $regex: filters.search, $options: 'i' } }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const [accounts, total] = await Promise.all([
            Account.find(query)
                .populate('parentAccount', 'code name')
                .sort({ displayOrder: 1, code: 1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Account.countDocuments(query)
        ]);
        
        return {
            accounts,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        };
    }
    
    /**
     * Get account by ID
     */
    static async getAccountById(accountId, organizationId) {
        const account = await Account.findOne({
            _id: accountId,
            organization: organizationId,
            deletedAt: null
        }).populate('parentAccount', 'code name');
        
        if (!account) {
            throw new Error('Account not found');
        }
        
        return account;
    }
    
    /**
     * Update account
     */
    static async updateAccount(accountId, data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const account = await Account.findOne({
                _id: accountId,
                organization: organizationId,
                deletedAt: null
            }).session(session);
            
            if (!account) {
                throw new Error('Account not found');
            }
            
            // Store before state for audit
            const beforeState = account.toObject();
            
            // Check if updating code and it conflicts
            if (data.code && data.code !== account.code) {
                const existingAccount = await Account.findOne({
                    organization: organizationId,
                    code: data.code.toUpperCase(),
                    deletedAt: null,
                    _id: { $ne: accountId }
                }).session(session);
                
                if (existingAccount) {
                    throw new Error(`Account with code ${data.code} already exists`);
                }
            }
            
            // Check parent account if updating
            if (data.parentAccount) {
                const parentAccount = await Account.findOne({
                    _id: data.parentAccount,
                    organization: organizationId,
                    deletedAt: null
                }).session(session);
                
                if (!parentAccount) {
                    throw new Error('Parent account not found');
                }
                
                // Prevent circular reference
                if (parentAccount._id.toString() === accountId) {
                    throw new Error('Cannot set account as its own parent');
                }
            }
            
            // Update account
            Object.assign(account, data);
            account.updatedBy = actor.id;
            await account.save({ session });
            
            // Create audit log
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'update',
                targetType: 'account',
                targetId: account._id,
                targetName: `${account.code} - ${account.name}`,
                description: `Updated account: ${account.code} - ${account.name}`,
                context: { module: 'finance' },
                success: true,
                data: { before: beforeState, after: account.toObject() }
            }], { session });
            
            await session.commitTransaction();
            return account;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Delete account (soft delete)
     */
    static async deleteAccount(accountId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const account = await Account.findOne({
                _id: accountId,
                organization: organizationId,
                deletedAt: null
            }).session(session);
            
            if (!account) {
                throw new Error('Account not found');
            }
            
            // Check if account has child accounts
            const childAccounts = await Account.countDocuments({
                parentAccount: accountId,
                organization: organizationId,
                deletedAt: null
            }).session(session);
            
            if (childAccounts > 0) {
                throw new Error('Cannot delete account with child accounts. Delete or reassign children first.');
            }
            
            // Soft delete
            account.deletedAt = new Date();
            account.deletedBy = actor.id;
            account.isActive = false;
            await account.save({ session });
            
            // Create audit log
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'delete',
                targetType: 'account',
                targetId: account._id,
                targetName: `${account.code} - ${account.name}`,
                description: `Deleted account: ${account.code} - ${account.name}`,
                context: { module: 'finance' },
                success: true,
                data: { before: account.toObject() }
            }], { session });
            
            await session.commitTransaction();
            return account;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get chart of accounts (hierarchical)
     */
    static async getChartOfAccounts(organizationId) {
        const chart = await Account.getChart(organizationId);
        return chart;
    }
    
    /**
     * Get accounts by type
     */
    static async getAccountsByType(organizationId, type) {
        const accounts = await Account.getByType(organizationId, type);
        return accounts;
    }
    
    /**
     * Activate/Deactivate account
     */
    static async toggleAccountStatus(accountId, isActive, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const account = await Account.findOne({
                _id: accountId,
                organization: organizationId,
                deletedAt: null
            }).session(session);
            
            if (!account) {
                throw new Error('Account not found');
            }
            
            const beforeState = account.toObject();
            account.isActive = isActive;
            account.updatedBy = actor.id;
            await account.save({ session });
            
            const action = isActive ? 'activate' : 'deactivate';
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: action,
                targetType: 'account',
                targetId: account._id,
                targetName: `${account.code} - ${account.name}`,
                description: `${action === 'activate' ? 'Activated' : 'Deactivated'} account: ${account.code} - ${account.name}`,
                context: { module: 'finance' },
                success: true,
                data: { before: beforeState, after: account.toObject() }
            }], { session });
            
            await session.commitTransaction();
            return account;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}

module.exports = AccountService;