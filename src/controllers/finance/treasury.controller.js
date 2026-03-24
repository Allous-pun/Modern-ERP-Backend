// src/controllers/finance/treasury.controller.js
const TreasuryService = require('../../services/finance/treasury.service');

/**
 * @desc    Create bank account
 * @route   POST /api/finance/treasury/bank-accounts
 * @access  Private (requires finance.bank_create)
 */
const createBankAccount = async (req, res) => {
    try {
        const {
            accountName, accountNumber, bankName, bankCode, branchName,
            swiftCode, iban, accountType, currency, openingBalance,
            isDefault
        } = req.body;
        
        if (!accountName || !accountNumber || !bankName) {
            return res.status(400).json({
                success: false,
                message: 'accountName, accountNumber, and bankName are required'
            });
        }
        
        const account = await TreasuryService.createBankAccount({
            accountName,
            accountNumber,
            bankName,
            bankCode,
            branchName,
            swiftCode,
            iban,
            accountType,
            currency,
            openingBalance,
            isDefault
        }, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(201).json({
            success: true,
            message: 'Bank account created successfully',
            data: account
        });
        
    } catch (error) {
        console.error('Create bank account error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create bank account'
        });
    }
};

/**
 * @desc    Get bank accounts
 * @route   GET /api/finance/treasury/bank-accounts
 * @access  Private (requires finance.bank_view)
 */
const getBankAccounts = async (req, res) => {
    try {
        const { isActive, currency, search, page = 1, limit = 50 } = req.query;
        
        const result = await TreasuryService.getBankAccounts({
            isActive,
            currency,
            search
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
        console.error('Get bank accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bank accounts'
        });
    }
};

/**
 * @desc    Get bank account by ID
 * @route   GET /api/finance/treasury/bank-accounts/:id
 * @access  Private (requires finance.bank_view)
 */
const getBankAccountById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const account = await TreasuryService.getBankAccountById(id, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            data: account
        });
        
    } catch (error) {
        console.error('Get bank account error:', error);
        res.status(404).json({
            success: false,
            message: error.message || 'Bank account not found'
        });
    }
};

/**
 * @desc    Update bank account
 * @route   PUT /api/finance/treasury/bank-accounts/:id
 * @access  Private (requires finance.bank_update)
 */
const updateBankAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const account = await TreasuryService.updateBankAccount(id, updateData, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Bank account updated successfully',
            data: account
        });
        
    } catch (error) {
        console.error('Update bank account error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update bank account'
        });
    }
};

/**
 * @desc    Delete bank account
 * @route   DELETE /api/finance/treasury/bank-accounts/:id
 * @access  Private (requires finance.bank_update)
 */
const deleteBankAccount = async (req, res) => {
    try {
        const { id } = req.params;
        
        const account = await TreasuryService.deleteBankAccount(id, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Bank account deleted successfully',
            data: account
        });
        
    } catch (error) {
        console.error('Delete bank account error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to delete bank account'
        });
    }
};

/**
 * @desc    Get cash position
 * @route   GET /api/finance/treasury/cash-position
 * @access  Private (requires finance.bank_view)
 */
const getCashPosition = async (req, res) => {
    try {
        const { asOfDate } = req.query;
        
        const position = await TreasuryService.getCashPosition(
            req.user.organizationId,
            asOfDate ? new Date(asOfDate) : new Date()
        );
        
        res.status(200).json({
            success: true,
            data: position
        });
        
    } catch (error) {
        console.error('Get cash position error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cash position'
        });
    }
};

/**
 * @desc    Create reconciliation
 * @route   POST /api/finance/treasury/reconciliations
 * @access  Private (requires finance.bank_reconcile)
 */
const createReconciliation = async (req, res) => {
    try {
        const { bankAccount, statementDate, statementBalance, clearedTransactions, notes } = req.body;
        
        if (!bankAccount || !statementDate || statementBalance === undefined) {
            return res.status(400).json({
                success: false,
                message: 'bankAccount, statementDate, and statementBalance are required'
            });
        }
        
        const reconciliation = await TreasuryService.createReconciliation({
            bankAccount,
            statementDate,
            statementBalance,
            clearedTransactions,
            notes
        }, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(201).json({
            success: true,
            message: 'Reconciliation created successfully',
            data: reconciliation
        });
        
    } catch (error) {
        console.error('Create reconciliation error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create reconciliation'
        });
    }
};

/**
 * @desc    Get reconciliations
 * @route   GET /api/finance/treasury/reconciliations
 * @access  Private (requires finance.bank_view)
 */
const getReconciliations = async (req, res) => {
    try {
        const { bankAccount, status, startDate, endDate, page = 1, limit = 50 } = req.query;
        
        const result = await TreasuryService.getReconciliations({
            bankAccount,
            status,
            startDate,
            endDate
        }, req.user.organizationId, page, limit);
        
        res.status(200).json({
            success: true,
            count: result.reconciliations.length,
            total: result.total,
            page: result.page,
            pages: result.pages,
            data: result.reconciliations
        });
        
    } catch (error) {
        console.error('Get reconciliations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reconciliations'
        });
    }
};

/**
 * @desc    Post reconciliation
 * @route   POST /api/finance/treasury/reconciliations/:id/post
 * @access  Private (requires finance.bank_reconcile)
 */
const postReconciliation = async (req, res) => {
    try {
        const { id } = req.params;
        
        const reconciliation = await TreasuryService.postReconciliation(id, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Reconciliation posted successfully',
            data: reconciliation
        });
        
    } catch (error) {
        console.error('Post reconciliation error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to post reconciliation'
        });
    }
};

/**
 * @desc    Create cash flow forecast
 * @route   POST /api/finance/treasury/cash-flow-forecasts
 * @access  Private (requires finance.bank_create)
 */
const createCashFlowForecast = async (req, res) => {
    try {
        const { startDate, endDate, periodType, inflows, outflows, beginningBalance } = req.body;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required'
            });
        }
        
        const forecast = await TreasuryService.createCashFlowForecast({
            startDate,
            endDate,
            periodType,
            inflows,
            outflows,
            beginningBalance
        }, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(201).json({
            success: true,
            message: 'Cash flow forecast created successfully',
            data: forecast
        });
        
    } catch (error) {
        console.error('Create cash flow forecast error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create cash flow forecast'
        });
    }
};

/**
 * @desc    Get cash flow forecasts
 * @route   GET /api/finance/treasury/cash-flow-forecasts
 * @access  Private (requires finance.bank_view)
 */
const getCashFlowForecasts = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        
        const result = await TreasuryService.getCashFlowForecasts(req.user.organizationId, page, limit);
        
        res.status(200).json({
            success: true,
            count: result.forecasts.length,
            total: result.total,
            page: result.page,
            pages: result.pages,
            data: result.forecasts
        });
        
    } catch (error) {
        console.error('Get cash flow forecasts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cash flow forecasts'
        });
    }
};

module.exports = {
    createBankAccount,
    getBankAccounts,
    getBankAccountById,
    updateBankAccount,
    deleteBankAccount,
    getCashPosition,
    createReconciliation,
    getReconciliations,
    postReconciliation,
    createCashFlowForecast,
    getCashFlowForecasts
};
