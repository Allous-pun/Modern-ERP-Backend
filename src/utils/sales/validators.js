// src/utils/sales/validators.js

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid
 */
const validateEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Is valid
 */
const validatePhone = (phone) => {
    if (!phone || typeof phone !== 'string') return false;
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}$/;
    return phoneRegex.test(phone);
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} Is valid
 */
const validateURL = (url) => {
    if (!url || typeof url !== 'string') return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Validate price/amount
 * @param {number} amount - Amount to validate
 * @param {number} min - Minimum allowed (default: 0)
 * @param {number} max - Maximum allowed (optional)
 * @returns {Object} Validation result
 */
const validateAmount = (amount, min = 0, max = null) => {
    if (amount === null || amount === undefined) {
        return { valid: false, message: 'Amount is required' };
    }
    
    if (typeof amount !== 'number' || isNaN(amount)) {
        return { valid: false, message: 'Amount must be a number' };
    }
    
    if (amount < min) {
        return { valid: false, message: `Amount must be at least ${min}` };
    }
    
    if (max !== null && amount > max) {
        return { valid: false, message: `Amount cannot exceed ${max}` };
    }
    
    return { valid: true };
};

/**
 * Validate quantity
 * @param {number} quantity - Quantity to validate
 * @param {number} min - Minimum allowed (default: 1)
 * @param {number} max - Maximum allowed (optional)
 * @returns {Object} Validation result
 */
const validateQuantity = (quantity, min = 1, max = null) => {
    if (quantity === null || quantity === undefined) {
        return { valid: false, message: 'Quantity is required' };
    }
    
    if (typeof quantity !== 'number' || isNaN(quantity) || !Number.isInteger(quantity)) {
        return { valid: false, message: 'Quantity must be an integer' };
    }
    
    if (quantity < min) {
        return { valid: false, message: `Quantity must be at least ${min}` };
    }
    
    if (max !== null && quantity > max) {
        return { valid: false, message: `Quantity cannot exceed ${max}` };
    }
    
    return { valid: true };
};

/**
 * Validate percentage
 * @param {number} percentage - Percentage to validate
 * @param {number} min - Minimum allowed (default: 0)
 * @param {number} max - Maximum allowed (default: 100)
 * @returns {Object} Validation result
 */
const validatePercentage = (percentage, min = 0, max = 100) => {
    if (percentage === null || percentage === undefined) {
        return { valid: false, message: 'Percentage is required' };
    }
    
    if (typeof percentage !== 'number' || isNaN(percentage)) {
        return { valid: false, message: 'Percentage must be a number' };
    }
    
    if (percentage < min || percentage > max) {
        return { valid: false, message: `Percentage must be between ${min} and ${max}` };
    }
    
    return { valid: true };
};

/**
 * Validate date range
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Object} Validation result
 */
const validateDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) {
        return { valid: false, message: 'Start date and end date are required' };
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { valid: false, message: 'Invalid date format' };
    }
    
    if (start > end) {
        return { valid: false, message: 'Start date must be before end date' };
    }
    
    return { valid: true, start, end };
};

/**
 * Validate SKU format
 * @param {string} sku - SKU to validate
 * @returns {boolean} Is valid
 */
const validateSKU = (sku) => {
    if (!sku || typeof sku !== 'string') return false;
    const skuRegex = /^[A-Z0-9]{3,20}$/;
    return skuRegex.test(sku);
};

/**
 * Validate tax rate
 * @param {number} rate - Tax rate to validate
 * @returns {Object} Validation result
 */
const validateTaxRate = (rate) => {
    return validatePercentage(rate, 0, 100);
};

/**
 * Validate discount
 * @param {number} discount - Discount value
 * @param {string} type - Discount type
 * @param {number} price - Original price (for percentage validation)
 * @returns {Object} Validation result
 */
const validateDiscount = (discount, type, price = null) => {
    if (discount === null || discount === undefined) {
        return { valid: false, message: 'Discount is required' };
    }
    
    if (typeof discount !== 'number' || isNaN(discount) || discount < 0) {
        return { valid: false, message: 'Discount must be a positive number' };
    }
    
    if (type === 'percentage') {
        if (discount > 100) {
            return { valid: false, message: 'Percentage discount cannot exceed 100%' };
        }
        if (price !== null && discount > 0) {
            const discountAmount = (price * discount) / 100;
            if (discountAmount > price) {
                return { valid: false, message: 'Discount amount cannot exceed price' };
            }
        }
    } else if (type === 'fixed' && price !== null && discount > price) {
        return { valid: false, message: 'Discount cannot exceed price' };
    }
    
    return { valid: true };
};

/**
 * Validate lead stage
 * @param {string} stage - Lead stage
 * @returns {boolean} Is valid
 */
const validateLeadStage = (stage) => {
    const validStages = ['new', 'contacted', 'qualified', 'unqualified', 'working', 'nurturing', 'converted', 'lost'];
    return validStages.includes(stage);
};

/**
 * Validate opportunity stage
 * @param {string} stage - Opportunity stage
 * @returns {boolean} Is valid
 */
const validateOpportunityStage = (stage) => {
    const validStages = ['qualification', 'needs-analysis', 'proposal', 'negotiation', 'closed-won', 'closed-lost'];
    return validStages.includes(stage);
};

/**
 * Validate order status
 * @param {string} status - Order status
 * @returns {boolean} Is valid
 */
const validateOrderStatus = (status) => {
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded', 'on-hold'];
    return validStatuses.includes(status);
};

/**
 * Validate payment method
 * @param {string} method - Payment method
 * @returns {boolean} Is valid
 */
const validatePaymentMethod = (method) => {
    const validMethods = ['cash', 'credit_card', 'bank_transfer', 'check', 'other'];
    return validMethods.includes(method);
};

/**
 * Validate currency code
 * @param {string} currency - Currency code
 * @returns {boolean} Is valid
 */
const validateCurrency = (currency) => {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF', 'HKD', 'SGD'];
    return validCurrencies.includes(currency);
};

/**
 * Validate probability
 * @param {number} probability - Probability percentage
 * @returns {Object} Validation result
 */
const validateProbability = (probability) => {
    return validatePercentage(probability, 0, 100);
};

/**
 * Validate address
 * @param {Object} address - Address object
 * @returns {Object} Validation result
 */
const validateAddress = (address) => {
    if (!address) return { valid: false, message: 'Address is required' };
    
    const requiredFields = ['street', 'city', 'country'];
    const errors = [];
    
    requiredFields.forEach(field => {
        if (!address[field] || typeof address[field] !== 'string' || address[field].trim() === '') {
            errors.push(`${field} is required`);
        }
    });
    
    if (address.postalCode && typeof address.postalCode !== 'string') {
        errors.push('Postal code must be a string');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};

module.exports = {
    validateEmail,
    validatePhone,
    validateURL,
    validateAmount,
    validateQuantity,
    validatePercentage,
    validateDateRange,
    validateSKU,
    validateTaxRate,
    validateDiscount,
    validateLeadStage,
    validateOpportunityStage,
    validateOrderStatus,
    validatePaymentMethod,
    validateCurrency,
    validateProbability,
    validateAddress
};