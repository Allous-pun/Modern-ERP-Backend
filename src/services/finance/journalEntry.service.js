// src/services/finance/journalEntry.service.js
const mongoose = require('mongoose');
const JournalEntry = require('../../models/finance/journalEntry.model');
const { Account } = require('../../models/finance/account.model');
const Audit = require('../../models/system/audit.model');

class JournalEntryService {
    /**
     * Create journal entry
     */
    static async createJournalEntry(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Validate accounts exist and are active
            for (const entry of data.entries) {
                const account = await Account.findOne({
                    _id: entry.account,
                    organization: organizationId,
                    deletedAt: null,
                    isActive: true
                }).session(session);
                
                if (!account) {
                    throw new Error(`Account ${entry.account} not found or inactive`);
                }
            }
            
            // Generate journal number
            const journalNumber = await JournalEntry.generateJournalNumber(organizationId);
            
            // Create journal entry
            const journalEntry = new JournalEntry({
                ...data,
                journalNumber,
                organization: organizationId,
                createdBy: actor.id,
                updatedBy: actor.id
            });
            
            await journalEntry.save({ session });
            
            // Create audit log
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'create',
                targetType: 'journal_entry',
                targetId: journalEntry._id,
                targetName: journalEntry.journalNumber,
                description: `Created journal entry: ${journalEntry.journalNumber}`,
                context: { module: 'finance' },
                success: true,
                data: { after: journalEntry.toObject() }
            }], { session });
            
            await session.commitTransaction();
            return journalEntry;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get journal entries with filters
     */
    static async getJournalEntries(filters, organizationId, page = 1, limit = 50) {
        const query = { organization: organizationId };
        
        if (filters.startDate || filters.endDate) {
            query.date = {};
            if (filters.startDate) query.date.$gte = new Date(filters.startDate);
            if (filters.endDate) query.date.$lte = new Date(filters.endDate);
        }
        
        if (filters.status) query.status = filters.status;
        if (filters.journalNumber) query.journalNumber = { $regex: filters.journalNumber, $options: 'i' };
        if (filters.search) {
            query.$or = [
                { description: { $regex: filters.search, $options: 'i' } },
                { journalNumber: { $regex: filters.search, $options: 'i' } },
                { reference: { $regex: filters.search, $options: 'i' } }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const [entries, total] = await Promise.all([
            JournalEntry.find(query)
                .populate('entries.account', 'code name type category')
                .populate('createdBy', 'personalInfo.firstName personalInfo.lastName')
                .populate('approvedBy', 'personalInfo.firstName personalInfo.lastName')
                .populate('postedBy', 'personalInfo.firstName personalInfo.lastName')
                .sort({ date: -1, journalNumber: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            JournalEntry.countDocuments(query)
        ]);
        
        return {
            entries,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        };
    }
    
    /**
     * Get journal entry by ID
     */
    static async getJournalEntryById(entryId, organizationId) {
        const entry = await JournalEntry.findOne({
            _id: entryId,
            organization: organizationId
        })
            .populate('entries.account', 'code name type category')
            .populate('createdBy', 'personalInfo.firstName personalInfo.lastName')
            .populate('approvedBy', 'personalInfo.firstName personalInfo.lastName')
            .populate('postedBy', 'personalInfo.firstName personalInfo.lastName')
            .lean();
        
        if (!entry) {
            throw new Error('Journal entry not found');
        }
        
        return entry;
    }
    
    /**
     * Approve journal entry
     */
    static async approveJournalEntry(entryId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const entry = await JournalEntry.findOne({
                _id: entryId,
                organization: organizationId
            }).session(session);
            
            if (!entry) {
                throw new Error('Journal entry not found');
            }
            
            if (!entry.canApprove()) {
                throw new Error(`Cannot approve journal entry with status: ${entry.status}`);
            }
            
            entry.approve(actor.id);
            await entry.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'approve',
                targetType: 'journal_entry',
                targetId: entry._id,
                targetName: entry.journalNumber,
                description: `Approved journal entry: ${entry.journalNumber}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return entry;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Post journal entry to ledger
     */
    static async postJournalEntry(entryId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const entry = await JournalEntry.findOne({
                _id: entryId,
                organization: organizationId
            }).session(session);
            
            if (!entry) {
                throw new Error('Journal entry not found');
            }
            
            if (!entry.canPost()) {
                throw new Error(`Cannot post journal entry with status: ${entry.status}. Must be approved first.`);
            }
            
            if (entry.postedAt) {
                throw new Error('Journal entry already posted');
            }
            
            entry.post(actor.id);
            await entry.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'post',
                targetType: 'journal_entry',
                targetId: entry._id,
                targetName: entry.journalNumber,
                description: `Posted journal entry: ${entry.journalNumber}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return entry;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get journal entry statistics
     * @param {string} organizationId - Organization ID
     * @param {string} startDate - Start date (optional)
     * @param {string} endDate - End date (optional)
     * @returns {Promise<Object>} Statistics object with totalEntries, totalDebit, totalCredit
     */
    static async getJournalStats(organizationId, startDate, endDate) {
        const match = {
            organization: new mongoose.Types.ObjectId(organizationId),  // ← Add 'new'
            status: 'posted'
        };
        
        if (startDate || endDate) {
            match.date = {};
            if (startDate) match.date.$gte = new Date(startDate);
            if (endDate) match.date.$lte = new Date(endDate);
        }
        
        const stats = await JournalEntry.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalEntries: { $sum: 1 },
                    totalDebit: { $sum: '$totalDebit' },
                    totalCredit: { $sum: '$totalCredit' }
                }
            }
        ]);
        
        return stats[0] || { totalEntries: 0, totalDebit: 0, totalCredit: 0 };
    }
}

module.exports = JournalEntryService;