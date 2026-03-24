// src/controllers/finance/treasury.controller.js
const { Treasury, Account, JournalEntry } = require('../../models/finance');
const AuditLog = require('../../models/auditLog.model');
const { calculateCashFlow, generateForecast } = require('../../services/finance/treasury.service');

// @desc    Get all bank accounts
// @route   GET /api/finance/treasury/bank-accounts
// @access  Private (requires finance.treasury_view)
const getBankAccounts = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            currency,
            isActive = true,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { 
            organization: organizationId,
            type: 'bank',
            isActive: isActive === 'true'
        };
        
        if (currency) filter.currency = currency;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const bankAccounts = await Treasury.find(filter)
            .sort({ name: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('account', 'code name balance');

        // Get current balances
        const accountsWithBalance = await Promise.all(
            bankAccounts.map(async (account) => {
                const balance = await account.getCurrentBalance();
                return {
                    ...account.toObject(),
                    currentBalance: balance
                };
            })
        );

        const total = await Treasury.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: accountsWithBalance,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get bank accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bank accounts'
        });
    }
};

// @desc    Create bank account
// @route   POST /api/finance/treasury/bank-accounts
// @access  Private (requires finance.treasury_manage)
const createBankAccount = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        // Validate account exists
        if (req.body.account) {
            const account = await Account.findOne({
                _id: req.body.account,
                organization: organizationId
            });

            if (!account) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid account ID'
                });
            }
        }

        // Check if account number already exists
        if (req.body.accountNumber) {
            const existing = await Treasury.findOne({
                organization: organizationId,
                accountNumber: req.body.accountNumber
            });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Account number already exists'
                });
            }
        }

        const accountData = {
            ...req.body,
            type: 'bank',
            organization: organizationId,
            createdBy: req.user.userId
        };

        const bankAccount = await Treasury.create(accountData);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'bank_account_created',
            target: bankAccount._id,
            details: {
                name: bankAccount.name,
                accountNumber: bankAccount.accountNumber,
                currency: bankAccount.currency
            }
        });

        res.status(201).json({
            success: true,
            message: 'Bank account created successfully',
            data: bankAccount
        });
    } catch (error) {
        console.error('Create bank account error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create bank account'
        });
    }
};

// @desc    Get cash flow statements
// @route   GET /api/finance/treasury/cash-flows
// @access  Private (requires finance.treasury_view)
const getCashFlows = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            startDate,
            endDate,
            period = 'monthly'
        } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const cashFlows = await calculateCashFlow(
            organizationId,
            new Date(startDate),
            new Date(endDate),
            period
        );

        res.status(200).json({
            success: true,
            data: cashFlows
        });
    } catch (error) {
        console.error('Get cash flows error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cash flows'
        });
    }
};

// @desc    Get cash flow forecast
// @route   GET /api/finance/treasury/forecast
// @access  Private (requires finance.treasury_view)
const getForecast = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            months = 6,
            startDate
        } = req.query;

        const forecast = await generateForecast(
            organizationId,
            months ? parseInt(months) : 6,
            startDate ? new Date(startDate) : new Date()
        );

        res.status(200).json({
            success: true,
            data: forecast
        });
    } catch (error) {
        console.error('Get forecast error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate forecast'
        });
    }
};

// @desc    Reconcile bank account
// @route   POST /api/finance/treasury/reconcile/:id
// @access  Private (requires finance.treasury_reconcile)
const reconcileBank = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            statementBalance,
            statementDate,
            transactions,
            adjustments
        } = req.body;

        const bankAccount = await Treasury.findOne({
            _id: req.params.id,
            organization: organizationId,
            type: 'bank'
        });

        if (!bankAccount) {
            return res.status(404).json({
                success: false,
                message: 'Bank account not found'
            });
        }

        // Get book balance
        const bookBalance = await bankAccount.getCurrentBalance();

        // Perform reconciliation
        const reconciliation = await bankAccount.reconcile({
            statementBalance,
            statementDate: new Date(statementDate),
            transactions,
            adjustments,
            reconciledBy: req.user.userId
        });

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'bank_reconciled',
            target: bankAccount._id,
            details: {
                name: bankAccount.name,
                statementDate,
                statementBalance,
                bookBalance,
                difference: reconciliation.difference
            }
        });

        res.status(200).json({
            success: true,
            message: reconciliation.difference === 0 ? 'Bank account reconciled successfully' : 'Bank account reconciled with differences',
            data: reconciliation
        });
    } catch (error) {
        console.error('Reconcile bank error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to reconcile bank account'
        });
    }
};

// @desc    Get cash position
// @route   GET /api/finance/treasury/cash-position
// @access  Private (requires finance.treasury_view)
const getCashPosition = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { asOfDate } = req.query;

        const bankAccounts = await Treasury.find({
            organization: organizationId,
            type: 'bank',
            isActive: true
        });

        const cashPosition = {
            asOfDate: asOfDate ? new Date(asOfDate) : new Date(),
            totalCash: 0,
            byCurrency: {},
            accounts: []
        };

        for (const account of bankAccounts) {
            const balance = await account.getCurrentBalance(asOfDate ? new Date(asOfDate) : new Date());
            
            cashPosition.accounts.push({
                id: account._id,
                name: account.name,
                currency: account.currency,
                balance
            });

            cashPosition.totalCash += balance;

            if (!cashPosition.byCurrency[account.currency]) {
                cashPosition.byCurrency[account.currency] = 0;
            }
            cashPosition.byCurrency[account.currency] += balance;
        }

        // Get upcoming cash flows
        const upcomingInflows = await getUpcomingCashFlows(organizationId, 'inflow');
        const upcomingOutflows = await getUpcomingCashFlows(organizationId, 'outflow');

        cashPosition.upcoming = {
            inflows: upcomingInflows,
            outflows: upcomingOutflows,
            net: upcomingInflows.total - upcomingOutflows.total
        };

        res.status(200).json({
            success: true,
            data: cashPosition
        });
    } catch (error) {
        console.error('Get cash position error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cash position'
        });
    }
};

// Helper function to get upcoming cash flows
const getUpcomingCashFlows = async (organizationId, type, days = 30) => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    // This would typically query receivables/payables
    // For now, return mock data
    return {
        total: type === 'inflow' ? 150000 : 120000,
        items: [
            {
                date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                description: 'Customer payments',
                amount: type === 'inflow' ? 85000 : 0,
                currency: 'USD'
            },
            {
                date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
                description: 'Supplier payments',
                amount: type === 'outflow' ? 65000 : 0,
                currency: 'USD'
            }
        ]
    };
};

module.exports = {
    getBankAccounts,
    createBankAccount,
    getCashFlows,
    getForecast,
    reconcileBank,
    getCashPosition
};