// src/middleware/validation.middleware.js
const { body, validationResult } = require('express-validator');

const validateRegistration = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    
    body('firstName')
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ max: 50 })
        .withMessage('First name cannot exceed 50 characters'),
    
    body('lastName')
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ max: 50 })
        .withMessage('Last name cannot exceed 50 characters'),
    
    // More flexible phone validation - just check if it's a string if provided
    body('phoneNumber')
        .optional()
        .isString()
        .withMessage('Phone number must be a string')
        .isLength({ max: 20 })
        .withMessage('Phone number cannot exceed 20 characters'),
    
    body('dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('Please provide a valid date (YYYY-MM-DD)'),
    
    body('gender')
        .optional()
        .isIn(['male', 'female', 'other', 'prefer-not-to-say'])
        .withMessage('Invalid gender value'),
    
    // Bio is completely optional - no validation
    body('bio')
        .optional(),
    
    // Address fields are optional
    body('address.street')
        .optional()
        .isString(),
    body('address.city')
        .optional()
        .isString(),
    body('address.state')
        .optional()
        .isString(),
    body('address.country')
        .optional()
        .isString(),
    body('address.zipCode')
        .optional()
        .isString(),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        next();
    }
];

const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        next();
    }
];

const validateProfileUpdate = [
    body('firstName')
        .optional()
        .isLength({ max: 50 })
        .withMessage('First name cannot exceed 50 characters'),
    
    body('lastName')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Last name cannot exceed 50 characters'),
    
    body('displayName')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Display name cannot exceed 100 characters'),
    
    body('phoneNumber')
        .optional()
        .isString()
        .withMessage('Phone number must be a string')
        .isLength({ max: 20 })
        .withMessage('Phone number cannot exceed 20 characters'),
    
    body('dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('Please provide a valid date'),
    
    body('gender')
        .optional()
        .isIn(['male', 'female', 'other', 'prefer-not-to-say'])
        .withMessage('Invalid gender value'),
    
    body('bio')
        .optional(),
    
    body('address')
        .optional(),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }
        next();
    }
];

module.exports = {
    validateRegistration,
    validateLogin,
    validateProfileUpdate
};