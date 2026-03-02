// src/controllers/finance/account.controller.js
const { Account } = require('../../models/finance');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all accounts
// @route   GET /api/finance/accounts
// @access  Private (requires finance.account_view)
const getAccounts = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            type, 
            category,
            isActive = true,
            page = 1,
            limit = 50
        } = req.query;

        const filter = { 
            organization: organizationId,
            isActive: isActive === 'true'
        };
        
        if (type) filter.type = type;
        if (category) filter.category = category;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const accounts = await Account.find(filter)
            .sort('code')
            .skip(skip)
            .limit(parseInt(limit))
            .populate('parentAccount', 'code name');

        const total = await Account.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: accounts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch accounts'
        });
    }
};

// @desc    Get single account
// @route   GET /api/finance/accounts/:id
// @access  Private (requires finance.account_view)
const getAccount = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const account = await Account.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('parentAccount', 'code name')
        .populate('createdBy', 'firstName lastName');

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Account not found'
            });
        }

        // Get current balance
        const balance = await account.getBalance();

        res.status(200).json({
            success: true,
            data: {
                ...account.toObject(),
                currentBalance: balance
            }
        });
    } catch (error) {
        console.error('Get account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch account'
        });
    }
};

// @desc    Create account
// @route   POST /api/finance/accounts
// @access  Private (requires finance.account_create)
const createAccount = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        // Check if code already exists
        const existingAccount = await Account.findOne({
            organization: organizationId,
            code: req.body.code
        });

        if (existingAccount) {
            return res.status(400).json({
                success: false,
                message: 'Account code already exists'
            });
        }

        const accountData = {
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId
        };

        const account = await Account.create(accountData);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'account_created',
            target: account._id,
            details: {
                code: account.code,
                name: account.name,
                type: account.type
            }
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
            message: error.message || 'Failed to create account'
        });
    }
};

// @desc    Update account
// @route   PUT /api/finance/accounts/:id
// @access  Private (requires finance.account_update)
const updateAccount = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const account = await Account.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                isSystem: false // Prevent updating system accounts
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Account not found or cannot be updated'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'account_updated',
            target: account._id,
            details: {
                code: account.code,
                name: account.name
            }
        });

        res.status(200).json({
            success: true,
            message: 'Account updated successfully',
            data: account
        });
    } catch (error) {
        console.error('Update account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update account'
        });
    }
};

// @desc    Delete account (deactivate)
// @route   DELETE /api/finance/accounts/:id
// @access  Private (requires finance.account_delete)
const deleteAccount = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        // Check if account has any transactions
        const JournalEntry = require('../../models/finance/journalEntry.model');
        const hasTransactions = await JournalEntry.exists({
            organization: organizationId,
            'lines.account': req.params.id
        });

        if (hasTransactions) {
            // Soft delete - just deactivate
            const account = await Account.findOneAndUpdate(
                { 
                    _id: req.params.id,
                    organization: organizationId,
                    isSystem: false
                },
                { isActive: false },
                { new: true }
            );

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Account not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Account deactivated successfully'
            });
        } else {
            // Hard delete - no transactions
            const account = await Account.findOneAndDelete({
                _id: req.params.id,
                organization: organizationId,
                isSystem: false
            });

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Account not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Account deleted successfully'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'account_deleted',
            target: req.params.id
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete account'
        });
    }
};

// @desc    Get chart of accounts
// @route   GET /api/finance/accounts/chart
// @access  Private (requires finance.account_view)
const getChartOfAccounts = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const accounts = await Account.getChartOfAccounts(organizationId);
        
        // Organize hierarchically
        const rootAccounts = accounts.filter(a => !a.parentAccount);
        const chart = rootAccounts.map(account => buildAccountTree(account, accounts));

        res.status(200).json({
            success: true,
            data: chart
        });
    } catch (error) {
        console.error('Get chart of accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chart of accounts'
        });
    }
};

// @desc    Get trial balance
// @route   GET /api/finance/accounts/trial-balance
// @access  Private (requires finance.account_view)
const getTrialBalance = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { asOfDate } = req.query;
        
        const trialBalance = await Account.getTrialBalance(
            organizationId, 
            asOfDate ? new Date(asOfDate) : new Date()
        );

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
            message: 'Failed to fetch trial balance'
        });
    }
};

// Helper function to build account tree
function buildAccountTree(account, allAccounts) {
    const children = allAccounts.filter(a => 
        a.parentAccount && a.parentAccount.toString() === account._id.toString()
    );
    
    return {
        ...account.toObject(),
        children: children.map(child => buildAccountTree(child, allAccounts))
    };
}

module.exports = {
    getAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    getChartOfAccounts,
    getTrialBalance
};