// src/routes/finance.routes.js
const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { requireModule } = require('../middleware/module.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const financeController = require('../controllers/finance');

const router = express.Router();

// All finance routes require:
// 1. Authentication (protect)
// 2. Finance module installed (requireModule)
router.use(protect);
router.use(requireModule('finance'));

// ========== INVOICE ROUTES ==========
router.get('/invoices',
    requirePermission('finance.invoice_view'),
    financeController.getInvoices
);

router.get('/invoices/:id',
    requirePermission('finance.invoice_view'),
    financeController.getInvoice
);

router.post('/invoices',
    requirePermission('finance.invoice_create'),
    financeController.createInvoice
);

router.put('/invoices/:id',
    requirePermission('finance.invoice_update'),
    financeController.updateInvoice
);

router.delete('/invoices/:id',
    requirePermission('finance.invoice_delete'),
    financeController.deleteInvoice
);

router.post('/invoices/:id/approve',
    requirePermission('finance.invoice_approve'),
    financeController.approveInvoice
);

router.post('/invoices/:id/void',
    requirePermission('finance.invoice_manage'),
    financeController.voidInvoice
);

router.post('/invoices/:id/send',
    requirePermission('finance.invoice_manage'),
    financeController.sendInvoice
);

// ========== JOURNAL ENTRY ROUTES ==========
router.get('/journals',
    requirePermission('finance.journal_view'),
    financeController.getJournalEntries
);

router.get('/journals/:id',
    requirePermission('finance.journal_view'),
    financeController.getJournalEntry
);

router.post('/journals',
    requirePermission('finance.journal_create'),
    financeController.createJournalEntry
);

router.put('/journals/:id',
    requirePermission('finance.journal_update'),
    financeController.updateJournalEntry
);

router.post('/journals/:id/post',
    requirePermission('finance.journal_post'),
    financeController.postJournalEntry
);

router.post('/journals/:id/reverse',
    requirePermission('finance.journal_manage'),
    financeController.reverseJournalEntry
);

// ========== ACCOUNT ROUTES ==========
router.get('/accounts',
    requirePermission('finance.account_view'),
    financeController.getAccounts
);

router.get('/accounts/chart',
    requirePermission('finance.account_view'),
    financeController.getChartOfAccounts
);

router.get('/accounts/trial-balance',
    requirePermission('finance.account_view'),
    financeController.getTrialBalance
);

router.get('/accounts/:id',
    requirePermission('finance.account_view'),
    financeController.getAccount
);

router.post('/accounts',
    requirePermission('finance.account_create'),
    financeController.createAccount
);

router.put('/accounts/:id',
    requirePermission('finance.account_update'),
    financeController.updateAccount
);

router.delete('/accounts/:id',
    requirePermission('finance.account_delete'),
    financeController.deleteAccount
);

// ========== FINANCIAL REPORTS ==========
router.get('/reports/balance-sheet',
    requirePermission('finance.balance_sheet_view'),
    financeController.getBalanceSheet
);

router.get('/reports/income-statement',
    requirePermission('finance.income_statement_view'),
    financeController.getIncomeStatement
);

router.get('/reports/cash-flow',
    requirePermission('finance.cash_flow_view'),
    financeController.getCashFlowStatement
);

router.get('/reports/trial-balance',
    requirePermission('finance.reports_view'),
    financeController.getTrialBalanceReport
);

router.get('/reports/general-ledger',
    requirePermission('finance.reports_view'),
    financeController.getGeneralLedger
);

router.get('/reports/aged-receivables',
    requirePermission('finance.reports_view'),
    financeController.getAgedReceivables
);

router.get('/reports/aged-payables',
    requirePermission('finance.reports_view'),
    financeController.getAgedPayables
);

module.exports = router;