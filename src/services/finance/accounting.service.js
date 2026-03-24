// src/services/finance/accounting.service.js
const { Account, JournalEntry, Invoice } = require('../../models/finance');

/**
 * Generate financial statements
 */
class AccountingService {
    
    /**
     * Generate balance sheet
     */
    static async generateBalanceSheet(organizationId, asOfDate = new Date()) {
        const accounts = await Account.getBalanceSheetAccounts(organizationId);
        
        const balanceSheet = {
            asOfDate,
            assets: {
                current: [],
                fixed: [],
                other: [],
                total: 0
            },
            liabilities: {
                current: [],
                longTerm: [],
                other: [],
                total: 0
            },
            equity: {
                capital: [],
                retained: [],
                total: 0
            }
        };

        for (const account of accounts) {
            const balance = await account.getBalance(null, asOfDate);
            
            if (balance === 0) continue;

            const item = {
                code: account.code,
                name: account.name,
                balance
            };

            // Classify assets
            if (account.type === 'asset') {
                if (account.category === 'current_asset') {
                    balanceSheet.assets.current.push(item);
                } else if (account.category === 'fixed_asset') {
                    balanceSheet.assets.fixed.push(item);
                } else {
                    balanceSheet.assets.other.push(item);
                }
                balanceSheet.assets.total += balance;
            }
            
            // Classify liabilities
            else if (account.type === 'liability') {
                if (account.category === 'current_liability') {
                    balanceSheet.liabilities.current.push(item);
                } else if (account.category === 'long_term_liability') {
                    balanceSheet.liabilities.longTerm.push(item);
                } else {
                    balanceSheet.liabilities.other.push(item);
                }
                balanceSheet.liabilities.total += balance;
            }
            
            // Classify equity
            else if (account.type === 'equity') {
                if (account.category === 'owners_equity') {
                    balanceSheet.equity.capital.push(item);
                } else {
                    balanceSheet.equity.retained.push(item);
                }
                balanceSheet.equity.total += balance;
            }
        }

        // Calculate net income for period
        const incomeStatement = await this.generateIncomeStatement(
            organizationId,
            new Date(asOfDate.getFullYear(), 0, 1),
            asOfDate
        );
        
        balanceSheet.equity.retained.push({
            code: 'NET_INCOME',
            name: 'Net Income (Current Period)',
            balance: incomeStatement.netIncome
        });
        balanceSheet.equity.total += incomeStatement.netIncome;

        // Validate accounting equation
        balanceSheet.validated = Math.abs(
            balanceSheet.assets.total - 
            (balanceSheet.liabilities.total + balanceSheet.equity.total)
        ) < 0.01;

        return balanceSheet;
    }

    /**
     * Generate income statement
     */
    static async generateIncomeStatement(organizationId, startDate, endDate) {
        const accounts = await Account.getIncomeStatementAccounts(organizationId);
        
        const incomeStatement = {
            period: { startDate, endDate },
            revenue: [],
            costOfGoodsSold: [],
            operatingExpenses: [],
            otherIncome: [],
            otherExpenses: [],
            totals: {
                revenue: 0,
                costOfGoodsSold: 0,
                grossProfit: 0,
                operatingExpenses: 0,
                operatingIncome: 0,
                otherIncome: 0,
                otherExpenses: 0,
                netIncome: 0
            }
        };

        for (const account of accounts) {
            const balance = await account.getBalance(startDate, endDate);
            
            if (balance === 0) continue;

            const item = {
                code: account.code,
                name: account.name,
                balance
            };

            // Classify by category
            if (account.type === 'revenue') {
                if (account.category === 'operating_revenue') {
                    incomeStatement.revenue.push(item);
                    incomeStatement.totals.revenue += balance;
                } else {
                    incomeStatement.otherIncome.push(item);
                    incomeStatement.totals.otherIncome += balance;
                }
            } else if (account.type === 'expense') {
                if (account.category === 'cost_of_goods_sold') {
                    incomeStatement.costOfGoodsSold.push(item);
                    incomeStatement.totals.costOfGoodsSold += balance;
                } else if (account.category === 'operating_expense') {
                    incomeStatement.operatingExpenses.push(item);
                    incomeStatement.totals.operatingExpenses += balance;
                } else {
                    incomeStatement.otherExpenses.push(item);
                    incomeStatement.totals.otherExpenses += balance;
                }
            }
        }

        // Calculate subtotals
        incomeStatement.totals.grossProfit = 
            incomeStatement.totals.revenue - incomeStatement.totals.costOfGoodsSold;
        
        incomeStatement.totals.operatingIncome = 
            incomeStatement.totals.grossProfit - incomeStatement.totals.operatingExpenses;
        
        incomeStatement.totals.netIncome = 
            incomeStatement.totals.operatingIncome + 
            incomeStatement.totals.otherIncome - 
            incomeStatement.totals.otherExpenses;

        // Calculate ratios
        incomeStatement.ratios = {
            grossMargin: incomeStatement.totals.revenue ? 
                (incomeStatement.totals.grossProfit / incomeStatement.totals.revenue) * 100 : 0,
            operatingMargin: incomeStatement.totals.revenue ? 
                (incomeStatement.totals.operatingIncome / incomeStatement.totals.revenue) * 100 : 0,
            netMargin: incomeStatement.totals.revenue ? 
                (incomeStatement.totals.netIncome / incomeStatement.totals.revenue) * 100 : 0
        };

        return incomeStatement;
    }

    /**
     * Generate cash flow statement
     */
    static async generateCashFlowStatement(organizationId, startDate, endDate) {
        // Get cash accounts
        const cashAccounts = await Account.find({
            organization: organizationId,
            code: { $regex: '^(1(0|1))' }, // Cash and bank accounts
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
            operating: {
                inflows: [],
                outflows: [],
                net: 0
            },
            investing: {
                inflows: [],
                outflows: [],
                net: 0
            },
            financing: {
                inflows: [],
                outflows: [],
                net: 0
            },
            totals: {
                beginningCash: 0,
                endingCash: 0,
                netChange: 0
            }
        };

        // Calculate beginning cash
        const beginningCashBalance = await this.getCashBalance(organizationId, startDate);
        cashFlow.totals.beginningCash = beginningCashBalance;

        // Classify cash flows
        for (const entry of entries) {
            for (const line of entry.lines) {
                // Check if this line affects cash
                if (cashAccountIds.some(id => id.equals(line.account._id))) {
                    const amount = line.debit || line.credit;
                    const type = line.debit > 0 ? 'inflow' : 'outflow';
                    
                    // Classify based on account type of the other lines
                    const otherLines = entry.lines.filter(l => 
                        !l.account._id.equals(line.account._id)
                    );

                    let classification = 'operating'; // Default

                    for (const otherLine of otherLines) {
                        const otherAccount = otherLine.account;
                        
                        if (otherAccount.type === 'asset' && 
                            otherAccount.category === 'fixed_asset') {
                            classification = 'investing';
                            break;
                        } else if (otherAccount.type === 'liability' && 
                                  otherAccount.category === 'long_term_liability') {
                            classification = 'financing';
                            break;
                        } else if (otherAccount.type === 'equity') {
                            classification = 'financing';
                            break;
                        }
                    }

                    const item = {
                        date: entry.date,
                        description: entry.description,
                        amount,
                        reference: entry.journalNumber
                    };

                    if (classification === 'operating') {
                        if (type === 'inflow') {
                            cashFlow.operating.inflows.push(item);
                        } else {
                            cashFlow.operating.outflows.push(item);
                        }
                        cashFlow.operating.net += type === 'inflow' ? amount : -amount;
                    } else if (classification === 'investing') {
                        if (type === 'inflow') {
                            cashFlow.investing.inflows.push(item);
                        } else {
                            cashFlow.investing.outflows.push(item);
                        }
                        cashFlow.investing.net += type === 'inflow' ? amount : -amount;
                    } else if (classification === 'financing') {
                        if (type === 'inflow') {
                            cashFlow.financing.inflows.push(item);
                        } else {
                            cashFlow.financing.outflows.push(item);
                        }
                        cashFlow.financing.net += type === 'inflow' ? amount : -amount;
                    }
                }
            }
        }

        // Calculate ending cash
        const endingCashBalance = await this.getCashBalance(organizationId, endDate);
        cashFlow.totals.endingCash = endingCashBalance;
        cashFlow.totals.netChange = endingCashBalance - beginningCashBalance;

        return cashFlow;
    }

    /**
     * Get cash balance
     */
    static async getCashBalance(organizationId, asOfDate) {
        const cashAccounts = await Account.find({
            organization: organizationId,
            code: { $regex: '^(1(0|1))' },
            isActive: true
        });

        let balance = 0;
        for (const account of cashAccounts) {
            balance += await account.getBalance(null, asOfDate);
        }
        return balance;
    }

    /**
     * Generate trial balance
     */
    static async generateTrialBalance(organizationId, asOfDate) {
        return Account.getTrialBalance(organizationId, asOfDate);
    }

    /**
     * Generate aging report
     */
    static async generateAgingReport(organizationId, type = 'receivable', asOfDate = new Date()) {
        const query = {
            organization: organizationId,
            invoiceType: type === 'receivable' ? 'sales' : 'purchase',
            paymentStatus: { $nin: ['paid', 'overpaid'] },
            invoiceStatus: { $nin: ['cancelled', 'void'] },
            isDeleted: { $ne: true }
        };

        const invoices = await Invoice.find(query)
            .populate(type === 'receivable' ? 'customer' : 'vendor');

        const aging = {
            asOfDate,
            type,
            buckets: {
                current: { invoices: [], total: 0 },
                days1to30: { invoices: [], total: 0 },
                days31to60: { invoices: [], total: 0 },
                days61to90: { invoices: [], total: 0 },
                over90: { invoices: [], total: 0 }
            },
            total: 0
        };

        for (const invoice of invoices) {
            const daysOverdue = Math.max(0, Math.floor((asOfDate - invoice.dueDate) / (1000 * 60 * 60 * 24)));
            const amount = invoice.amountDue;
            
            const item = {
                invoiceNumber: invoice.invoiceNumber,
                date: invoice.issueDate,
                dueDate: invoice.dueDate,
                daysOverdue,
                amount,
                currency: invoice.currency,
                party: type === 'receivable' ? invoice.customer?.name : invoice.vendor?.name
            };

            aging.total += amount;

            if (daysOverdue <= 0) {
                aging.buckets.current.invoices.push(item);
                aging.buckets.current.total += amount;
            } else if (daysOverdue <= 30) {
                aging.buckets.days1to30.invoices.push(item);
                aging.buckets.days1to30.total += amount;
            } else if (daysOverdue <= 60) {
                aging.buckets.days31to60.invoices.push(item);
                aging.buckets.days31to60.total += amount;
            } else if (daysOverdue <= 90) {
                aging.buckets.days61to90.invoices.push(item);
                aging.buckets.days61to90.total += amount;
            } else {
                aging.buckets.over90.invoices.push(item);
                aging.buckets.over90.total += amount;
            }
        }

        return aging;
    }

    /**
     * Post journal entry
     */
    static async postJournalEntry(entryId, userId) {
        const entry = await JournalEntry.findById(entryId);
        if (!entry) {
            throw new Error('Journal entry not found');
        }

        return entry.post(userId);
    }

    /**
     * Create reversing entry
     */
    static async createReversingEntry(originalEntryId, userId, reversalDate) {
        const originalEntry = await JournalEntry.findById(originalEntryId);
        if (!originalEntry) {
            throw new Error('Original entry not found');
        }

        return originalEntry.reverse(userId, 'Auto-reversing entry', reversalDate);
    }

    /**
     * Calculate financial ratios
     */
    static async calculateFinancialRatios(organizationId, asOfDate) {
        const balanceSheet = await this.generateBalanceSheet(organizationId, asOfDate);
        const incomeStatement = await this.generateIncomeStatement(
            organizationId,
            new Date(asOfDate.getFullYear(), 0, 1),
            asOfDate
        );

        return {
            profitability: {
                grossMargin: incomeStatement.ratios.grossMargin,
                operatingMargin: incomeStatement.ratios.operatingMargin,
                netMargin: incomeStatement.ratios.netMargin,
                returnOnAssets: balanceSheet.assets.total ? 
                    (incomeStatement.totals.netIncome / balanceSheet.assets.total) * 100 : 0,
                returnOnEquity: balanceSheet.equity.total ? 
                    (incomeStatement.totals.netIncome / balanceSheet.equity.total) * 100 : 0
            },
            liquidity: {
                currentRatio: balanceSheet.liabilities.current.total ? 
                    balanceSheet.assets.current.total / balanceSheet.liabilities.current.total : 0,
                quickRatio: balanceSheet.liabilities.current.total ? 
                    (balanceSheet.assets.current.total - 0) / balanceSheet.liabilities.current.total : 0,
                cashRatio: balanceSheet.liabilities.current.total ? 
                    (await this.getCashBalance(organizationId, asOfDate)) / balanceSheet.liabilities.current.total : 0
            },
            leverage: {
                debtToEquity: balanceSheet.equity.total ? 
                    balanceSheet.liabilities.total / balanceSheet.equity.total : 0,
                debtToAssets: balanceSheet.assets.total ? 
                    balanceSheet.liabilities.total / balanceSheet.assets.total : 0,
                equityMultiplier: balanceSheet.equity.total ? 
                    balanceSheet.assets.total / balanceSheet.equity.total : 0
            }
        };
    }
}

module.exports = AccountingService;