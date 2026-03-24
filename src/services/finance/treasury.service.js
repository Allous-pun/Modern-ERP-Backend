// src/services/finance/treasury.service.js
const mongoose = require('mongoose');
const { BankAccount, Reconciliation, CashFlowForecast } = require('../../models/finance/treasury.model');
const JournalEntry = require('../../models/finance/journalEntry.model');
const Audit = require('../../models/system/audit.model');

class TreasuryService {
    /**
     * Create bank account
     */
    static async createBankAccount(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // If this is default, remove default from others
            if (data.isDefault) {
                await BankAccount.updateMany(
                    { organization: organizationId, isDefault: true },
                    { isDefault: false },
                    { session }
                );
            }
            
            const bankAccount = new BankAccount({
                ...data,
                organization: organizationId,
                currentBalance: data.openingBalance || 0,
                createdBy: actor.id,
                updatedBy: actor.id
            });
            
            await bankAccount.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'create',
                targetType: 'bank_account',
                targetId: bankAccount._id,
                targetName: bankAccount.displayName,
                description: `Created bank account: ${bankAccount.displayName}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return bankAccount;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get bank accounts
     */
    static async getBankAccounts(filters, organizationId, page = 1, limit = 50) {
        const query = { organization: organizationId };
        
        if (filters.isActive !== undefined) query.isActive = filters.isActive === 'true';
        if (filters.currency) query.currency = filters.currency;
        if (filters.search) {
            query.$or = [
                { accountName: { $regex: filters.search, $options: 'i' } },
                { bankName: { $regex: filters.search, $options: 'i' } },
                { accountNumber: { $regex: filters.search, $options: 'i' } }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const [accounts, total] = await Promise.all([
            BankAccount.find(query)
                .sort({ isDefault: -1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            BankAccount.countDocuments(query)
        ]);
        
        return { accounts, total, page: parseInt(page), pages: Math.ceil(total / limit) };
    }
    
    /**
     * Get bank account by ID
     */
    static async getBankAccountById(accountId, organizationId) {
        const account = await BankAccount.findOne({
            _id: accountId,
            organization: organizationId
        }).lean();
        
        if (!account) {
            throw new Error('Bank account not found');
        }
        
        return account;
    }
    
    /**
     * Update bank account
     */
    static async updateBankAccount(accountId, data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const account = await BankAccount.findOne({
                _id: accountId,
                organization: organizationId
            }).session(session);
            
            if (!account) {
                throw new Error('Bank account not found');
            }
            
            const beforeState = account.toObject();
            
            // If setting as default, remove default from others
            if (data.isDefault && !account.isDefault) {
                await BankAccount.updateMany(
                    { organization: organizationId, isDefault: true },
                    { isDefault: false },
                    { session }
                );
            }
            
            Object.assign(account, data);
            account.updatedBy = actor.id;
            await account.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'update',
                targetType: 'bank_account',
                targetId: account._id,
                targetName: account.displayName,
                description: `Updated bank account: ${account.displayName}`,
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
     * Delete bank account (soft delete)
     */
    static async deleteBankAccount(accountId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const account = await BankAccount.findOne({
                _id: accountId,
                organization: organizationId
            }).session(session);
            
            if (!account) {
                throw new Error('Bank account not found');
            }
            
            if (account.isDefault) {
                throw new Error('Cannot delete default bank account');
            }
            
            account.isActive = false;
            account.updatedBy = actor.id;
            await account.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'delete',
                targetType: 'bank_account',
                targetId: account._id,
                targetName: account.displayName,
                description: `Deleted bank account: ${account.displayName}`,
                context: { module: 'finance' },
                success: true
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
     * Get cash position
     */
    static async getCashPosition(organizationId, asOfDate = new Date()) {
        const accounts = await BankAccount.find({
            organization: organizationId,
            isActive: true
        }).lean();
        
        let totalCash = 0;
        const breakdown = [];
        
        for (const account of accounts) {
            totalCash += account.currentBalance;
            breakdown.push({
                accountId: account._id,
                accountName: account.displayName,
                bankName: account.bankName,
                accountNumber: account.accountNumber,
                currency: account.currency,
                balance: account.currentBalance
            });
        }
        
        return {
            asOfDate,
            totalCash,
            breakdown,
            accountCount: accounts.length
        };
    }
    
    /**
     * Create reconciliation
     */
    static async createReconciliation(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const bankAccount = await BankAccount.findOne({
                _id: data.bankAccount,
                organization: organizationId,
                isActive: true
            }).session(session);
            
            if (!bankAccount) {
                throw new Error('Bank account not found');
            }
            
            const bookBalance = bankAccount.currentBalance;
            const difference = data.statementBalance - bookBalance;
            
            const reconciliation = new Reconciliation({
                ...data,
                organization: organizationId,
                bookBalance,
                difference,
                createdBy: actor.id
            });
            
            await reconciliation.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'create',
                targetType: 'reconciliation',
                targetId: reconciliation._id,
                targetName: `${bankAccount.displayName} - ${data.statementDate}`,
                description: `Created reconciliation for ${bankAccount.displayName}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return reconciliation;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get reconciliations
     */
    static async getReconciliations(filters, organizationId, page = 1, limit = 50) {
        const query = { organization: organizationId };
        
        if (filters.bankAccount) query.bankAccount = filters.bankAccount;
        if (filters.status) query.status = filters.status;
        if (filters.startDate) query.statementDate = { $gte: new Date(filters.startDate) };
        if (filters.endDate) query.statementDate = { ...query.statementDate, $lte: new Date(filters.endDate) };
        
        const skip = (page - 1) * limit;
        
        const [reconciliations, total] = await Promise.all([
            Reconciliation.find(query)
                .populate('bankAccount', 'accountName bankName accountNumber')
                .populate('reconciledBy', 'personalInfo.firstName personalInfo.lastName')
                .sort({ statementDate: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Reconciliation.countDocuments(query)
        ]);
        
        return { reconciliations, total, page: parseInt(page), pages: Math.ceil(total / limit) };
    }
    
    /**
     * Post reconciliation (mark as reconciled)
     */
    static async postReconciliation(reconciliationId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const reconciliation = await Reconciliation.findOne({
                _id: reconciliationId,
                organization: organizationId
            }).session(session);
            
            if (!reconciliation) {
                throw new Error('Reconciliation not found');
            }
            
            if (reconciliation.status === 'reconciled') {
                throw new Error('Reconciliation already posted');
            }
            
            reconciliation.status = 'reconciled';
            reconciliation.reconciledBy = actor.id;
            reconciliation.reconciledAt = new Date();
            await reconciliation.save({ session });
            
            // Update bank account last reconciled info
            await BankAccount.updateOne(
                { _id: reconciliation.bankAccount },
                {
                    lastReconciledAt: new Date(),
                    lastReconciledBalance: reconciliation.statementBalance
                },
                { session }
            );
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'post',
                targetType: 'reconciliation',
                targetId: reconciliation._id,
                targetName: `Reconciliation ${reconciliation._id}`,
                description: `Posted reconciliation for bank account`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return reconciliation;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Create cash flow forecast
     */
    static async createCashFlowForecast(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const forecast = new CashFlowForecast({
                ...data,
                organization: organizationId,
                createdBy: actor.id
            });
            
            await forecast.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'create',
                targetType: 'cash_flow_forecast',
                targetId: forecast._id,
                targetName: `Forecast ${forecast.startDate} - ${forecast.endDate}`,
                description: `Created cash flow forecast`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return forecast;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get cash flow forecasts
     */
    static async getCashFlowForecasts(organizationId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        
        const [forecasts, total] = await Promise.all([
            CashFlowForecast.find({ organization: organizationId })
                .sort({ startDate: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            CashFlowForecast.countDocuments({ organization: organizationId })
        ]);
        
        return { forecasts, total, page: parseInt(page), pages: Math.ceil(total / limit) };
    }
}

module.exports = TreasuryService;
