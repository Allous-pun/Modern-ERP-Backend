// src/utils/hr/validators.js

/**
 * Validate employee ID format
 * @param {string} employeeId - Employee ID to validate
 * @returns {boolean} Is valid
 */
const validateEmployeeId = (employeeId) => {
    if (!employeeId || typeof employeeId !== 'string') return false;
    
    // Common patterns: EMP001, E-2024-001, 2024-EMP-001
    const patterns = [
        /^EMP\d{3,6}$/i,                    // EMP001, EMP0001
        /^E-\d{4}-\d{3,6}$/i,                // E-2024-001
        /^\d{4}-EMP-\d{3,6}$/i,              // 2024-EMP-001
        /^[A-Z]{2,4}\d{4,6}$/i               // HR2024001
    ];
    
    return patterns.some(pattern => pattern.test(employeeId));
};

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
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @param {string} country - Country code (optional)
 * @returns {boolean} Is valid
 */
const validatePhone = (phone, country = 'any') => {
    if (!phone || typeof phone !== 'string') return false;
    
    // Remove common separators
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    
    const patterns = {
        'any': /^\d{7,15}$/,
        'US': /^\d{10}$/,
        'UK': /^\d{10,11}$/,
        'KE': /^\d{9,12}$/,
        'TZ': /^\d{9,12}$/
    };
    
    const pattern = patterns[country] || patterns.any;
    return pattern.test(cleaned);
};

/**
 * Validate date of birth
 * @param {Date|string} dob - Date of birth
 * @param {number} minAge - Minimum age (default: 18)
 * @param {number} maxAge - Maximum age (default: 100)
 * @returns {Object} Validation result
 */
const validateDateOfBirth = (dob, minAge = 18, maxAge = 100) => {
    if (!dob) return { valid: false, message: 'Date of birth is required' };
    
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) {
        return { valid: false, message: 'Invalid date format' };
    }
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    if (age < minAge) {
        return { valid: false, message: `Employee must be at least ${minAge} years old` };
    }
    
    if (age > maxAge) {
        return { valid: false, message: `Age cannot exceed ${maxAge} years` };
    }
    
    return { valid: true, age };
};

/**
 * Validate hire date
 * @param {Date|string} hireDate - Hire date to validate
 * @param {Date|string} dob - Date of birth (optional)
 * @returns {Object} Validation result
 */
const validateHireDate = (hireDate, dob = null) => {
    if (!hireDate) return { valid: false, message: 'Hire date is required' };
    
    const hire = new Date(hireDate);
    if (isNaN(hire.getTime())) {
        return { valid: false, message: 'Invalid date format' };
    }
    
    const today = new Date();
    
    if (hire > today) {
        return { valid: false, message: 'Hire date cannot be in the future' };
    }
    
    if (dob) {
        const birthDate = new Date(dob);
        if (!isNaN(birthDate.getTime()) && hire < birthDate) {
            return { valid: false, message: 'Hire date cannot be before date of birth' };
        }
        
        const ageAtHire = hire.getFullYear() - birthDate.getFullYear();
        if (ageAtHire < 15) {
            return { valid: false, message: 'Employee must be at least 15 years old at hire date' };
        }
    }
    
    return { valid: true };
};

/**
 * Validate leave dates
 * @param {Date|string} startDate - Leave start date
 * @param {Date|string} endDate - Leave end date
 * @param {Date|string} hireDate - Employee hire date (optional)
 * @returns {Object} Validation result
 */
const validateLeaveDates = (startDate, endDate, hireDate = null) => {
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
    
    if (hireDate) {
        const hire = new Date(hireDate);
        if (!isNaN(hire.getTime()) && start < hire) {
            return { valid: false, message: 'Leave cannot start before hire date' };
        }
    }
    
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    return { valid: true, days };
};

/**
 * Validate salary amount
 * @param {number} amount - Salary amount
 * @param {string} currency - Currency code
 * @param {string} frequency - Payment frequency
 * @returns {Object} Validation result
 */
const validateSalary = (amount, currency = 'USD', frequency = 'monthly') => {
    if (!amount || amount < 0) {
        return { valid: false, message: 'Salary amount must be positive' };
    }
    
    if (amount > 10000000) { // 10 million max
        return { valid: false, message: 'Salary amount exceeds maximum allowed' };
    }
    
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KES', 'TZS'];
    if (!validCurrencies.includes(currency)) {
        return { valid: false, message: 'Invalid currency code' };
    }
    
    const validFrequencies = ['hourly', 'daily', 'weekly', 'bi-weekly', 'monthly', 'annual'];
    if (!validFrequencies.includes(frequency)) {
        return { valid: false, message: 'Invalid payment frequency' };
    }
    
    return { valid: true };
};

/**
 * Validate tax ID
 * @param {string} taxId - Tax ID to validate
 * @param {string} country - Country code
 * @returns {Object} Validation result
 */
const validateTaxId = (taxId, country = 'US') => {
    if (!taxId || typeof taxId !== 'string') {
        return { valid: false, message: 'Tax ID is required' };
    }
    
    const cleaned = taxId.replace(/[\s\-]/g, '');
    
    const patterns = {
        'US': /^\d{9}$/,                    // SSN: 9 digits
        'UK': /^[A-Z]{2}\d{6}[A-Z]$/,       // UK National Insurance
        'KE': /^[A-Z]\d{9}[A-Z]$/,           // Kenya PIN
        'TZ': /^\d{9}[A-Z]$/                  // Tanzania TIN
    };
    
    const pattern = patterns[country];
    if (!pattern) {
        return { valid: true }; // Skip validation for unknown countries
    }
    
    if (!pattern.test(cleaned)) {
        return { valid: false, message: `Invalid tax ID format for ${country}` };
    }
    
    return { valid: true };
};

/**
 * Validate bank account details
 * @param {Object} bankDetails - Bank account details
 * @returns {Object} Validation result
 */
const validateBankDetails = (bankDetails) => {
    const errors = [];
    
    if (!bankDetails.bankName || bankDetails.bankName.length < 2) {
        errors.push('Bank name is required');
    }
    
    if (!bankDetails.accountName || bankDetails.accountName.length < 2) {
        errors.push('Account name is required');
    }
    
    if (!bankDetails.accountNumber) {
        errors.push('Account number is required');
    } else if (!/^\d{8,20}$/.test(bankDetails.accountNumber.replace(/[\s\-]/g, ''))) {
        errors.push('Invalid account number format');
    }
    
    if (bankDetails.swiftCode && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bankDetails.swiftCode)) {
        errors.push('Invalid SWIFT code format');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Validate leave balance
 * @param {number} requested - Requested leave days
 * @param {number} available - Available leave days
 * @param {string} leaveType - Type of leave
 * @returns {Object} Validation result
 */
const validateLeaveBalance = (requested, available, leaveType) => {
    if (requested <= 0) {
        return { valid: false, message: 'Leave days must be positive' };
    }
    
    if (requested > available) {
        return { 
            valid: false, 
            message: `Insufficient ${leaveType} leave balance. Available: ${available}, Requested: ${requested}`
        };
    }
    
    return { valid: true };
};

/**
 * Validate performance score
 * @param {number} score - Performance score
 * @param {number} min - Minimum allowed (default: 0)
 * @param {number} max - Maximum allowed (default: 100)
 * @returns {Object} Validation result
 */
const validatePerformanceScore = (score, min = 0, max = 100) => {
    if (score === null || score === undefined) {
        return { valid: false, message: 'Score is required' };
    }
    
    if (typeof score !== 'number' || isNaN(score)) {
        return { valid: false, message: 'Score must be a number' };
    }
    
    if (score < min || score > max) {
        return { valid: false, message: `Score must be between ${min} and ${max}` };
    }
    
    return { valid: true };
};

/**
 * Validate employment type
 * @param {string} type - Employment type
 * @returns {Object} Validation result
 */
const validateEmploymentType = (type) => {
    const validTypes = ['full-time', 'part-time', 'contract', 'intern', 'temporary', 'consultant'];
    
    if (!type) {
        return { valid: false, message: 'Employment type is required' };
    }
    
    if (!validTypes.includes(type)) {
        return { valid: false, message: `Invalid employment type. Must be one of: ${validTypes.join(', ')}` };
    }
    
    return { valid: true };
};

/**
 * Validate employment status
 * @param {string} status - Employment status
 * @returns {Object} Validation result
 */
const validateEmploymentStatus = (status) => {
    const validStatuses = ['active', 'probation', 'notice', 'terminated', 'resigned', 'retired', 'on-leave'];
    
    if (!status) {
        return { valid: false, message: 'Employment status is required' };
    }
    
    if (!validStatuses.includes(status)) {
        return { valid: false, message: `Invalid employment status. Must be one of: ${validStatuses.join(', ')}` };
    }
    
    return { valid: true };
};

/**
 * Validate gender
 * @param {string} gender - Gender value
 * @returns {Object} Validation result
 */
const validateGender = (gender) => {
    const validGenders = ['male', 'female', 'other', 'prefer-not-to-say'];
    
    if (!gender) return { valid: true }; // Gender is optional
    
    if (!validGenders.includes(gender)) {
        return { valid: false, message: `Invalid gender. Must be one of: ${validGenders.join(', ')}` };
    }
    
    return { valid: true };
};

/**
 * Validate marital status
 * @param {string} status - Marital status
 * @returns {Object} Validation result
 */
const validateMaritalStatus = (status) => {
    const validStatuses = ['single', 'married', 'divorced', 'widowed', 'other'];
    
    if (!status) return { valid: true }; // Marital status is optional
    
    if (!validStatuses.includes(status)) {
        return { valid: false, message: `Invalid marital status. Must be one of: ${validStatuses.join(', ')}` };
    }
    
    return { valid: true };
};

/**
 * Validate department
 * @param {string} department - Department name
 * @returns {Object} Validation result
 */
const validateDepartment = (department) => {
    if (!department || typeof department !== 'string') {
        return { valid: false, message: 'Department is required' };
    }
    
    if (department.length < 2 || department.length > 50) {
        return { valid: false, message: 'Department must be between 2 and 50 characters' };
    }
    
    return { valid: true };
};

/**
 * Validate position
 * @param {string} position - Job position
 * @returns {Object} Validation result
 */
const validatePosition = (position) => {
    if (!position || typeof position !== 'string') {
        return { valid: false, message: 'Position is required' };
    }
    
    if (position.length < 2 || position.length > 100) {
        return { valid: false, message: 'Position must be between 2 and 100 characters' };
    }
    
    return { valid: true };
};

/**
 * Validate training dates
 * @param {Object} training - Training object
 * @returns {Object} Validation result
 */
const validateTrainingDates = (training) => {
    if (!training.startDate || !training.endDate) {
        return { valid: false, message: 'Start date and end date are required' };
    }
    
    const start = new Date(training.startDate);
    const end = new Date(training.endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { valid: false, message: 'Invalid date format' };
    }
    
    if (start > end) {
        return { valid: false, message: 'Start date must be before end date' };
    }
    
    if (start < new Date()) {
        return { valid: false, message: 'Training cannot start in the past' };
    }
    
    const duration = (end - start) / (1000 * 60 * 60 * 24);
    if (duration > 365) {
        return { valid: false, message: 'Training duration cannot exceed 365 days' };
    }
    
    return { valid: true };
};

/**
 * Validate emergency contact
 * @param {Object} contact - Emergency contact object
 * @returns {Object} Validation result
 */
const validateEmergencyContact = (contact) => {
    const errors = [];
    
    if (!contact.name || contact.name.length < 2) {
        errors.push('Contact name is required');
    }
    
    if (!contact.relationship || contact.relationship.length < 2) {
        errors.push('Relationship is required');
    }
    
    if (!contact.phone) {
        errors.push('Phone number is required');
    } else {
        const phoneValid = validatePhone(contact.phone);
        if (!phoneValid) errors.push('Invalid phone number format');
    }
    
    if (contact.email && !validateEmail(contact.email)) {
        errors.push('Invalid email format');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};

module.exports = {
    validateEmployeeId,
    validateEmail,
    validatePhone,
    validateDateOfBirth,
    validateHireDate,
    validateLeaveDates,
    validateSalary,
    validateTaxId,
    validateBankDetails,
    validateLeaveBalance,
    validatePerformanceScore,
    validateEmploymentType,
    validateEmploymentStatus,
    validateGender,
    validateMaritalStatus,
    validateDepartment,
    validatePosition,
    validateTrainingDates,
    validateEmergencyContact
};