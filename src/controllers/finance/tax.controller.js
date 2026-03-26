// src/controllers/finance/tax.controller.js
const TaxService = require('../../services/finance/tax.service');

/**
 * @desc    Create tax rate
 * @route   POST /api/finance/tax/rates
 * @access  Private (requires finance.tax_create)
 */
const createTaxRate = async (req, res) => {
    try {
        const {
            name, code, type, rate, appliesTo, isCompound,
            threshold, taxPayableAccount, taxExpenseAccount,
            effectiveFrom, effectiveTo
        } = req.body;
        
        if (!name || !code || !type || rate === undefined || !taxPayableAccount) {
            return res.status(400).json({
                success: false,
                message: 'name, code, type, rate, and taxPayableAccount are required'
            });
        }
        
        const taxRate = await TaxService.createTaxRate({
            name,
            code: code.toUpperCase(),
            type,
            rate,
            appliesTo,
            isCompound,
            threshold,
            taxPayableAccount,
            taxExpenseAccount,
            effectiveFrom,
            effectiveTo
        }, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(201).json({
            success: true,
            message: 'Tax rate created successfully',
            data: taxRate
        });
        
    } catch (error) {
        console.error('Create tax rate error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create tax rate'
        });
    }
};

/**
 * @desc    Get tax rates
 * @route   GET /api/finance/tax/rates
 * @access  Private (requires finance.tax_view)
 */
const getTaxRates = async (req, res) => {
    try {
        const { type, isActive, search, page = 1, limit = 50 } = req.query;
        
        const result = await TaxService.getTaxRates({
            type,
            isActive,
            search
        }, req.user.organizationId, page, limit);
        
        res.status(200).json({
            success: true,
            count: result.taxRates.length,
            total: result.total,
            page: result.page,
            pages: result.pages,
            data: result.taxRates
        });
        
    } catch (error) {
        console.error('Get tax rates error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tax rates'
        });
    }
};

/**
 * @desc    Get tax rate by ID
 * @route   GET /api/finance/tax/rates/:id
 * @access  Private (requires finance.tax_view)
 */
const getTaxRateById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const taxRate = await TaxService.getTaxRateById(id, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            data: taxRate
        });
        
    } catch (error) {
        console.error('Get tax rate error:', error);
        res.status(404).json({
            success: false,
            message: error.message || 'Tax rate not found'
        });
    }
};

/**
 * @desc    Update tax rate
 * @route   PUT /api/finance/tax/rates/:id
 * @access  Private (requires finance.tax_update)
 */
const updateTaxRate = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const taxRate = await TaxService.updateTaxRate(id, updateData, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Tax rate updated successfully',
            data: taxRate
        });
        
    } catch (error) {
        console.error('Update tax rate error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update tax rate'
        });
    }
};

/**
 * @desc    Delete tax rate
 * @route   DELETE /api/finance/tax/rates/:id
 * @access  Private (requires finance.tax_update)
 */
const deleteTaxRate = async (req, res) => {
    try {
        const { id } = req.params;
        
        const taxRate = await TaxService.deleteTaxRate(id, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Tax rate deactivated successfully',
            data: taxRate
        });
        
    } catch (error) {
        console.error('Delete tax rate error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to deactivate tax rate'
        });
    }
};

/**
 * @desc    Get active tax rates
 * @route   GET /api/finance/tax/active
 * @access  Private (requires finance.tax_view)
 */
const getActiveTaxRates = async (req, res) => {
    try {
        const { type } = req.query;
        
        const taxRates = await TaxService.getActiveTaxRates(req.user.organizationId, type);
        
        res.status(200).json({
            success: true,
            count: taxRates.length,
            data: taxRates
        });
        
    } catch (error) {
        console.error('Get active tax rates error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch active tax rates'
        });
    }
};

/**
 * @desc    Calculate tax
 * @route   POST /api/finance/tax/calculate
 * @access  Private (requires finance.tax_view)
 */
const calculateTax = async (req, res) => {
    try {
        const { amount, taxRateCode } = req.body;
        
        if (!amount || !taxRateCode) {
            return res.status(400).json({
                success: false,
                message: 'amount and taxRateCode are required'
            });
        }
        
        const result = await TaxService.calculateTax(amount, taxRateCode, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Calculate tax error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to calculate tax'
        });
    }
};

/**
 * @desc    Create tax return
 * @route   POST /api/finance/tax/returns
 * @access  Private (requires finance.tax_create)
 */
const createTaxReturn = async (req, res) => {
    try {
        const {
            taxType, periodStart, periodEnd, filingDate,
            taxableSales, taxCollected, taxablePurchases, taxPaid, netTaxPayable, notes
        } = req.body;
        
        if (!taxType || !periodStart || !periodEnd || !filingDate) {
            return res.status(400).json({
                success: false,
                message: 'taxType, periodStart, periodEnd, and filingDate are required'
            });
        }
        
        const taxReturn = await TaxService.createTaxReturn({
            taxType,
            periodStart,
            periodEnd,
            filingDate,
            taxableSales,
            taxCollected,
            taxablePurchases,
            taxPaid,
            netTaxPayable,
            notes
        }, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(201).json({
            success: true,
            message: 'Tax return created successfully',
            data: taxReturn
        });
        
    } catch (error) {
        console.error('Create tax return error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create tax return'
        });
    }
};

/**
 * @desc    Get tax returns
 * @route   GET /api/finance/tax/returns
 * @access  Private (requires finance.tax_view)
 */
const getTaxReturns = async (req, res) => {
    try {
        const { taxType, status, startDate, endDate, page = 1, limit = 50 } = req.query;
        
        const result = await TaxService.getTaxReturns({
            taxType,
            status,
            startDate,
            endDate
        }, req.user.organizationId, page, limit);
        
        res.status(200).json({
            success: true,
            count: result.taxReturns.length,
            total: result.total,
            page: result.page,
            pages: result.pages,
            data: result.taxReturns
        });
        
    } catch (error) {
        console.error('Get tax returns error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tax returns'
        });
    }
};

/**
 * @desc    File tax return
 * @route   POST /api/finance/tax/returns/:id/file
 * @access  Private (requires finance.tax_approve)
 */
const fileTaxReturn = async (req, res) => {
    try {
        const { id } = req.params;
        
        const taxReturn = await TaxService.fileTaxReturn(id, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Tax return filed successfully',
            data: taxReturn
        });
        
    } catch (error) {
        console.error('File tax return error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to file tax return'
        });
    }
};

/**
 * @desc    Get tax summary
 * @route   GET /api/finance/tax/summary
 * @access  Private (requires finance.tax_view)
 */
const getTaxSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required'
            });
        }
        
        const summary = await TaxService.getTaxSummary(req.user.organizationId, startDate, endDate);
        
        res.status(200).json({
            success: true,
            data: summary
        });
        
    } catch (error) {
        console.error('Get tax summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tax summary'
        });
    }
};

module.exports = {
    createTaxRate,
    getTaxRates,
    getTaxRateById,
    updateTaxRate,
    deleteTaxRate,
    getActiveTaxRates,
    calculateTax,
    createTaxReturn,
    getTaxReturns,
    fileTaxReturn,
    getTaxSummary
};
