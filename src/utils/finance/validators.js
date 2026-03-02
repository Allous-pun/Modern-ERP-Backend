// src/utils/finance/validators.js

/**
 * Validate account code format
 * @param {string} code - Account code
 * @returns {boolean} Is valid
 */
const validateAccountCode = (code) => {
    if (!code || typeof code !== 'string') return false;
    
    // Common account code patterns: 1000, 1-1000, 1.1000
    const patterns = [
        /^\d{1,10}$/, // Simple numeric
        /^\d{1,5}-\d{1,5}$/, // Hyphenated
        /^\d{1,5}\.\d{1,5}$/ // Decimal
    ];
    
    return patterns.some(pattern => pattern.test(code));
};

/**
 * Validate account type
 * @param {string} type - Account type
 * @returns {boolean} Is valid
 */
const validateAccountType = (type) => {
    const validTypes = [
        'asset', 'liability', 'equity', 'revenue', 'expense',
        'contra_asset', 'contra_liability', 'contra_equity'
    ];
    return validTypes.includes(type);
};

/**
 * Validate normal balance
 * @param {string} balance - Normal balance
 * @returns {boolean} Is valid
 */
const validateNormalBalance = (balance) => {
    return ['debit', 'credit'].includes(balance);
};

/**
 * Validate journal entry
 * @param {Object} entry - Journal entry
 * @returns {Object} Validation result
 */
const validateJournalEntry = (entry) => {
    const errors = [];

    // Check if entry has lines
    if (!entry.lines || !Array.isArray(entry.lines) || entry.lines.length === 0) {
        errors.push('Journal entry must have at least one line');
        return { isValid: false, errors };
    }

    // Check if lines have accounts
    for (const [index, line] of entry.lines.entries()) {
        if (!line.account) {
            errors.push(`Line ${index + 1}: Account is required`);
        }
        
        // Check if line has either debit or credit
        const hasDebit = line.debit && line.debit > 0;
        const hasCredit = line.credit && line.credit > 0;
        
        if (!hasDebit && !hasCredit) {
            errors.push(`Line ${index + 1}: Must have either debit or credit`);
        }
        
        if (hasDebit && hasCredit) {
            errors.push(`Line ${index + 1}: Cannot have both debit and credit`);
        }
        
        // Validate amounts
        if (hasDebit && line.debit < 0) {
            errors.push(`Line ${index + 1}: Debit cannot be negative`);
        }
        
        if (hasCredit && line.credit < 0) {
            errors.push(`Line ${index + 1}: Credit cannot be negative`);
        }
    }

    // Check if debits equal credits
    const totalDebit = entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        errors.push('Total debits must equal total credits');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validate invoice
 * @param {Object} invoice - Invoice object
 * @returns {Object} Validation result
 */
const validateInvoice = (invoice) => {
    const errors = [];

    // Required fields
    const requiredFields = ['invoiceNumber', 'invoiceType', 'issueDate', 'dueDate'];
    for (const field of requiredFields) {
        if (!invoice[field]) {
            errors.push(`${field} is required`);
        }
    }

    // Validate invoice type
    if (invoice.invoiceType && !['sales', 'purchase', 'credit_note', 'debit_note'].includes(invoice.invoiceType)) {
        errors.push('Invalid invoice type');
    }

    // Validate dates
    if (invoice.issueDate && invoice.dueDate && new Date(invoice.issueDate) > new Date(invoice.dueDate)) {
        errors.push('Due date must be after issue date');
    }

    // Validate items
    if (!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) {
        errors.push('Invoice must have at least one item');
    } else {
        for (const [index, item] of invoice.items.entries()) {
            if (!item.description) {
                errors.push(`Item ${index + 1}: Description is required`);
            }
            
            if (!item.quantity || item.quantity <= 0) {
                errors.push(`Item ${index + 1}: Quantity must be positive`);
            }
            
            if (!item.unitPrice || item.unitPrice < 0) {
                errors.push(`Item ${index + 1}: Unit price must be non-negative`);
            }
            
            if (!item.account) {
                errors.push(`Item ${index + 1}: Account is required`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validate tax rate
 * @param {Object} taxRate - Tax rate object
 * @returns {Object} Validation result
 */
const validateTaxRate = (taxRate) => {
    const errors = [];

    // Required fields
    const requiredFields = ['name', 'code', 'rate', 'type', 'effectiveFrom'];
    for (const field of requiredFields) {
        if (!taxRate[field]) {
            errors.push(`${field} is required`);
        }
    }

    // Validate rate
    if (taxRate.rate && (taxRate.rate < 0 || taxRate.rate > 100)) {
        errors.push('Tax rate must be between 0 and 100');
    }

    // Validate type
    const validTypes = ['vat', 'gst', 'sales_tax', 'income_tax', 'withholding', 'customs', 'excise', 'property_tax'];
    if (taxRate.type && !validTypes.includes(taxRate.type)) {
        errors.push('Invalid tax type');
    }

    // Validate dates
    if (taxRate.effectiveFrom && taxRate.effectiveTo && new Date(taxRate.effectiveFrom) > new Date(taxRate.effectiveTo)) {
        errors.push('Effective from date must be before effective to date');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validate budget
 * @param {Object} budget - Budget object
 * @returns {Object} Validation result
 */
const validateBudget = (budget) => {
    const errors = [];

    // Required fields
    const requiredFields = ['name', 'fiscalYear', 'startDate', 'endDate', 'type'];
    for (const field of requiredFields) {
        if (!budget[field]) {
            errors.push(`${field} is required`);
        }
    }

    // Validate dates
    if (budget.startDate && budget.endDate && new Date(budget.startDate) > new Date(budget.endDate)) {
        errors.push('Start date must be before end date');
    }

    // Validate fiscal year
    if (budget.fiscalYear && budget.startDate) {
        const startYear = new Date(budget.startDate).getFullYear();
        if (budget.fiscalYear !== startYear) {
            errors.push('Fiscal year must match start date year');
        }
    }

    // Validate categories
    if (!budget.categories || !Array.isArray(budget.categories) || budget.categories.length === 0) {
        errors.push('Budget must have at least one category');
    } else {
        let totalAmount = 0;
        for (const category of budget.categories) {
            if (!category.account) {
                errors.push('Category account is required');
            }
            if (!category.name) {
                errors.push('Category name is required');
            }
            if (!category.amount || category.amount < 0) {
                errors.push('Category amount must be non-negative');
            }
            totalAmount += category.amount || 0;
        }
        
        // Check if total matches sum of categories
        if (Math.abs((budget.totalAmount || 0) - totalAmount) > 0.01) {
            errors.push('Total amount must equal sum of categories');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validate asset
 * @param {Object} asset - Asset object
 * @returns {Object} Validation result
 */
const validateAsset = (asset) => {
    const errors = [];

    // Required fields
    const requiredFields = ['assetNumber', 'name', 'type', 'purchaseDate', 'purchaseCost', 'account'];
    for (const field of requiredFields) {
        if (!asset[field]) {
            errors.push(`${field} is required`);
        }
    }

    // Validate purchase cost
    if (asset.purchaseCost && asset.purchaseCost < 0) {
        errors.push('Purchase cost cannot be negative');
    }

    // Validate depreciation
    if (asset.depreciationMethod && asset.depreciationMethod !== 'none') {
        if (!asset.usefulLife || asset.usefulLife <= 0) {
            errors.push('Useful life is required for depreciable assets');
        }
        
        if (asset.salvageValue && asset.salvageValue > asset.purchaseCost) {
            errors.push('Salvage value cannot exceed purchase cost');
        }
    }

    // Validate dates
    if (asset.purchaseDate && asset.disposalDate && new Date(asset.purchaseDate) > new Date(asset.disposalDate)) {
        errors.push('Disposal date must be after purchase date');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {
    validateAccountCode,
    validateAccountType,
    validateNormalBalance,
    validateJournalEntry,
    validateInvoice,
    validateTaxRate,
    validateBudget,
    validateAsset
};