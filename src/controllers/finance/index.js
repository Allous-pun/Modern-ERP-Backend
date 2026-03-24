// src/controllers/finance/index.js
const invoiceController = require('./invoice.controller');
const journalController = require('./journal.controller');
const accountController = require('./account.controller');
const reportController = require('./report.controller');
const budgetController = require('./budget.controller');
const taxController = require('./tax.controller');
const assetController = require('./asset.controller');
const treasuryController = require('./treasury.controller');

module.exports = {
    // Invoice controllers
    getInvoices: invoiceController.getInvoices,
    getInvoice: invoiceController.getInvoice,
    createInvoice: invoiceController.createInvoice,
    updateInvoice: invoiceController.updateInvoice,
    deleteInvoice: invoiceController.deleteInvoice,
    approveInvoice: invoiceController.approveInvoice,
    voidInvoice: invoiceController.voidInvoice,
    sendInvoice: invoiceController.sendInvoice,
    
    // Journal Entry controllers
    getJournalEntries: journalController.getJournalEntries,
    getJournalEntry: journalController.getJournalEntry,
    createJournalEntry: journalController.createJournalEntry,
    updateJournalEntry: journalController.updateJournalEntry,
    postJournalEntry: journalController.postJournalEntry,
    reverseJournalEntry: journalController.reverseJournalEntry,
    
    // Account controllers
    getAccounts: accountController.getAccounts,
    getAccount: accountController.getAccount,
    createAccount: accountController.createAccount,
    updateAccount: accountController.updateAccount,
    deleteAccount: accountController.deleteAccount,
    getChartOfAccounts: accountController.getChartOfAccounts,
    getTrialBalance: accountController.getTrialBalance,
    
    // Report controllers
    getBalanceSheet: reportController.getBalanceSheet,
    getIncomeStatement: reportController.getIncomeStatement,
    getCashFlowStatement: reportController.getCashFlowStatement,
    getTrialBalanceReport: reportController.getTrialBalanceReport,
    getGeneralLedger: reportController.getGeneralLedger,
    getAgedReceivables: reportController.getAgedReceivables,
    getAgedPayables: reportController.getAgedPayables,
    
    // Budget controllers
    getBudgets: budgetController.getBudgets,
    getBudget: budgetController.getBudget,
    createBudget: budgetController.createBudget,
    updateBudget: budgetController.updateBudget,
    deleteBudget: budgetController.deleteBudget,
    getBudgetVsActual: budgetController.getBudgetVsActual,
    
    // Tax controllers
    getTaxRates: taxController.getTaxRates,
    createTaxRate: taxController.createTaxRate,
    updateTaxRate: taxController.updateTaxRate,
    getTaxReturns: taxController.getTaxReturns,
    fileTaxReturn: taxController.fileTaxReturn,
    
    // Asset controllers
    getAssets: assetController.getAssets,
    getAsset: assetController.getAsset,
    createAsset: assetController.createAsset,
    updateAsset: assetController.updateAsset,
    disposeAsset: assetController.disposeAsset,
    calculateAssetDepreciation: assetController.calculateAssetDepreciation,
    
    // Treasury controllers
    getBankAccounts: treasuryController.getBankAccounts,
    createBankAccount: treasuryController.createBankAccount,
    getCashFlows: treasuryController.getCashFlows,
    getForecast: treasuryController.getForecast,
    reconcileBank: treasuryController.reconcileBank
};