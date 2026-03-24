// src/validators/system/privacy.validator.js
const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Validate retention policies update
const validateRetentionUpdate = [
    body('userDataRetentionDays')
        .optional()
        .isInt({ min: 30, max: 3650 })
        .withMessage('User data retention must be between 30 and 3650 days'),
    
    body('activityLogRetentionDays')
        .optional()
        .isInt({ min: 30, max: 730 })
        .withMessage('Activity log retention must be between 30 and 730 days'),
    
    body('financialDataRetentionDays')
        .optional()
        .isInt({ min: 365, max: 3650 })
        .withMessage('Financial data retention must be between 365 and 3650 days'),
    
    body('hrDataRetentionDays')
        .optional()
        .isInt({ min: 365, max: 3650 })
        .withMessage('HR data retention must be between 365 and 3650 days'),
    
    body('autoAnonymizeAfterRetention')
        .optional()
        .isBoolean()
        .withMessage('autoAnonymizeAfterRetention must be a boolean'),
    
    handleValidationErrors
];

// Validate consent settings update
const validateConsentUpdate = [
    body('requireConsentForDataProcessing')
        .optional()
        .isBoolean()
        .withMessage('requireConsentForDataProcessing must be a boolean'),
    
    body('consentVersion')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Consent version cannot exceed 20 characters'),
    
    body('consentText')
        .optional()
        .isString()
        .trim(),
    
    body('purposes')
        .optional()
        .isArray()
        .withMessage('Purposes must be an array'),
    
    body('purposes.*.purposeId')
        .if(body('purposes').exists())
        .notEmpty()
        .withMessage('Purpose ID is required'),
    
    body('purposes.*.purposeName')
        .if(body('purposes').exists())
        .notEmpty()
        .withMessage('Purpose name is required'),
    
    handleValidationErrors
];

// Validate record user consent
const validateRecordConsent = [
    body('userId')
        .isMongoId()
        .withMessage('Invalid user ID'),
    
    body('consentedPurposes')
        .isArray({ min: 1 })
        .withMessage('At least one purpose must be selected'),
    
    body('consentedPurposes.*')
        .isString()
        .withMessage('Invalid purpose ID'),
    
    handleValidationErrors
];

// Validate DSR creation
const validateDsrCreate = [
    body('userId')
        .isMongoId()
        .withMessage('Invalid user ID'),
    
    body('requestType')
        .isIn(['access', 'rectification', 'erasure', 'restrict', 'portability', 'object'])
        .withMessage('Invalid request type'),
    
    body('description')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    
    handleValidationErrors
];

// Validate DSR update
const validateDsrUpdate = [
    param('requestId')
        .matches(/^DSR-\d{4}-\d{4}$/)
        .withMessage('Invalid request ID format'),
    
    body('status')
        .isIn(['pending', 'in_progress', 'completed', 'rejected', 'expired'])
        .withMessage('Invalid status'),
    
    body('rejectionReason')
        .if(body('status').equals('rejected'))
        .notEmpty()
        .withMessage('Rejection reason is required when rejecting a request'),
    
    body('notes')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters'),
    
    handleValidationErrors
];

// Validate privacy policy creation
const validatePrivacyPolicy = [
    body('version')
        .notEmpty()
        .withMessage('Version is required')
        .isString()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Version cannot exceed 20 characters'),
    
    body('effectiveDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid effective date'),
    
    body('content')
        .notEmpty()
        .withMessage('Policy content is required')
        .isString()
        .trim(),
    
    body('notes')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters'),
    
    handleValidationErrors
];

// Validate DPA upload
const validateDPA = [
    body('title')
        .notEmpty()
        .withMessage('Title is required')
        .isString()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Title cannot exceed 200 characters'),
    
    body('counterparty')
        .notEmpty()
        .withMessage('Counterparty is required')
        .isString()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Counterparty name cannot exceed 200 characters'),
    
    body('agreementDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid agreement date'),
    
    body('effectiveDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid effective date'),
    
    body('expiryDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid expiry date'),
    
    body('scope')
        .optional()
        .isString()
        .trim(),
    
    handleValidationErrors
];

// Validate data breach report
const validateBreachReport = [
    body('discoveryDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid discovery date'),
    
    body('description')
        .notEmpty()
        .withMessage('Description is required')
        .isString()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Description cannot exceed 2000 characters'),
    
    body('affectedData')
        .optional()
        .isArray()
        .withMessage('affectedData must be an array'),
    
    body('affectedUsers')
        .optional()
        .isArray()
        .withMessage('affectedUsers must be an array'),
    
    body('affectedUsers.*')
        .optional()
        .isMongoId()
        .withMessage('Invalid user ID'),
    
    body('affectedRecords')
        .optional()
        .isInt({ min: 0 })
        .withMessage('affectedRecords must be a positive number'),
    
    body('riskAssessment')
        .optional()
        .isString()
        .trim(),
    
    body('actionsTaken')
        .optional()
        .isString()
        .trim(),
    
    handleValidationErrors
];

// Validate GDPR settings update
const validateGdprUpdate = [
    body('dataProtectionOfficer')
        .optional()
        .isObject()
        .withMessage('dataProtectionOfficer must be an object'),
    
    body('dataProtectionOfficer.name')
        .optional()
        .isString()
        .trim(),
    
    body('dataProtectionOfficer.email')
        .optional()
        .isEmail()
        .withMessage('Invalid email format'),
    
    body('representativeInEU')
        .optional()
        .isObject(),
    
    body('supervisoryAuthority')
        .optional()
        .isObject(),
    
    body('crossBorderTransfers')
        .optional()
        .isBoolean(),
    
    body('adequacyDecisions')
        .optional()
        .isArray(),
    
    handleValidationErrors
];

// Validate pagination
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    handleValidationErrors
];

module.exports = {
    validateRetentionUpdate,
    validateConsentUpdate,
    validateRecordConsent,
    validateDsrCreate,
    validateDsrUpdate,
    validatePrivacyPolicy,
    validateDPA,
    validateBreachReport,
    validateGdprUpdate,
    validatePagination
};