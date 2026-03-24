// src/controllers/finance/account.controller.js
const AccountService = require('../../services/finance/account.service');
const { ACCOUNT_TYPES, ACCOUNT_CATEGORIES } = require('../../models/finance/account.model');

/**
 * @desc    Create new account
 * @route   POST /api/finance/accounts
 * @access  Private (requires finance.account_manage OR finance.chart_of_accounts_manage)
 */

const createAccount = async (req, res) => {
    try {
        const {
            code, name, description, type, category, parentAccount,
            isControlAccount, isReconcilable, currency, openingBalance,
            bankDetails, taxCode, isTaxApplicable, reportCode, displayOrder
        } = req.body;
        
        // Validate required fields
        if (!code || !name || !type || !category) {
            return res.status(400).json({
                success: false,
                message: 'code, name, type, and category are required'
            });
        }
        
        const account = await AccountService.createAccount({
            code, name, description, type, category, parentAccount,
            isControlAccount, isReconcilable, currency, openingBalance,
            bankDetails, taxCode, isTaxApplicable, reportCode, displayOrder
        }, {
            id: req.user.id,  // CHANGE: req.member.id → req.user.id
            email: req.user.email,  // CHANGE: req.member.personalInfo?.email → req.user.email
            name: req.user.displayName  // CHANGE: use displayName or build from firstName/lastName
        }, req.user.organizationId);  // CHANGE: req.organization.id → req.user.organizationId
        
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: account
        });
        
    } catch (error) {
        console.error('Create account error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create account'
        });
    }
};

/**
 * @desc    Get all accounts
 * @route   GET /api/finance/accounts
 * @access  Private (requires finance.account_view OR finance.chart_of_accounts_view)
 */
const getAccounts = async (req, res) => {
    try {
        const {
            type, category, isActive, search,
            page = 1, limit = 50
        } = req.query;
        
        const result = await AccountService.getAccounts({
            type, category, isActive, search
        }, req.user.organizationId, page, limit);
        
        res.status(200).json({
            success: true,
            count: result.accounts.length,
            total: result.total,
            page: result.page,
            pages: result.pages,
            data: result.accounts
        });
        
    } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch accounts'
        });
    }
};

/**
 * @desc    Get account by ID
 * @route   GET /api/finance/accounts/:id
 * @access  Private (requires finance.account_view)
 */
const getAccountById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const account = await AccountService.getAccountById(id, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            data: account
        });
        
    } catch (error) {
        console.error('Get account error:', error);
        res.status(404).json({
            success: false,
            message: error.message || 'Account not found'
        });
    }
};

/**
 * @desc    Update account
 * @route   PUT /api/finance/accounts/:id
 * @access  Private (requires finance.account_manage OR finance.chart_of_accounts_manage)
 */
const updateAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const account = await AccountService.updateAccount(id, updateData, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Account updated successfully',
            data: account
        });
        
    } catch (error) {
        console.error('Update account error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update account'
        });
    }
};

/**
 * @desc    Delete account (soft delete)
 * @route   DELETE /api/finance/accounts/:id
 * @access  Private (requires finance.account_manage)
 */
const deleteAccount = async (req, res) => {
    try {
        const { id } = req.params;
        
        const account = await AccountService.deleteAccount(id, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Account deleted successfully',
            data: account
        });
        
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to delete account'
        });
    }
};

/**
 * @desc    Get chart of accounts (hierarchical)
 * @route   GET /api/finance/accounts/chart
 * @access  Private (requires finance.chart_of_accounts_view)
 */
const getChartOfAccounts = async (req, res) => {
    try {
        const chart = await AccountService.getChartOfAccounts(req.user.organizationId);
        
        res.status(200).json({
            success: true,
            count: chart.length,
            data: chart
        });
        
    } catch (error) {
        console.error('Get chart error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chart of accounts'
        });
    }
};

/**
 * @desc    Get accounts by type
 * @route   GET /api/finance/accounts/type/:type
 * @access  Private (requires finance.account_view)
 */
const getAccountsByType = async (req, res) => {
    try {
        const { type } = req.params;
        
        if (!Object.values(ACCOUNT_TYPES).includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid account type. Must be one of: ${Object.values(ACCOUNT_TYPES).join(', ')}`
            });
        }
        
        const accounts = await AccountService.getAccountsByType(req.user.organizationId, type);
        
        res.status(200).json({
            success: true,
            count: accounts.length,
            data: accounts
        });
        
    } catch (error) {
        console.error('Get accounts by type error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch accounts'
        });
    }
};

/**
 * @desc    Activate account
 * @route   POST /api/finance/accounts/:id/activate
 * @access  Private (requires finance.account_manage)
 */
const activateAccount = async (req, res) => {
    try {
        const { id } = req.params;
        
        const account = await AccountService.toggleAccountStatus(id, true, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Account activated successfully',
            data: account
        });
        
    } catch (error) {
        console.error('Activate account error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to activate account'
        });
    }
};
/**
 * @desc    Deactivate account
 * @route   POST /api/finance/accounts/:id/deactivate
 * @access  Private (requires finance.account_manage)
 */
const deactivateAccount = async (req, res) => {
    try {
        const { id } = req.params;
        
        const account = await AccountService.toggleAccountStatus(id, false, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Account deactivated successfully',
            data: account
        });
        
    } catch (error) {
        console.error('Deactivate account error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to deactivate account'
        });
    }
};

/**
 * @desc    Get account types and categories (for frontend reference)
 * @route   GET /api/finance/accounts/metadata
 * @access  Private
 */
const getAccountMetadata = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            data: {
                accountTypes: ACCOUNT_TYPES,
                accountCategories: ACCOUNT_CATEGORIES
            }
        });
        
    } catch (error) {
        console.error('Get metadata error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch metadata'
        });
    }
};

module.exports = {
    createAccount,
    getAccounts,
    getAccountById,
    updateAccount,
    deleteAccount,
    getChartOfAccounts,
    getAccountsByType,
    activateAccount,
    deactivateAccount,
    getAccountMetadata
};