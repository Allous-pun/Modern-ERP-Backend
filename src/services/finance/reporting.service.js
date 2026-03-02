// src/services/finance/reporting.service.js
const { Account, JournalEntry, Invoice } = require('../../models/finance');

/**
 * Calculate balance sheet
 */
const calculateBalanceSheet = async (organizationId, asOfDate) => {
    const accounts = await Account.find({ 
        organization: organizationId,
        isActive: true 
    });

    const balanceSheet = {
        asOfDate,
        assets: [],
        liabilities: [],
        equity: [],
        totals: {
            assets: 0,
            liabilities: 0,
            equity: 0
        }
    };

    for (const account of accounts) {
        const balance = await account.getBalance(null, asOfDate);
        
        if (account.type === 'asset' || account.type === 'contra_asset') {
            balanceSheet.assets.push({
                code: account.code,
                name: account.name,
                balance: account.type === 'contra_asset' ? -balance : balance
            });
            balanceSheet.totals.assets += account.type === 'contra_asset' ? -balance : balance;
        } else if (account.type === 'liability' || account.type === 'contra_liability') {
            balanceSheet.liabilities.push({
                code: account.code,
                name: account.name,
                balance: account.type === 'contra_liability' ? -balance : balance
            });
            balanceSheet.totals.liabilities += account.type === 'contra_liability' ? -balance : balance;
        } else if (account.type === 'equity') {
            balanceSheet.equity.push({
                code: account.code,
                name: account.name,
                balance
            });
            balanceSheet.totals.equity += balance;
        }
    }

    // Calculate net income for period
    const netIncome = await calculateNetIncome(organizationId, asOfDate);
    balanceSheet.equity.push({
        code: '9999',
        name: 'Retained Earnings (Net Income)',
        balance: netIncome
    });
    balanceSheet.totals.equity += netIncome;

    return balanceSheet;
};

/**
 * Calculate income statement
 */
const calculateIncomeStatement = async (organizationId, startDate, endDate) => {
    const accounts = await Account.find({ 
        organization: organizationId,
        type: { $in: ['revenue', 'expense'] },
        isActive: true 
    });

    const incomeStatement = {
        period: { startDate, endDate },
        revenue: [],
        expenses: [],
        totals: {
            revenue: 0,
            expenses: 0,
            netIncome: 0
        }
    };

    for (const account of accounts) {
        const balance = await account.getBalance(startDate, endDate);
        
        if (account.type === 'revenue') {
            incomeStatement.revenue.push({
                code: account.code,
                name: account.name,
                balance
            });
            incomeStatement.totals.revenue += balance;
        } else if (account.type === 'expense') {
            incomeStatement.expenses.push({
                code: account.code,
                name: account.name,
                balance
            });
            incomeStatement.totals.expenses += balance;
        }
    }

    incomeStatement.totals.netIncome = 
        incomeStatement.totals.revenue - incomeStatement.totals.expenses;

    return incomeStatement;
};

/**
 * Calculate cash flow statement
 */
const calculateCashFlow = async (organizationId, startDate, endDate) => {
    // Get cash accounts
    const cashAccounts = await Account.find({
        organization: organizationId,
        code: { $regex: '^1(0|1)' }, // Cash and bank accounts typically start with 10 or 11
        isActive: true
    });

    const cashAccountIds = cashAccounts.map(a => a._id);

    // Get all journal entries in period
    const entries = await JournalEntry.find({
        organization: organizationId,
        date: { $gte: startDate, $lte: endDate },
        status: 'posted'
    }).populate('lines.account');

    const cashFlow = {
        period: { startDate, endDate },
        operating: [],
        investing: [],
        financing: [],
        totals: {
            operating: 0,
            investing: 0,
            financing: 0,
            netCash: 0,
            beginningCash: 0,
            endingCash: 0
        }
    };

    // TODO: Classify cash flows by activity
    // This would require analyzing the nature of each transaction

    // Calculate beginning cash
    const beginningCash = await calculateCashBalance(organizationId, startDate);
    cashFlow.totals.beginningCash = beginningCash;

    // Calculate ending cash
    const endingCash = await calculateCashBalance(organizationId, endDate);
    cashFlow.totals.endingCash = endingCash;

    cashFlow.totals.netCash = endingCash - beginningCash;

    return cashFlow;
};

/**
 * Calculate aged receivables
 */
const calculateAgedReceivables = async (organizationId, asOfDate) => {
    const invoices = await Invoice.find({
        organization: organizationId,
        invoiceType: 'sales',
        status: { $in: ['approved', 'sent'] },
        paymentStatus: { $in: ['pending', 'partial'] },
        dueDate: { $lte: asOfDate }
    }).populate('customer');

    const aging = {
        asOfDate,
        current: [],
        days1to30: [],
        days31to60: [],
        days61to90: [],
        over90: [],
        totals: {
            current: 0,
            days1to30: 0,
            days31to60: 0,
            days61to90: 0,
            over90: 0,
            total: 0
        }
    };

    for (const invoice of invoices) {
        const daysOverdue = Math.floor((asOfDate - invoice.dueDate) / (1000 * 60 * 60 * 24));
        const amountDue = invoice.amountDue;
        
        const item = {
            invoiceNumber: invoice.invoiceNumber,
            customer: invoice.customer?.name || invoice.customerName,
            invoiceDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            daysOverdue,
            amount: amountDue,
            currency: invoice.currency
        };

        if (daysOverdue <= 0) {
            aging.current.push(item);
            aging.totals.current += amountDue;
        } else if (daysOverdue <= 30) {
            aging.days1to30.push(item);
            aging.totals.days1to30 += amountDue;
        } else if (daysOverdue <= 60) {
            aging.days31to60.push(item);
            aging.totals.days31to60 += amountDue;
        } else if (daysOverdue <= 90) {
            aging.days61to90.push(item);
            aging.totals.days61to90 += amountDue;
        } else {
            aging.over90.push(item);
            aging.totals.over90 += amountDue;
        }
    }

    aging.totals.total = aging.totals.current + aging.totals.days1to30 + 
                         aging.totals.days31to60 + aging.totals.days61to90 + 
                         aging.totals.over90;

    return aging;
};

/**
 * Calculate aged payables
 */
const calculateAgedPayables = async (organizationId, asOfDate) => {
    const invoices = await Invoice.find({
        organization: organizationId,
        invoiceType: 'purchase',
        status: { $in: ['approved', 'sent'] },
        paymentStatus: { $in: ['pending', 'partial'] },
        dueDate: { $lte: asOfDate }
    }).populate('vendor');

    const aging = {
        asOfDate,
        current: [],
        days1to30: [],
        days31to60: [],
        days61to90: [],
        over90: [],
        totals: {
            current: 0,
            days1to30: 0,
            days31to60: 0,
            days61to90: 0,
            over90: 0,
            total: 0
        }
    };

    for (const invoice of invoices) {
        const daysOverdue = Math.floor((asOfDate - invoice.dueDate) / (1000 * 60 * 60 * 24));
        const amountDue = invoice.amountDue;
        
        const item = {
            invoiceNumber: invoice.invoiceNumber,
            vendor: invoice.vendor?.name || invoice.customerName,
            invoiceDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            daysOverdue,
            amount: amountDue,
            currency: invoice.currency
        };

        if (daysOverdue <= 0) {
            aging.current.push(item);
            aging.totals.current += amountDue;
        } else if (daysOverdue <= 30) {
            aging.days1to30.push(item);
            aging.totals.days1to30 += amountDue;
        } else if (daysOverdue <= 60) {
            aging.days31to60.push(item);
            aging.totals.days31to60 += amountDue;
        } else if (daysOverdue <= 90) {
            aging.days61to90.push(item);
            aging.totals.days61to90 += amountDue;
        } else {
            aging.over90.push(item);
            aging.totals.over90 += amountDue;
        }
    }

    aging.totals.total = aging.totals.current + aging.totals.days1to30 + 
                         aging.totals.days31to60 + aging.totals.days61to90 + 
                         aging.totals.over90;

    return aging;
};

/**
 * Calculate net income for period
 */
const calculateNetIncome = async (organizationId, asOfDate) => {
    const startOfYear = new Date(asOfDate.getFullYear(), 0, 1);
    
    const revenueAccounts = await Account.find({
        organization: organizationId,
        type: 'revenue',
        isActive: true
    });

    const expenseAccounts = await Account.find({
        organization: organizationId,
        type: 'expense',
        isActive: true
    });

    let revenue = 0;
    let expenses = 0;

    for (const account of revenueAccounts) {
        revenue += await account.getBalance(startOfYear, asOfDate);
    }

    for (const account of expenseAccounts) {
        expenses += await account.getBalance(startOfYear, asOfDate);
    }

    return revenue - expenses;
};

/**
 * Calculate cash balance
 */
const calculateCashBalance = async (organizationId, asOfDate) => {
    const cashAccounts = await Account.find({
        organization: organizationId,
        code: { $regex: '^1(0|1)' },
        isActive: true
    });

    let balance = 0;

    for (const account of cashAccounts) {
        balance += await account.getBalance(null, asOfDate);
    }

    return balance;
};

module.exports = {
    calculateBalanceSheet,
    calculateIncomeStatement,
    calculateCashFlow,
    calculateAgedReceivables,
    calculateAgedPayables,
    calculateNetIncome,
    calculateCashBalance
};