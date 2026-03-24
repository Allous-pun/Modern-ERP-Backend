// src/utils/finance/generators.js
const { Invoice, JournalEntry } = require('../../models/finance');

/**
 * Generate invoice number
 * Format: INV-YYYY-XXXXX (e.g., INV-2026-00001)
 */
const generateInvoiceNumber = async (organizationId, type = 'sales') => {
    const year = new Date().getFullYear();
    const prefix = type === 'sales' ? 'INV' : 'PUR';
    
    const count = await Invoice.countDocuments({ 
        organization: organizationId,
        invoiceNumber: { $regex: `${prefix}-${year}` }
    });
    
    return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
};

/**
 * Generate journal number
 * Format: JRN-YYYY-XXXXX (e.g., JRN-2026-00001)
 */
const generateJournalNumber = async (organizationId, type = 'general') => {
    const year = new Date().getFullYear();
    const prefix = type === 'general' ? 'JRN' : type.substring(0, 3).toUpperCase();
    
    const count = await JournalEntry.countDocuments({ 
        organization: organizationId,
        journalNumber: { $regex: `${prefix}-${year}` }
    });
    
    return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
};

/**
 * Generate payment reference
 */
const generatePaymentReference = (method) => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const prefix = method === 'cash' ? 'CSH' : 
                   method === 'bank_transfer' ? 'BTR' : 
                   method === 'check' ? 'CHK' : 'PAY';
    
    return `${prefix}-${timestamp}-${random}`;
};

module.exports = {
    generateInvoiceNumber,
    generateJournalNumber,
    generatePaymentReference
};