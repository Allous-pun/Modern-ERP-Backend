// src/validators/sales/quote.validator.js
const { body, param, query } = require('express-validator');
const { STAGES } = require('../../utils/sales/stages');

const validateQuote = {
    create: [
        body('opportunity')
            .optional()
            .isMongoId().withMessage('Invalid opportunity ID'),
        
        body('customer')
            .notEmpty().withMessage('Customer is required')
            .isMongoId().withMessage('Invalid customer ID'),
        
        body('contact')
            .optional()
            .isMongoId().withMessage('Invalid contact ID'),
        
        body('validUntil')
            .notEmpty().withMessage('Valid until date is required')
            .isISO8601().withMessage('Invalid date format')
            .toDate(),
        
        body('items')
            .isArray({ min: 1 }).withMessage('At least one item is required'),
        
        body('items.*.product')
            .isMongoId().withMessage('Invalid product ID'),
        
        body('items.*.description')
            .notEmpty().withMessage('Item description is required')
            .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
        
        body('items.*.quantity')
            .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        
        body('items.*.unitPrice')
            .isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
        
        body('items.*.discount')
            .optional()
            .isFloat({ min: 0 }).withMessage('Discount must be a positive number'),
        
        body('items.*.taxRate')
            .optional()
            .isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
        
        body('shippingCost')
            .optional()
            .isFloat({ min: 0 }).withMessage('Shipping cost must be a positive number'),
        
        body('paymentTerms')
            .optional()
            .isString().withMessage('Payment terms must be a string'),
        
        body('notes')
            .optional()
            .isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters'),
        
        body('terms')
            .optional()
            .isLength({ max: 5000 }).withMessage('Terms cannot exceed 5000 characters')
    ],
    
    update: [
        param('id')
            .isMongoId().withMessage('Invalid quote ID'),
        
        body('validUntil')
            .optional()
            .isISO8601().withMessage('Invalid date format')
            .toDate(),
        
        body('items')
            .optional()
            .isArray().withMessage('Items must be an array'),
        
        body('status')
            .optional()
            .isIn(Object.values(STAGES.QUOTE))
            .withMessage('Invalid quote status')
    ],
    
    approve: [
        param('id')
            .isMongoId().withMessage('Invalid quote ID'),
        
        body('comments')
            .optional()
            .isLength({ max: 500 }).withMessage('Comments cannot exceed 500 characters')
    ],
    
    reject: [
        param('id')
            .isMongoId().withMessage('Invalid quote ID'),
        
        body('reason')
            .notEmpty().withMessage('Rejection reason is required')
            .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
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
            .isIn(Object.values(STAGES.QUOTE))
            .withMessage('Invalid status filter'),
        
        query('customerId')
            .optional()
            .isMongoId().withMessage('Invalid customer ID'),
        
        query('opportunityId')
            .optional()
            .isMongoId().withMessage('Invalid opportunity ID'),
        
        query('sortBy')
            .optional()
            .isIn(['createdAt', 'quoteNumber', 'validUntil', 'total'])
            .withMessage('Invalid sort field'),
        
        query('sortOrder')
            .optional()
            .isIn(['1', '-1']).withMessage('Sort order must be 1 or -1')
            .toInt()
    ]
};

module.exports = validateQuote;