// src/services/finance/treasury.service.js
const { Treasury, Account, JournalEntry, Invoice } = require('../../models/finance');

/**
 * Treasury Management Service
 * Handles cash flow, forecasting, and treasury operations
 */
class TreasuryService {
    
    /**
     * Calculate cash flow for a period
     */
    static async calculateCashFlow(organizationId, startDate, endDate, period = 'monthly') {
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
        }).populate('lines.account').sort('date');

        const cashFlow = {
            period,
            startDate,
            endDate,
            byPeriod: [],
            operating: { inflows: 0, outflows: 0, net: 0 },
            investing: { inflows: 0, outflows: 0, net: 0 },
            financing: { inflows: 0, outflows: 0, net: 0 },
            total: { inflows: 0, outflows: 0, net: 0 }
        };

        // Group by period
        const periodMap = new Map();

        for (const entry of entries) {
            let periodKey;
            if (period === 'daily') {
                periodKey = entry.date.toISOString().split('T')[0];
            } else if (period === 'weekly') {
                const week = Math.ceil(entry.date.getDate() / 7);
                periodKey = `${entry.date.getFullYear()}-W${week}`;
            } else if (period === 'monthly') {
                periodKey = `${entry.date.getFullYear()}-${String(entry.date.getMonth() + 1).padStart(2, '0')}`;
            } else if (period === 'quarterly') {
                const quarter = Math.floor(entry.date.getMonth() / 3) + 1;
                periodKey = `${entry.date.getFullYear()}-Q${quarter}`;
            }

            if (!periodMap.has(periodKey)) {
                periodMap.set(periodKey, {
                    period: periodKey,
                    startDate: entry.date,
                    operating: { inflows: 0, outflows: 0, net: 0 },
                    investing: { inflows: 0, outflows: 0, net: 0 },
                    financing: { inflows: 0, outflows: 0, net: 0 },
                    total: { inflows: 0, outflows: 0, net: 0 }
                });
            }

            const periodData = periodMap.get(periodKey);

            // Check each line for cash impact
            for (const line of entry.lines) {
                if (cashAccountIds.some(id => id.equals(line.account._id))) {
                    const amount = line.debit || line.credit;
                    const type = line.debit > 0 ? 'inflow' : 'outflow';
                    
                    // Determine classification based on other lines
                    const otherLines = entry.lines.filter(l => 
                        !l.account._id.equals(line.account._id)
                    );

                    let classification = 'operating';

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

                    // Update period data
                    periodData[classification][type === 'inflow' ? 'inflows' : 'outflows'] += amount;
                    periodData[classification].net += type === 'inflow' ? amount : -amount;
                    periodData.total[type === 'inflow' ? 'inflows' : 'outflows'] += amount;
                    periodData.total.net += type === 'inflow' ? amount : -amount;

                    // Update totals
                    cashFlow[classification][type === 'inflow' ? 'inflows' : 'outflows'] += amount;
                    cashFlow[classification].net += type === 'inflow' ? amount : -amount;
                    cashFlow.total[type === 'inflow' ? 'inflows' : 'outflows'] += amount;
                    cashFlow.total.net += type === 'inflow' ? amount : -amount;
                }
            }
        }

        // Convert period map to array and sort
        cashFlow.byPeriod = Array.from(periodMap.values())
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        return cashFlow;
    }

    /**
     * Generate cash flow forecast
     */
    static async generateForecast(organizationId, months = 6, startDate = new Date()) {
        const forecast = {
            startDate,
            months,
            periods: [],
            totals: {
                beginningCash: 0,
                inflows: 0,
                outflows: 0,
                netCash: 0,
                endingCash: 0
            }
        };

        // Get current cash position
        const beginningCash = await this.getCashBalance(organizationId, startDate);
        forecast.totals.beginningCash = beginningCash;

        // Get receivable projections
        const receivables = await this.getReceivableProjections(organizationId, months);

        // Get payable projections
        const payables = await this.getPayableProjections(organizationId, months);

        // Get recurring transactions
        const recurring = await this.getRecurringTransactions(organizationId);

        // Build forecast by month
        let runningBalance = beginningCash;

        for (let i = 0; i < months; i++) {
            const forecastDate = new Date(startDate);
            forecastDate.setMonth(forecastDate.getMonth() + i);

            const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;

            const monthForecast = {
                month: monthKey,
                date: forecastDate,
                beginningBalance: runningBalance,
                inflows: 0,
                outflows: 0,
                net: 0,
                endingBalance: 0,
                items: []
            };

            // Add receivable collections
            const monthReceivables = receivables.filter(r => 
                r.expectedDate.getMonth() === forecastDate.getMonth() &&
                r.expectedDate.getFullYear() === forecastDate.getFullYear()
            );

            for (const rec of monthReceivables) {
                monthForecast.inflows += rec.amount;
                monthForecast.items.push({
                    type: 'receivable',
                    description: rec.description,
                    amount: rec.amount,
                    probability: rec.probability,
                    date: rec.expectedDate
                });
            }

            // Add payable payments
            const monthPayables = payables.filter(p => 
                p.dueDate.getMonth() === forecastDate.getMonth() &&
                p.dueDate.getFullYear() === forecastDate.getFullYear()
            );

            for (const pay of monthPayables) {
                monthForecast.outflows += pay.amount;
                monthForecast.items.push({
                    type: 'payable',
                    description: pay.description,
                    amount: pay.amount,
                    probability: pay.probability,
                    date: pay.dueDate
                });
            }

            // Add recurring transactions
            for (const rec of recurring) {
                if (this.shouldIncludeRecurring(rec, forecastDate)) {
                    const amount = rec.type === 'inflow' ? rec.amount : -rec.amount;
                    
                    if (rec.type === 'inflow') {
                        monthForecast.inflows += rec.amount;
                    } else {
                        monthForecast.outflows += rec.amount;
                    }

                    monthForecast.items.push({
                        type: 'recurring',
                        subType: rec.type,
                        description: rec.description,
                        amount: rec.amount,
                        date: forecastDate
                    });
                }
            }

            monthForecast.net = monthForecast.inflows - monthForecast.outflows;
            monthForecast.endingBalance = monthForecast.beginningBalance + monthForecast.net;
            
            forecast.periods.push(monthForecast);
            
            runningBalance = monthForecast.endingBalance;
        }

        // Calculate totals
        forecast.totals.inflows = forecast.periods.reduce((sum, p) => sum + p.inflows, 0);
        forecast.totals.outflows = forecast.periods.reduce((sum, p) => sum + p.outflows, 0);
        forecast.totals.netCash = forecast.totals.inflows - forecast.totals.outflows;
        forecast.totals.endingCash = runningBalance;

        return forecast;
    }

    /**
     * Get current cash position
     */
    static async getCashPosition(organizationId, asOfDate = new Date()) {
        const cashAccounts = await Account.find({
            organization: organizationId,
            code: { $regex: '^(1(0|1))' },
            isActive: true
        });

        const position = {
            asOfDate,
            totalCash: 0,
            byCurrency: {},
            accounts: []
        };

        for (const account of cashAccounts) {
            const balance = await account.getBalance(null, asOfDate);
            
            position.accounts.push({
                id: account._id,
                code: account.code,
                name: account.name,
                currency: account.currency,
                balance
            });

            position.totalCash += balance;

            if (!position.byCurrency[account.currency]) {
                position.byCurrency[account.currency] = 0;
            }
            position.byCurrency[account.currency] += balance;
        }

        return position;
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
     * Get receivable projections
     */
    static async getReceivableProjections(organizationId, months) {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + months);

        const invoices = await Invoice.find({
            organization: organizationId,
            invoiceType: 'sales',
            paymentStatus: { $nin: ['paid', 'overpaid'] },
            dueDate: { $gte: today, $lte: futureDate }
        }).populate('customer');

        const projections = [];

        for (const invoice of invoices) {
            projections.push({
                type: 'receivable',
                description: `Invoice ${invoice.invoiceNumber} - ${invoice.customer?.name || invoice.customerName}`,
                amount: invoice.amountDue,
                expectedDate: invoice.dueDate,
                probability: 90, // High probability for receivables
                reference: invoice.invoiceNumber,
                customer: invoice.customer?.name || invoice.customerName
            });
        }

        return projections;
    }

    /**
     * Get payable projections
     */
    static async getPayableProjections(organizationId, months) {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + months);

        const invoices = await Invoice.find({
            organization: organizationId,
            invoiceType: 'purchase',
            paymentStatus: { $nin: ['paid', 'overpaid'] },
            dueDate: { $gte: today, $lte: futureDate }
        }).populate('vendor');

        const projections = [];

        for (const invoice of invoices) {
            projections.push({
                type: 'payable',
                description: `Bill ${invoice.invoiceNumber} - ${invoice.vendor?.name || invoice.customerName}`,
                amount: invoice.amountDue,
                dueDate: invoice.dueDate,
                probability: 95, // Very high probability for payables
                reference: invoice.invoiceNumber,
                vendor: invoice.vendor?.name || invoice.customerName
            });
        }

        return projections;
    }

    /**
     * Get recurring transactions
     */
    static async getRecurringTransactions(organizationId) {
        // This would typically query a RecurringTransaction model
        // For now, return mock data
        return [
            {
                type: 'outflow',
                description: 'Monthly Rent',
                amount: 5000,
                frequency: 'monthly',
                dayOfMonth: 1
            },
            {
                type: 'outflow',
                description: 'Payroll',
                amount: 25000,
                frequency: 'monthly',
                dayOfMonth: 15
            },
            {
                type: 'inflow',
                description: 'Recurring Customer Payments',
                amount: 15000,
                frequency: 'monthly',
                dayOfMonth: 5
            }
        ];
    }

    /**
     * Check if recurring transaction should be included in month
     */
    static shouldIncludeRecurring(transaction, date) {
        if (transaction.frequency === 'monthly') {
            return date.getDate() === transaction.dayOfMonth;
        }
        // Add other frequencies as needed
        return false;
    }

    /**
     * Get working capital metrics
     */
    static async getWorkingCapital(organizationId, asOfDate = new Date()) {
        // Get current assets (cash, receivables, inventory)
        const cashAccounts = await Account.find({
            organization: organizationId,
            code: { $regex: '^(1(0|1))' },
            isActive: true
        });

        const receivableAccounts = await Account.find({
            organization: organizationId,
            code: { $regex: '^12' }, // Accounts receivable typically start with 12
            isActive: true
        });

        const inventoryAccounts = await Account.find({
            organization: organizationId,
            code: { $regex: '^13' }, // Inventory typically starts with 13
            isActive: true
        });

        // Get current liabilities
        const payableAccounts = await Account.find({
            organization: organizationId,
            code: { $regex: '^2(0|1)' }, // Current liabilities
            isActive: true
        });

        let currentAssets = 0;
        let currentLiabilities = 0;

        for (const account of cashAccounts) {
            currentAssets += await account.getBalance(null, asOfDate);
        }

        for (const account of receivableAccounts) {
            currentAssets += await account.getBalance(null, asOfDate);
        }

        for (const account of inventoryAccounts) {
            currentAssets += await account.getBalance(null, asOfDate);
        }

        for (const account of payableAccounts) {
            currentLiabilities += await account.getBalance(null, asOfDate);
        }

        return {
            asOfDate,
            currentAssets,
            currentLiabilities,
            workingCapital: currentAssets - currentLiabilities,
            currentRatio: currentLiabilities ? currentAssets / currentLiabilities : null,
            quickRatio: currentLiabilities ? (currentAssets - await this.getInventoryBalance(organizationId, asOfDate)) / currentLiabilities : null
        };
    }

    /**
     * Get inventory balance
     */
    static async getInventoryBalance(organizationId, asOfDate) {
        const inventoryAccounts = await Account.find({
            organization: organizationId,
            code: { $regex: '^13' },
            isActive: true
        });

        let balance = 0;
        for (const account of inventoryAccounts) {
            balance += await account.getBalance(null, asOfDate);
        }
        return balance;
    }
}

module.exports = TreasuryService;