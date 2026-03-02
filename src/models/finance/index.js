// src/models/finance/index.js
/**
 * Finance Module Models Index
 * This file exports all models for the Finance & Accounting module
 */

const Account = require('./account.model');
const Invoice = require('./invoice.model');
const JournalEntry = require('./journalEntry.model');
const Budget = require('./budget.model');
const Tax = require('./tax.model');
const Asset = require('./asset.model');
const Treasury = require('./treasury.model');
const Payment = require('./payment.model');
const Expense = require('./expense.model');

module.exports = {
    Account,
    Invoice,
    JournalEntry,
    Budget,
    Tax,
    Asset,
    Treasury,
    Payment,
    Expense,
    
    // Helper function to initialize all models
    initialize: async () => {
        try {
            // Create indexes for all models
            await Account.createIndexes();
            await Invoice.createIndexes();
            await JournalEntry.createIndexes();
            await Budget.createIndexes();
            await Tax.createIndexes();
            await Asset.createIndexes();
            await Treasury.createIndexes();
            await Payment.createIndexes();
            await Expense.createIndexes();
            
            console.log('✅ Finance module models initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing finance module models:', error);
            throw error;
        }
    },
    
    // Helper function to get model by name
    getModel: (modelName) => {
        const models = {
            Account,
            Invoice,
            JournalEntry,
            Budget,
            Tax,
            Asset,
            Treasury,
            Payment,
            Expense
        };
        return models[modelName];
    },
    
    // Export all model names for reference
    modelNames: [
        'Account', 'Invoice', 'JournalEntry', 'Budget', 
        'Tax', 'Asset', 'Treasury', 'Payment', 'Expense'
    ]
};