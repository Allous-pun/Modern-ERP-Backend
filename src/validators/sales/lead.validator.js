// src/validators/sales/lead.validator.js
const { body, param, query } = require('express-validator');
const { STAGES } = require('../../utils/sales/stages');
const { validateEmail, validatePhone, validateURL } = require('../../utils/sales/validators');

const validateLead = {
    create: [
        body('firstName')
            .notEmpty().withMessage('First name is required')
            .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters')
            .trim(),
        
        body('lastName')
            .notEmpty().withMessage('Last name is required')
            .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters')
            .trim(),
        
        body('email')
            .notEmpty().withMessage('Email is required')
            .custom(validateEmail).withMessage('Invalid email format')
            .normalizeEmail(),
        
        body('phone')
            .optional()
            .custom(validatePhone).withMessage('Invalid phone number format'),
        
        body('company')
            .optional()
            .isLength({ max: 100 }).withMessage('Company name cannot exceed 100 characters')
            .trim(),
        
        body('position')
            .optional()
            .isLength({ max: 100 }).withMessage('Position cannot exceed 100 characters')
            .trim(),
        
        body('website')
            .optional()
            .custom(validateURL).withMessage('Invalid URL format'),
        
        body('industry')
            .optional()
            .isLength({ max: 50 }).withMessage('Industry cannot exceed 50 characters'),
        
        body('source')
            .optional()
            .isIn(['website', 'referral', 'social_media', 'email_campaign', 'phone_inquiry', 'event', 'partner', 'other'])
            .withMessage('Invalid source'),
        
        body('status')
            .optional()
            .isIn(Object.values(STAGES.LEAD))
            .withMessage('Invalid lead status'),
        
        body('assignedTo')
            .optional()
            .isMongoId().withMessage('Invalid user ID'),
        
        body('budget')
            .optional()
            .isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
        
        body('authority')
            .optional()
            .isIn(['low', 'medium', 'high']).withMessage('Invalid authority level'),
        
        body('tags')
            .optional()
            .isArray().withMessage('Tags must be an array'),
        
        body('notes')
            .optional()
            .isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters')
    ],
    
    update: [
        param('id')
            .isMongoId().withMessage('Invalid lead ID'),
        
        body('firstName')
            .optional()
            .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters')
            .trim(),
        
        body('lastName')
            .optional()
            .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters')
            .trim(),
        
        body('email')
            .optional()
            .custom(validateEmail).withMessage('Invalid email format')
            .normalizeEmail(),
        
        body('phone')
            .optional()
            .custom(validatePhone).withMessage('Invalid phone number format'),
        
        body('status')
            .optional()
            .isIn(Object.values(STAGES.LEAD))
            .withMessage('Invalid lead status'),
        
        body('assignedTo')
            .optional()
            .isMongoId().withMessage('Invalid user ID')
    ],
    
    convert: [
        param('id')
            .isMongoId().withMessage('Invalid lead ID'),
        
        body('customerData')
            .optional()
            .isObject().withMessage('Customer data must be an object'),
        
        body('opportunityData')
            .optional()
            .isObject().withMessage('Opportunity data must be an object')
    ],
    
    list: [
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page must be a positive integer')
            .toInt(),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
            .toInt(),
        
        query('status')
            .optional()
            .isIn(Object.values(STAGES.LEAD))
            .withMessage('Invalid status filter'),
        
        query('source')
            .optional()
            .isString().withMessage('Source must be a string'),
        
        query('assignedTo')
            .optional()
            .isMongoId().withMessage('Invalid user ID'),
        
        query('sortBy')
            .optional()
            .isIn(['createdAt', 'firstName', 'lastName', 'email', 'score'])
            .withMessage('Invalid sort field'),
        
        query('sortOrder')
            .optional()
            .isIn(['1', '-1']).withMessage('Sort order must be 1 or -1')
            .toInt()
    ]
};

module.exports = validateLead;