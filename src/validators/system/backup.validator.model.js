// src/validators/system/backup.validator.js
const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
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

// Validate create backup
const validateCreateBackup = [
    body('includes')
        .optional()
        .isArray()
        .withMessage('Includes must be an array')
        .custom((value) => {
            const allowed = ['users', 'roles', 'settings', 'modules', 'finance', 'hr', 'sales', 'all'];
            if (value && value.length > 0) {
                for (const item of value) {
                    if (!allowed.includes(item)) {
                        throw new Error(`Invalid include value: ${item}. Allowed: ${allowed.join(', ')}`);
                    }
                }
            }
            return true;
        }),
    body('notes')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters'),
    handleValidationErrors
];

// Validate backup ID parameter
const validateBackupId = [
    param('id')
        .isMongoId()
        .withMessage('Invalid backup ID format'),
    handleValidationErrors
];

// Validate pagination query
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('status')
        .optional()
        .isIn(['pending', 'in_progress', 'completed', 'failed', 'restoring'])
        .withMessage('Invalid status value'),
    query('type')
        .optional()
        .isIn(['manual', 'automated', 'scheduled'])
        .withMessage('Invalid type value'),
    handleValidationErrors
];

module.exports = {
    validateCreateBackup,
    validateBackupId,
    validatePagination
};