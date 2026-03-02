// src/services/finance/reconciliation.service.js
const { Treasury, Account, JournalEntry } = require('../../models/finance');
const { calculateFinancialRatios } = require('./accounting.service');

/**
 * Bank Reconciliation Service
 */
class ReconciliationService {
    
    /**
     * Start bank reconciliation
     */
    static async startReconciliation(organizationId, bankAccountId, statementData, userId) {
        const treasury = await Treasury.findOne({ 
            organization: organizationId,
            'bankAccounts._id': bankAccountId
        });

        if (!treasury) {
            throw new Error('Bank account not found');
        }

        const bankAccount = treasury.bankAccounts.id(bankAccountId);
        const bookBalance = bankAccount.currentBalance;

        // Get uncleared transactions
        const unclearedTransactions = await this.getUnclearedTransactions(
            organizationId, 
            bankAccount.account
        );

        const reconciliation = {
            reconciliationDate: new Date(),
            statementBalance: statementData.statementBalance,
            bookBalance,
            difference: statementData.statementBalance - bookBalance,
            status: 'in_progress',
            statementDate: statementData.statementDate,
            statementNumber: statementData.statementNumber,
            unclearedTransactions
        };

        treasury.currentReconciliation = reconciliation;
        treasury.updatedBy = userId;
        await treasury.save();

        return reconciliation;
    }

    /**
     * Get uncleared transactions
     */
    static async getUnclearedTransactions(organizationId, accountId) {
        const JournalEntry = mongoose.model('JournalEntry');

        const entries = await JournalEntry.find({
            organization: organizationId,
            status: 'posted',
            'lines.account': accountId,
            cleared: { $ne: true }
        }).sort('date');

        const transactions = [];

        for (const entry of entries) {
            const line = entry.lines.find(l => l.account.equals(accountId));
            if (line) {
                transactions.push({
                    date: entry.date,
                    description: entry.description,
                    reference: entry.journalNumber,
                    amount: line.debit || line.credit,
                    type: line.debit > 0 ? 'debit' : 'credit',
                    entryId: entry._id
                });
            }
        }

        return transactions;
    }

    /**
     * Match transactions
     */
    static async matchTransactions(reconciliationId, matches, userId) {
        const treasury = await Treasury.findOne({
            'currentReconciliation._id': reconciliationId
        });

        if (!treasury) {
            throw new Error('Reconciliation not found');
        }

        const matchedTransactions = [];
        const unmatchedTransactions = [];

        for (const match of matches) {
            if (match.matched) {
                matchedTransactions.push(match);
                
                // Mark journal entry as cleared
                await JournalEntry.findByIdAndUpdate(match.entryId, {
                    cleared: true,
                    clearedAt: new Date(),
                    clearedBy: userId
                });
            } else {
                unmatchedTransactions.push(match);
            }
        }

        treasury.currentReconciliation.matchedTransactions = matchedTransactions;
        treasury.currentReconciliation.unmatchedTransactions = unmatchedTransactions;
        await treasury.save();

        return {
            matched: matchedTransactions,
            unmatched: unmatchedTransactions
        };
    }

    /**
     * Complete reconciliation
     */
    static async completeReconciliation(reconciliationId, adjustments, userId) {
        const treasury = await Treasury.findOne({
            'currentReconciliation._id': reconciliationId
        });

        if (!treasury) {
            throw new Error('Reconciliation not found');
        }

        const reconciliation = treasury.currentReconciliation;
        const bankAccount = treasury.bankAccounts.id(reconciliation.bankAccountId);

        // Apply adjustments
        if (adjustments && adjustments.length > 0) {
            for (const adj of adjustments) {
                // Create journal entry for adjustment
                const journalEntry = await this.createAdjustmentEntry(
                    treasury.organization,
                    bankAccount.account,
                    adj,
                    userId
                );

                // Update balances
                if (adj.type === 'bank_charge') {
                    bankAccount.currentBalance -= adj.amount;
                } else if (adj.type === 'interest') {
                    bankAccount.currentBalance += adj.amount;
                }

                reconciliation.adjustments.push({
                    ...adj,
                    journalEntryId: journalEntry._id
                });
            }

            // Recalculate difference
            reconciliation.bookBalance = bankAccount.currentBalance;
            reconciliation.difference = reconciliation.statementBalance - reconciliation.bookBalance;
        }

        // Check if reconciled
        if (Math.abs(reconciliation.difference) <= (treasury.reconciliationSettings.toleranceAmount || 0.01)) {
            reconciliation.status = 'completed';
            
            // Update bank account
            bankAccount.lastReconciledDate = new Date();
            bankAccount.lastReconciledBalance = reconciliation.statementBalance;

            // Add to history
            treasury.reconciliationHistory.push(reconciliation);

            // Clear current reconciliation
            treasury.currentReconciliation = null;
        }

        treasury.updatedBy = userId;
        await treasury.save();

        return reconciliation;
    }

    /**
     * Create adjustment entry
     */
    static async createAdjustmentEntry(organizationId, accountId, adjustment, userId) {
        const JournalEntry = mongoose.model('JournalEntry');
        const Account = mongoose.model('Account');

        const account = await Account.findById(accountId);
        const description = `${adjustment.type}: ${adjustment.description}`;

        let lines = [];

        if (adjustment.type === 'bank_charge') {
            // Debit: Bank Charges Expense, Credit: Bank Account
            const expenseAccount = await Account.findOne({
                organization: organizationId,
                code: '6310' // Bank charges expense account
            });

            lines = [
                {
                    account: expenseAccount._id,
                    description,
                    debit: adjustment.amount,
                    credit: 0
                },
                {
                    account: accountId,
                    description,
                    debit: 0,
                    credit: adjustment.amount
                }
            ];
        } else if (adjustment.type === 'interest') {
            // Debit: Bank Account, Credit: Interest Income
            const incomeAccount = await Account.findOne({
                organization: organizationId,
                code: '4110' // Interest income account
            });

            lines = [
                {
                    account: accountId,
                    description,
                    debit: adjustment.amount,
                    credit: 0
                },
                {
                    account: incomeAccount._id,
                    description,
                    debit: 0,
                    credit: adjustment.amount
                }
            ];
        } else {
            // General adjustment
            lines = adjustment.lines;
        }

        const entry = await JournalEntry.create({
            organization: organizationId,
            journalNumber: `ADJ-${Date.now()}`,
            journalType: 'adjusting',
            date: new Date(),
            description: `Bank reconciliation adjustment: ${adjustment.description}`,
            lines,
            createdBy: userId,
            status: 'posted',
            postedAt: new Date(),
            postedBy: userId
        });

        return entry;
    }

    /**
     * Generate reconciliation report
     */
    static async generateReconciliationReport(organizationId, bankAccountId, startDate, endDate) {
        const treasury = await Treasury.findOne({
            organization: organizationId,
            'bankAccounts._id': bankAccountId
        }).populate('bankAccounts');

        if (!treasury) {
            throw new Error('Bank account not found');
        }

        const bankAccount = treasury.bankAccounts.id(bankAccountId);

        // Get all transactions in period
        const transactions = await this.getAccountTransactions(
            organizationId,
            bankAccount.account,
            startDate,
            endDate
        );

        // Get reconciliation history
        const reconciliations = treasury.reconciliationHistory.filter(r => 
            r.reconciliationDate >= startDate && r.reconciliationDate <= endDate
        );

        // Calculate statistics
        const stats = {
            totalDeposits: transactions.filter(t => t.type === 'credit').length,
            totalWithdrawals: transactions.filter(t => t.type === 'debit').length,
            totalDepositAmount: transactions
                .filter(t => t.type === 'credit')
                .reduce((sum, t) => sum + t.amount, 0),
            totalWithdrawalAmount: transactions
                .filter(t => t.type === 'debit')
                .reduce((sum, t) => sum + t.amount, 0),
            averageDailyBalance: 0, // Would need daily balances
            reconciliationCount: reconciliations.length,
            successfulReconciliations: reconciliations.filter(r => r.status === 'completed').length
        };

        return {
            period: { startDate, endDate },
            bankAccount: {
                name: bankAccount.name,
                number: bankAccount.accountNumber,
                currency: bankAccount.currency
            },
            openingBalance: bankAccount.openingBalance,
            closingBalance: bankAccount.currentBalance,
            transactions,
            reconciliations,
            stats
        };
    }

    /**
     * Get account transactions
     */
    static async getAccountTransactions(organizationId, accountId, startDate, endDate) {
        const JournalEntry = mongoose.model('JournalEntry');

        const entries = await JournalEntry.find({
            organization: organizationId,
            status: 'posted',
            date: { $gte: startDate, $lte: endDate },
            'lines.account': accountId
        }).sort('date');

        const transactions = [];

        for (const entry of entries) {
            const line = entry.lines.find(l => l.account.equals(accountId));
            if (line) {
                transactions.push({
                    date: entry.date,
                    description: entry.description,
                    reference: entry.journalNumber,
                    amount: line.debit || line.credit,
                    type: line.debit > 0 ? 'debit' : 'credit',
                    cleared: entry.cleared || false,
                    entryId: entry._id
                });
            }
        }

        return transactions;
    }

    /**
     * Auto-reconcile transactions
     */
    static async autoReconcile(organizationId, bankAccountId, statementTransactions) {
        const treasury = await Treasury.findOne({
            organization: organizationId,
            'bankAccounts._id': bankAccountId
        });

        if (!treasury) {
            throw new Error('Bank account not found');
        }

        const bankAccount = treasury.bankAccounts.id(bankAccountId);
        const bookTransactions = await this.getUnclearedTransactions(
            organizationId,
            bankAccount.account
        );

        const matches = [];
        const unmatched = [...bookTransactions];

        // Try to match transactions
        for (const stmtTx of statementTransactions) {
            let matched = false;

            for (let i = 0; i < unmatched.length; i++) {
                const bookTx = unmatched[i];
                
                // Check if amounts match
                if (Math.abs(stmtTx.amount - bookTx.amount) < 0.01) {
                    // Check date proximity (within 3 days)
                    const daysDiff = Math.abs(
                        (new Date(stmtTx.date) - new Date(bookTx.date)) / (1000 * 60 * 60 * 24)
                    );
                    
                    if (daysDiff <= 3) {
                        matches.push({
                            statementTransaction: stmtTx,
                            bookTransaction: bookTx,
                            confidence: 'high'
                        });
                        
                        unmatched.splice(i, 1);
                        matched = true;
                        break;
                    }
                }
            }

            if (!matched) {
                matches.push({
                    statementTransaction: stmtTx,
                    bookTransaction: null,
                    confidence: 'low'
                });
            }
        }

        // Add remaining unmatched book transactions
        for (const bookTx of unmatched) {
            matches.push({
                statementTransaction: null,
                bookTransaction: bookTx,
                confidence: 'low'
            });
        }

        return matches;
    }

    /**
     * Validate reconciliation
     */
    static validateReconciliation(bookBalance, statementBalance, tolerance = 0.01) {
        const difference = statementBalance - bookBalance;
        
        return {
            isReconciled: Math.abs(difference) <= tolerance,
            difference,
            tolerance,
            bookBalance,
            statementBalance
        };
    }
}

module.exports = ReconciliationService;