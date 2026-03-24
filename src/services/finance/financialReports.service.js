// src/services/finance/financialReports.service.js
const mongoose = require('mongoose');
const { Account } = require('../../models/finance/account.model');
const JournalEntry = require('../../models/finance/journalEntry.model');

class FinancialReportsService {
    /**
     * Get Income Statement (Profit & Loss)
     */
    static async getIncomeStatement(organizationId, startDate, endDate) {
        // Get all revenue and expense accounts
        const revenueAccounts = await Account.find({
            organization: organizationId,
            type: 'revenue',
            isActive: true,
            deletedAt: null
        });

        const expenseAccounts = await Account.find({
            organization: organizationId,
            type: 'expense',
            isActive: true,
            deletedAt: null
        });

        // Get posted journal entries in date range
        const journalEntries = await JournalEntry.find({
            organization: organizationId,
            status: 'posted',
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });

        // Calculate revenue totals
        const revenue = {};
        let totalRevenue = 0;
        
        for (const account of revenueAccounts) {
            let balance = 0;
            for (const entry of journalEntries) {
                for (const line of entry.entries) {
                    if (line.account.toString() === account._id.toString()) {
                        // Revenue accounts increase with credits
                        balance += (line.credit || 0) - (line.debit || 0);
                    }
                }
            }
            revenue[account._id] = {
                code: account.code,
                name: account.name,
                amount: balance
            };
            totalRevenue += balance;
        }

        // Calculate expense totals
        const expenses = {};
        let totalExpenses = 0;
        
        for (const account of expenseAccounts) {
            let balance = 0;
            for (const entry of journalEntries) {
                for (const line of entry.entries) {
                    if (line.account.toString() === account._id.toString()) {
                        // Expense accounts increase with debits
                        balance += (line.debit || 0) - (line.credit || 0);
                    }
                }
            }
            expenses[account._id] = {
                code: account.code,
                name: account.name,
                amount: balance
            };
            totalExpenses += balance;
        }

        return {
            period: {
                startDate,
                endDate
            },
            revenue: {
                items: Object.values(revenue),
                total: totalRevenue
            },
            expenses: {
                items: Object.values(expenses),
                total: totalExpenses
            },
            netIncome: totalRevenue - totalExpenses
        };
    }

    /**
     * Get Balance Sheet
     */
    static async getBalanceSheet(organizationId, asOfDate) {
        // Get all asset, liability, and equity accounts
        const assetAccounts = await Account.find({
            organization: organizationId,
            type: 'asset',
            isActive: true,
            deletedAt: null
        });

        const liabilityAccounts = await Account.find({
            organization: organizationId,
            type: 'liability',
            isActive: true,
            deletedAt: null
        });

        const equityAccounts = await Account.find({
            organization: organizationId,
            type: 'equity',
            isActive: true,
            deletedAt: null
        });

        // Get all posted journal entries up to asOfDate
        const journalEntries = await JournalEntry.find({
            organization: organizationId,
            status: 'posted',
            date: { $lte: new Date(asOfDate) }
        });

        // Calculate asset balances
        const assets = {};
        let totalAssets = 0;
        
        for (const account of assetAccounts) {
            let balance = 0;
            for (const entry of journalEntries) {
                for (const line of entry.entries) {
                    if (line.account.toString() === account._id.toString()) {
                        // Asset accounts increase with debits
                        balance += (line.debit || 0) - (line.credit || 0);
                    }
                }
            }
            assets[account._id] = {
                code: account.code,
                name: account.name,
                amount: balance
            };
            totalAssets += balance;
        }

        // Calculate liability balances
        const liabilities = {};
        let totalLiabilities = 0;
        
        for (const account of liabilityAccounts) {
            let balance = 0;
            for (const entry of journalEntries) {
                for (const line of entry.entries) {
                    if (line.account.toString() === account._id.toString()) {
                        // Liability accounts increase with credits
                        balance += (line.credit || 0) - (line.debit || 0);
                    }
                }
            }
            liabilities[account._id] = {
                code: account.code,
                name: account.name,
                amount: balance
            };
            totalLiabilities += balance;
        }

        // Calculate equity balances
        const equity = {};
        let totalEquity = 0;
        
        for (const account of equityAccounts) {
            let balance = 0;
            for (const entry of journalEntries) {
                for (const line of entry.entries) {
                    if (line.account.toString() === account._id.toString()) {
                        // Equity accounts increase with credits
                        balance += (line.credit || 0) - (line.debit || 0);
                    }
                }
            }
            equity[account._id] = {
                code: account.code,
                name: account.name,
                amount: balance
            };
            totalEquity += balance;
        }

        return {
            asOfDate,
            assets: {
                items: Object.values(assets),
                total: totalAssets
            },
            liabilities: {
                items: Object.values(liabilities),
                total: totalLiabilities
            },
            equity: {
                items: Object.values(equity),
                total: totalEquity
            },
            totalLiabilitiesAndEquity: totalLiabilities + totalEquity
        };
    }

    /**
     * Get Cash Flow Statement
     */
    static async getCashFlowStatement(organizationId, startDate, endDate) {
        // Get cash accounts
        const cashAccounts = await Account.find({
            organization: organizationId,
            category: { $in: ['cash', 'bank'] },
            isActive: true,
            deletedAt: null
        });

        // Get all posted journal entries in date range
        const journalEntries = await JournalEntry.find({
            organization: organizationId,
            status: 'posted',
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });

        // Calculate cash flow
        let operatingCashFlow = 0;
        let investingCashFlow = 0;
        let financingCashFlow = 0;

        for (const entry of journalEntries) {
            for (const line of entry.entries) {
                const isCashAccount = cashAccounts.some(
                    acc => acc._id.toString() === line.account.toString()
                );
                
                if (isCashAccount) {
                    // Cash movement: debit = inflow, credit = outflow
                    const cashMovement = (line.debit || 0) - (line.credit || 0);
                    
                    // For now, classify all as operating (simplified)
                    // In real implementation, you'd classify by transaction type
                    operatingCashFlow += cashMovement;
                }
            }
        }

        // Get beginning and ending cash balances
        const beginningBalance = await this.getCashBalance(organizationId, startDate);
        const endingBalance = await this.getCashBalance(organizationId, endDate);

        return {
            period: {
                startDate,
                endDate
            },
            operating: {
                amount: operatingCashFlow,
                description: 'Net cash from operating activities'
            },
            investing: {
                amount: investingCashFlow,
                description: 'Net cash from investing activities'
            },
            financing: {
                amount: financingCashFlow,
                description: 'Net cash from financing activities'
            },
            netChange: operatingCashFlow + investingCashFlow + financingCashFlow,
            beginningBalance,
            endingBalance
        };
    }

    /**
     * Get cash balance as of date
     */
    static async getCashBalance(organizationId, asOfDate) {
        const cashAccounts = await Account.find({
            organization: organizationId,
            category: { $in: ['cash', 'bank'] },
            isActive: true,
            deletedAt: null
        });

        const journalEntries = await JournalEntry.find({
            organization: organizationId,
            status: 'posted',
            date: { $lte: new Date(asOfDate) }
        });

        let balance = 0;
        
        for (const account of cashAccounts) {
            let accountBalance = 0;
            for (const entry of journalEntries) {
                for (const line of entry.entries) {
                    if (line.account.toString() === account._id.toString()) {
                        accountBalance += (line.debit || 0) - (line.credit || 0);
                    }
                }
            }
            balance += accountBalance;
        }

        return balance;
    }
}

module.exports = FinancialReportsService;
