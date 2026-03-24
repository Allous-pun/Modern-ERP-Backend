// src/controllers/finance/journalEntry.controller.js
const JournalEntryService = require('../../services/finance/journalEntry.service');

/**
 * @desc    Create journal entry
 * @route   POST /api/finance/journal-entries
 * @access  Private (requires finance.journal_create)
 */
const createJournalEntry = async (req, res) => {
    try {
        const { date, description, reference, entries } = req.body;
        
        // Validate required fields
        if (!date || !description || !entries || entries.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'date, description, and entries are required'
            });
        }
        
        // Validate each entry has account and either debit or credit
        for (const entry of entries) {
            if (!entry.account) {
                return res.status(400).json({
                    success: false,
                    message: 'Each entry must have an account'
                });
            }
            if (!entry.debit && !entry.credit) {
                return res.status(400).json({
                    success: false,
                    message: 'Each entry must have either debit or credit'
                });
            }
            if (entry.debit && entry.credit) {
                return res.status(400).json({
                    success: false,
                    message: 'Entry cannot have both debit and credit'
                });
            }
        }
        
        const journalEntry = await JournalEntryService.createJournalEntry({
            date,
            description,
            reference,
            entries
        }, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(201).json({
            success: true,
            message: 'Journal entry created successfully',
            data: journalEntry
        });
        
    } catch (error) {
        console.error('Create journal entry error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create journal entry'
        });
    }
};

/**
 * @desc    Get journal entries
 * @route   GET /api/finance/journal-entries
 * @access  Private (requires finance.journal_view)
 */
const getJournalEntries = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            status,
            journalNumber,
            search,
            page = 1,
            limit = 50
        } = req.query;
        
        const result = await JournalEntryService.getJournalEntries({
            startDate,
            endDate,
            status,
            journalNumber,
            search
        }, req.user.organizationId, page, limit);
        
        res.status(200).json({
            success: true,
            count: result.entries.length,
            total: result.total,
            page: result.page,
            pages: result.pages,
            data: result.entries
        });
        
    } catch (error) {
        console.error('Get journal entries error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch journal entries'
        });
    }
};

/**
 * @desc    Get journal entry by ID
 * @route   GET /api/finance/journal-entries/:id
 * @access  Private (requires finance.journal_view)
 */
const getJournalEntryById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const entry = await JournalEntryService.getJournalEntryById(id, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            data: entry
        });
        
    } catch (error) {
        console.error('Get journal entry error:', error);
        res.status(404).json({
            success: false,
            message: error.message || 'Journal entry not found'
        });
    }
};

/**
 * @desc    Update journal entry
 * @route   PUT /api/finance/journal-entries/:id
 * @access  Private (requires finance.journal_update)
 */
const updateJournalEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const entry = await JournalEntryService.updateJournalEntry(id, updateData, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Journal entry updated successfully',
            data: entry
        });
        
    } catch (error) {
        console.error('Update journal entry error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update journal entry'
        });
    }
};

/**
 * @desc    Approve journal entry
 * @route   POST /api/finance/journal-entries/:id/approve
 * @access  Private (requires finance.journal_approve)
 */
const approveJournalEntry = async (req, res) => {
    try {
        const { id } = req.params;
        
        const entry = await JournalEntryService.approveJournalEntry(id, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Journal entry approved successfully',
            data: entry
        });
        
    } catch (error) {
        console.error('Approve journal entry error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to approve journal entry'
        });
    }
};

/**
 * @desc    Post journal entry to ledger
 * @route   POST /api/finance/journal-entries/:id/post
 * @access  Private (requires finance.journal_post)
 */
const postJournalEntry = async (req, res) => {
    try {
        const { id } = req.params;
        
        const entry = await JournalEntryService.postJournalEntry(id, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Journal entry posted successfully',
            data: entry
        });
        
    } catch (error) {
        console.error('Post journal entry error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to post journal entry'
        });
    }
};

/**
 * @desc    Reverse journal entry
 * @route   POST /api/finance/journal-entries/:id/reverse
 * @access  Private (requires finance.journal_update)
 */
const reverseJournalEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Reversal reason is required'
            });
        }
        
        const result = await JournalEntryService.reverseJournalEntry(id, reason, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Journal entry reversed successfully',
            data: result
        });
        
    } catch (error) {
        console.error('Reverse journal entry error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to reverse journal entry'
        });
    }
};

/**
 * @desc    Get journal entry statistics
 * @route   GET /api/finance/journal-entries/stats
 * @access  Private (requires finance.journal_view)
 */
const getJournalStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const stats = await JournalEntryService.getJournalStats(
            req.user.organizationId,
            startDate,
            endDate
        );
        
        res.status(200).json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Get journal stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch journal statistics'
        });
    }
};

module.exports = {
    createJournalEntry,
    getJournalEntries,
    getJournalEntryById,
    updateJournalEntry,
    approveJournalEntry,
    postJournalEntry,
    reverseJournalEntry,
    getJournalStats
};
