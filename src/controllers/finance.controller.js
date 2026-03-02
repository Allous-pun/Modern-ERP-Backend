// src/controllers/finance.controller.js
const Invoice = require('../models/invoice.model');
const JournalEntry = require('../models/journalEntry.model');
const Account = require('../models/account.model');

// ========== INVOICE CONTROLLERS ==========

// @desc    Get all invoices
// @route   GET /api/finance/invoices
// @access  Private (requires finance.invoice_view)
const getInvoices = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const invoices = await Invoice.find({ 
            organization: organizationId,
            isDeleted: { $ne: true }
        }).sort('-createdAt');

        res.status(200).json({
            success: true,
            count: invoices.length,
            data: invoices
        });
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoices'
        });
    }
};

// @desc    Get single invoice
// @route   GET /api/finance/invoices/:id
// @access  Private (requires finance.invoice_view)
const getInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        
        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        res.status(200).json({
            success: true,
            data: invoice
        });
    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoice'
        });
    }
};

// @desc    Create invoice
// @route   POST /api/finance/invoices
// @access  Private (requires finance.invoice_create)
const createInvoice = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const invoice = await Invoice.create({
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId,
            invoiceNumber: await generateInvoiceNumber(organizationId)
        });

        res.status(201).json({
            success: true,
            message: 'Invoice created successfully',
            data: invoice
        });
    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create invoice'
        });
    }
};

// @desc    Update invoice
// @route   PUT /api/finance/invoices/:id
// @access  Private (requires finance.invoice_update)
const updateInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Invoice updated successfully',
            data: invoice
        });
    } catch (error) {
        console.error('Update invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update invoice'
        });
    }
};

// @desc    Delete invoice
// @route   DELETE /api/finance/invoices/:id
// @access  Private (requires finance.invoice_delete)
const deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true },
            { new: true }
        );

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Invoice deleted successfully'
        });
    } catch (error) {
        console.error('Delete invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete invoice'
        });
    }
};

// @desc    Approve invoice
// @route   POST /api/finance/invoices/:id/approve
// @access  Private (requires finance.invoice_approve)
const approveInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByIdAndUpdate(
            req.params.id,
            { 
                status: 'approved',
                approvedBy: req.user.userId,
                approvedAt: new Date()
            },
            { new: true }
        );

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Invoice approved successfully',
            data: invoice
        });
    } catch (error) {
        console.error('Approve invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve invoice'
        });
    }
};

// ========== JOURNAL ENTRY CONTROLLERS ==========

// @desc    Get journal entries
// @route   GET /api/finance/journals
// @access  Private (requires finance.journal_view)
const getJournalEntries = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const journals = await JournalEntry.find({ organization: organizationId })
            .sort('-date')
            .populate('createdBy', 'firstName lastName');

        res.status(200).json({
            success: true,
            count: journals.length,
            data: journals
        });
    } catch (error) {
        console.error('Get journals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch journal entries'
        });
    }
};

// @desc    Create journal entry
// @route   POST /api/finance/journals
// @access  Private (requires finance.journal_create)
const createJournalEntry = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const journal = await JournalEntry.create({
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId,
            journalNumber: await generateJournalNumber(organizationId)
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
            message: 'Failed to create journal entry'
        });
    }
};

// ========== ACCOUNT CONTROLLERS ==========

// @desc    Get accounts
// @route   GET /api/finance/accounts
// @access  Private (requires finance.account_view)
const getAccounts = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const accounts = await Account.find({ 
            organization: organizationId,
            isActive: true 
        }).sort('code');

        res.status(200).json({
            success: true,
            count: accounts.length,
            data: accounts
        });
    } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch accounts'
        });
    }
};

// @desc    Create account
// @route   POST /api/finance/accounts
// @access  Private (requires finance.account_create)
const createAccount = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const account = await Account.create({
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId
        });

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: account
        });
    } catch (error) {
        console.error('Create account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create account'
        });
    }
};

// ========== FINANCIAL REPORTS ==========

// @desc    Get financial reports
// @route   GET /api/finance/reports/:type
// @access  Private (requires finance.balance_sheet_view, etc.)
const getFinancialReports = (reportType) => {
    return async (req, res) => {
        try {
            const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
            const { startDate, endDate } = req.query;

            let report = {};
            
            switch(reportType) {
                case 'balance-sheet':
                    report = await generateBalanceSheet(organizationId, startDate);
                    break;
                case 'income-statement':
                    report = await generateIncomeStatement(organizationId, startDate, endDate);
                    break;
                case 'cash-flow':
                    report = await generateCashFlow(organizationId, startDate, endDate);
                    break;
            }

            res.status(200).json({
                success: true,
                data: report
            });
        } catch (error) {
            console.error('Report generation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate report'
            });
        }
    };
};

// Helper functions
const generateInvoiceNumber = async (organizationId) => {
    const count = await Invoice.countDocuments({ organization: organizationId });
    return `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

const generateJournalNumber = async (organizationId) => {
    const count = await JournalEntry.countDocuments({ organization: organizationId });
    return `JRN-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

const generateBalanceSheet = async (organizationId, asOfDate) => {
    // Implementation for balance sheet
    return { message: 'Balance sheet generation' };
};

const generateIncomeStatement = async (organizationId, startDate, endDate) => {
    // Implementation for income statement
    return { message: 'Income statement generation' };
};

const generateCashFlow = async (organizationId, startDate, endDate) => {
    // Implementation for cash flow statement
    return { message: 'Cash flow statement generation' };
};

module.exports = {
    getInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    approveInvoice,
    getJournalEntries,
    createJournalEntry,
    getAccounts,
    createAccount,
    getFinancialReports
};