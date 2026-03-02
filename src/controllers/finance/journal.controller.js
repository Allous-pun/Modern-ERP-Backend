// src/controllers/finance/journal.controller.js
const { JournalEntry } = require('../../models/finance');
const { generateJournalNumber } = require('../../utils/finance/generators');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get journal entries
// @route   GET /api/finance/journals
// @access  Private (requires finance.journal_view)
const getJournalEntries = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            type, 
            status,
            startDate, 
            endDate,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { organization: organizationId };
        
        if (type) filter.journalType = type;
        if (status) filter.status = status;
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const journals = await JournalEntry.find(filter)
            .sort('-date')
            .skip(skip)
            .limit(parseInt(limit))
            .populate('createdBy', 'firstName lastName')
            .populate('postedBy', 'firstName lastName')
            .populate('lines.account', 'code name');

        const total = await JournalEntry.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: journals,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get journals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch journal entries'
        });
    }
};

// @desc    Get single journal entry
// @route   GET /api/finance/journals/:id
// @access  Private (requires finance.journal_view)
const getJournalEntry = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const journal = await JournalEntry.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('createdBy', 'firstName lastName')
        .populate('postedBy', 'firstName lastName')
        .populate('lines.account', 'code name type normalBalance')
        .populate('referenceId');

        if (!journal) {
            return res.status(404).json({
                success: false,
                message: 'Journal entry not found'
            });
        }

        res.status(200).json({
            success: true,
            data: journal
        });
    } catch (error) {
        console.error('Get journal error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch journal entry'
        });
    }
};

// @desc    Create journal entry
// @route   POST /api/finance/journals
// @access  Private (requires finance.journal_create)
const createJournalEntry = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        // Validate debits equal credits
        const totalDebit = req.body.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
        const totalCredit = req.body.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
        
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return res.status(400).json({
                success: false,
                message: 'Total debits must equal total credits'
            });
        }

        const journalData = {
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId,
            journalNumber: await generateJournalNumber(organizationId, req.body.journalType || 'general'),
            status: 'draft'
        };

        const journal = await JournalEntry.create(journalData);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'journal_created',
            target: journal._id,
            details: {
                journalNumber: journal.journalNumber,
                type: journal.journalType,
                amount: totalDebit
            }
        });

        res.status(201).json({
            success: true,
            message: 'Journal entry created successfully',
            data: journal
        });
    } catch (error) {
        console.error('Create journal error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create journal entry'
        });
    }
};

// @desc    Update journal entry
// @route   PUT /api/finance/journals/:id
// @access  Private (requires finance.journal_update)
const updateJournalEntry = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const journal = await JournalEntry.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: 'draft' // Only allow updates on draft entries
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!journal) {
            return res.status(404).json({
                success: false,
                message: 'Journal entry not found or cannot be updated (already posted)'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'journal_updated',
            target: journal._id,
            details: { journalNumber: journal.journalNumber }
        });

        res.status(200).json({
            success: true,
            message: 'Journal entry updated successfully',
            data: journal
        });
    } catch (error) {
        console.error('Update journal error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update journal entry'
        });
    }
};

// @desc    Post journal entry
// @route   POST /api/finance/journals/:id/post
// @access  Private (requires finance.journal_post)
const postJournalEntry = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const journal = await JournalEntry.findOne({ 
            _id: req.params.id,
            organization: organizationId,
            status: 'draft'
        });

        if (!journal) {
            return res.status(404).json({
                success: false,
                message: 'Journal entry not found or already posted'
            });
        }

        await journal.post(req.user.userId);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'journal_posted',
            target: journal._id,
            details: { journalNumber: journal.journalNumber }
        });

        res.status(200).json({
            success: true,
            message: 'Journal entry posted successfully',
            data: journal
        });
    } catch (error) {
        console.error('Post journal error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to post journal entry'
        });
    }
};

// @desc    Reverse journal entry
// @route   POST /api/finance/journals/:id/reverse
// @access  Private (requires finance.journal_manage)
const reverseJournalEntry = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { reason } = req.body;
        
        const journal = await JournalEntry.findOne({ 
            _id: req.params.id,
            organization: organizationId,
            status: 'posted'
        });

        if (!journal) {
            return res.status(404).json({
                success: false,
                message: 'Journal entry not found or not posted'
            });
        }

        const reversal = await journal.reverse(req.user.userId, reason);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'journal_reversed',
            target: journal._id,
            details: { 
                journalNumber: journal.journalNumber,
                reversalNumber: reversal.journalNumber,
                reason 
            }
        });

        res.status(200).json({
            success: true,
            message: 'Journal entry reversed successfully',
            data: reversal
        });
    } catch (error) {
        console.error('Reverse journal error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to reverse journal entry'
        });
    }
};

module.exports = {
    getJournalEntries,
    getJournalEntry,
    createJournalEntry,
    updateJournalEntry,
    postJournalEntry,
    reverseJournalEntry
};