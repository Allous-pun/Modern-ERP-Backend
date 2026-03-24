// src/controllers/finance/report.controller.js
const { Account, JournalEntry } = require('../../models/finance');
const { 
    calculateBalanceSheet,
    calculateIncomeStatement,
    calculateCashFlow,
    calculateAgedReceivables,
    calculateAgedPayables
} = require('../../services/finance/reporting.service');

// @desc    Get balance sheet
// @route   GET /api/finance/reports/balance-sheet
// @access  Private (requires finance.balance_sheet_view)
const getBalanceSheet = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { asOfDate } = req.query;
        
        const balanceSheet = await calculateBalanceSheet(
            organizationId,
            asOfDate ? new Date(asOfDate) : new Date()
        );

        res.status(200).json({
            success: true,
            data: balanceSheet
        });
    } catch (error) {
        console.error('Get balance sheet error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate balance sheet'
        });
    }
};

// @desc    Get income statement
// @route   GET /api/finance/reports/income-statement
// @access  Private (requires finance.income_statement_view)
const getIncomeStatement = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const incomeStatement = await calculateIncomeStatement(
            organizationId,
            new Date(startDate),
            new Date(endDate)
        );

        res.status(200).json({
            success: true,
            data: incomeStatement
        });
    } catch (error) {
        console.error('Get income statement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate income statement'
        });
    }
};

// @desc    Get cash flow statement
// @route   GET /api/finance/reports/cash-flow
// @access  Private (requires finance.cash_flow_view)
const getCashFlowStatement = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const cashFlow = await calculateCashFlow(
            organizationId,
            new Date(startDate),
            new Date(endDate)
        );

        res.status(200).json({
            success: true,
            data: cashFlow
        });
    } catch (error) {
        console.error('Get cash flow error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate cash flow statement'
        });
    }
};

// @desc    Get trial balance report
// @route   GET /api/finance/reports/trial-balance
// @access  Private (requires finance.reports_view)
const getTrialBalanceReport = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { asOfDate } = req.query;
        
        const accounts = await Account.find({ 
            organization: organizationId,
            isActive: true 
        }).sort('code');

        const trialBalance = [];
        
        for (const account of accounts) {
            const balance = await account.getBalance(null, asOfDate ? new Date(asOfDate) : new Date());
            trialBalance.push({
                code: account.code,
                name: account.name,
                type: account.type,
                normalBalance: account.normalBalance,
                balance,
                debit: account.normalBalance === 'debit' ? balance : 0,
                credit: account.normalBalance === 'credit' ? balance : 0
            });
        }

        const totals = trialBalance.reduce((acc, item) => {
            acc.totalDebit += item.debit;
            acc.totalCredit += item.credit;
            return acc;
        }, { totalDebit: 0, totalCredit: 0 });

        res.status(200).json({
            success: true,
            data: {
                asOfDate: asOfDate || new Date(),
                accounts: trialBalance,
                totals
            }
        });
    } catch (error) {
        console.error('Get trial balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate trial balance'
        });
    }
};

// @desc    Get general ledger
// @route   GET /api/finance/reports/general-ledger
// @access  Private (requires finance.reports_view)
const getGeneralLedger = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { accountId, startDate, endDate } = req.query;
        
        const match = {
            organization: organizationId,
            status: 'posted'
        };

        if (accountId) {
            match['lines.account'] = mongoose.Types.ObjectId(accountId);
        }

        if (startDate || endDate) {
            match.date = {};
            if (startDate) match.date.$gte = new Date(startDate);
            if (endDate) match.date.$lte = new Date(endDate);
        }

        const entries = await JournalEntry.aggregate([
            { $match: match },
            { $unwind: '$lines' },
            { 
                $lookup: {
                    from: 'accounts',
                    localField: 'lines.account',
                    foreignField: '_id',
                    as: 'accountDetails'
                }
            },
            { $unwind: '$accountDetails' },
            {
                $project: {
                    date: 1,
                    journalNumber: 1,
                    description: 1,
                    accountCode: '$accountDetails.code',
                    accountName: '$accountDetails.name',
                    debit: '$lines.debit',
                    credit: '$lines.credit',
                    runningBalance: {
                        $subtract: [
                            { $sum: { $ifNull: ['$lines.debit', 0] } },
                            { $sum: { $ifNull: ['$lines.credit', 0] } }
                        ]
                    }
                }
            },
            { $sort: { date: 1, journalNumber: 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: entries
        });
    } catch (error) {
        console.error('Get general ledger error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate general ledger'
        });
    }
};

// @desc    Get aged receivables
// @route   GET /api/finance/reports/aged-receivables
// @access  Private (requires finance.reports_view)
const getAgedReceivables = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { asOfDate } = req.query;
        
        const agedReceivables = await calculateAgedReceivables(
            organizationId,
            asOfDate ? new Date(asOfDate) : new Date()
        );

        res.status(200).json({
            success: true,
            data: agedReceivables
        });
    } catch (error) {
        console.error('Get aged receivables error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate aged receivables'
        });
    }
};

// @desc    Get aged payables
// @route   GET /api/finance/reports/aged-payables
// @access  Private (requires finance.reports_view)
const getAgedPayables = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { asOfDate } = req.query;
        
        const agedPayables = await calculateAgedPayables(
            organizationId,
            asOfDate ? new Date(asOfDate) : new Date()
        );

        res.status(200).json({
            success: true,
            data: agedPayables
        });
    } catch (error) {
        console.error('Get aged payables error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate aged payables'
        });
    }
};

module.exports = {
    getBalanceSheet,
    getIncomeStatement,
    getCashFlowStatement,
    getTrialBalanceReport,
    getGeneralLedger,
    getAgedReceivables,
    getAgedPayables
};