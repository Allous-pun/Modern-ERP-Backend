// src/controllers/finance/financialReports.controller.js
const FinancialReportsService = require('../../services/finance/financialReports.service');

/**
 * @desc    Get Income Statement
 * @route   GET /api/finance/reports/income-statement
 * @access  Private (requires finance.reports_view)
 */
const getIncomeStatement = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required'
            });
        }
        
        const statement = await FinancialReportsService.getIncomeStatement(
            req.user.organizationId,
            startDate,
            endDate
        );
        
        res.status(200).json({
            success: true,
            data: statement
        });
        
    } catch (error) {
        console.error('Get income statement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate income statement'
        });
    }
};

/**
 * @desc    Get Balance Sheet
 * @route   GET /api/finance/reports/balance-sheet
 * @access  Private (requires finance.reports_view)
 */
const getBalanceSheet = async (req, res) => {
    try {
        const { asOfDate } = req.query;
        
        if (!asOfDate) {
            return res.status(400).json({
                success: false,
                message: 'asOfDate is required'
            });
        }
        
        const balanceSheet = await FinancialReportsService.getBalanceSheet(
            req.user.organizationId,
            asOfDate
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

/**
 * @desc    Get Cash Flow Statement
 * @route   GET /api/finance/reports/cash-flow
 * @access  Private (requires finance.reports_view)
 */
const getCashFlowStatement = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required'
            });
        }
        
        const cashFlow = await FinancialReportsService.getCashFlowStatement(
            req.user.organizationId,
            startDate,
            endDate
        );
        
        res.status(200).json({
            success: true,
            data: cashFlow
        });
        
    } catch (error) {
        console.error('Get cash flow statement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate cash flow statement'
        });
    }
};

module.exports = {
    getIncomeStatement,
    getBalanceSheet,
    getCashFlowStatement
};
