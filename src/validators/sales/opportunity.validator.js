// src/validators/sales/opportunity.validator.js
const { body, param, query } = require('express-validator');
const { STAGES } = require('../../utils/sales/stages');

const validateOpportunity = {
    create: [
        body('name')
            .notEmpty().withMessage('Opportunity name is required')
            .isLength({ max: 200 }).withMessage('Name cannot exceed 200 characters')
            .trim(),
        
        body('description')
            .optional()
            .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters')
            .trim(),
        
        body('customer')
            .notEmpty().withMessage('Customer is required')
            .isMongoId().withMessage('Invalid customer ID'),
        
        body('contact')
            .optional()
            .isMongoId().withMessage('Invalid contact ID'),
        
        body('lead')
            .optional()
            .isMongoId().withMessage('Invalid lead ID'),
        
        body('stage')
            .optional()
            .isIn(Object.values(STAGES.OPPORTUNITY))
            .withMessage('Invalid opportunity stage'),
        
        body('amount')
            .notEmpty().withMessage('Amount is required')
            .isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
        
        body('currency')
            .optional()
            .isString().withMessage('Currency must be a string')
            .isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters')
            .toUpperCase(),
        
        body('probability')
            .optional()
            .isInt({ min: 0, max: 100 }).withMessage('Probability must be between 0 and 100'),
        
        body('expectedCloseDate')
            .notEmpty().withMessage('Expected close date is required')
            .isISO8601().withMessage('Invalid date format')
            .toDate(),
        
        body('assignedTo')
            .notEmpty().withMessage('Assigned user is required')
            .isMongoId().withMessage('Invalid user ID'),
        
        body('products')
            .optional()
            .isArray().withMessage('Products must be an array'),
        
        body('products.*.product')
            .if(body('products').exists())
            .isMongoId().withMessage('Invalid product ID'),
        
        body('products.*.quantity')
            .if(body('products').exists())
            .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        
        body('products.*.unitPrice')
            .if(body('products').exists())
            .isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
        
        body('products.*.discount')
            .optional()
            .isFloat({ min: 0 }).withMessage('Discount must be a positive number'),
        
        body('competitors')
            .optional()
            .isArray().withMessage('Competitors must be an array'),
        
        body('competitors.*.name')
            .if(body('competitors').exists())
            .isString().withMessage('Competitor name must be a string')
            .isLength({ max: 100 }).withMessage('Competitor name cannot exceed 100 characters'),
        
        body('team')
            .optional()
            .isArray().withMessage('Team must be an array'),
        
        body('team.*.user')
            .if(body('team').exists())
            .isMongoId().withMessage('Invalid user ID'),
        
        body('team.*.role')
            .if(body('team').exists())
            .isString().withMessage('Role must be a string')
            .isLength({ max: 50 }).withMessage('Role cannot exceed 50 characters'),
        
        body('team.*.contribution')
            .optional()
            .isInt({ min: 0, max: 100 }).withMessage('Contribution must be between 0 and 100'),
        
        body('tags')
            .optional()
            .isArray().withMessage('Tags must be an array'),
        
        body('tags.*')
            .optional()
            .isString().withMessage('Tag must be a string')
            .isLength({ max: 30 }).withMessage('Tag cannot exceed 30 characters')
            .toLowerCase(),
        
        body('notes')
            .optional()
            .isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters')
            .trim()
    ],
    
    update: [
        param('id')
            .isMongoId().withMessage('Invalid opportunity ID'),
        
        body('name')
            .optional()
            .isLength({ max: 200 }).withMessage('Name cannot exceed 200 characters')
            .trim(),
        
        body('description')
            .optional()
            .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters')
            .trim(),
        
        body('contact')
            .optional()
            .isMongoId().withMessage('Invalid contact ID'),
        
        body('stage')
            .optional()
            .isIn(Object.values(STAGES.OPPORTUNITY))
            .withMessage('Invalid opportunity stage'),
        
        body('amount')
            .optional()
            .isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
        
        body('currency')
            .optional()
            .isString().withMessage('Currency must be a string')
            .isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters')
            .toUpperCase(),
        
        body('probability')
            .optional()
            .isInt({ min: 0, max: 100 }).withMessage('Probability must be between 0 and 100'),
        
        body('expectedCloseDate')
            .optional()
            .isISO8601().withMessage('Invalid date format')
            .toDate(),
        
        body('assignedTo')
            .optional()
            .isMongoId().withMessage('Invalid user ID'),
        
        body('products')
            .optional()
            .isArray().withMessage('Products must be an array'),
        
        body('competitors')
            .optional()
            .isArray().withMessage('Competitors must be an array'),
        
        body('team')
            .optional()
            .isArray().withMessage('Team must be an array'),
        
        body('tags')
            .optional()
            .isArray().withMessage('Tags must be an array'),
        
        body('notes')
            .optional()
            .isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters')
            .trim()
    ],
    
    stageUpdate: [
        param('id')
            .isMongoId().withMessage('Invalid opportunity ID'),
        
        body('stage')
            .notEmpty().withMessage('Stage is required')
            .isIn(Object.values(STAGES.OPPORTUNITY))
            .withMessage('Invalid opportunity stage'),
        
        body('probability')
            .optional()
            .isInt({ min: 0, max: 100 }).withMessage('Probability must be between 0 and 100'),
        
        body('expectedCloseDate')
            .optional()
            .isISO8601().withMessage('Invalid date format')
            .toDate(),
        
        body('lostReason')
            .if(body('stage').equals(STAGES.OPPORTUNITY.CLOSED_LOST))
            .notEmpty().withMessage('Lost reason is required when closing as lost')
            .isLength({ max: 500 }).withMessage('Lost reason cannot exceed 500 characters')
            .trim(),
        
        body('wonNotes')
            .if(body('stage').equals(STAGES.OPPORTUNITY.CLOSED_WON))
            .optional()
            .isLength({ max: 500 }).withMessage('Won notes cannot exceed 500 characters')
            .trim()
    ],
    
    addProduct: [
        param('id')
            .isMongoId().withMessage('Invalid opportunity ID'),
        
        body('product')
            .notEmpty().withMessage('Product is required')
            .isMongoId().withMessage('Invalid product ID'),
        
        body('quantity')
            .notEmpty().withMessage('Quantity is required')
            .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
        
        body('unitPrice')
            .notEmpty().withMessage('Unit price is required')
            .isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
        
        body('discount')
            .optional()
            .isFloat({ min: 0 }).withMessage('Discount must be a positive number')
    ],
    
    removeProduct: [
        param('id')
            .isMongoId().withMessage('Invalid opportunity ID'),
        
        param('productId')
            .isMongoId().withMessage('Invalid product ID')
    ],
    
    addTeamMember: [
        param('id')
            .isMongoId().withMessage('Invalid opportunity ID'),
        
        body('user')
            .notEmpty().withMessage('User is required')
            .isMongoId().withMessage('Invalid user ID'),
        
        body('role')
            .notEmpty().withMessage('Role is required')
            .isString().withMessage('Role must be a string')
            .isLength({ max: 50 }).withMessage('Role cannot exceed 50 characters'),
        
        body('contribution')
            .optional()
            .isInt({ min: 0, max: 100 }).withMessage('Contribution must be between 0 and 100')
    ],
    
    removeTeamMember: [
        param('id')
            .isMongoId().withMessage('Invalid opportunity ID'),
        
        param('userId')
            .isMongoId().withMessage('Invalid user ID')
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
        
        query('stage')
            .optional()
            .isIn(Object.values(STAGES.OPPORTUNITY))
            .withMessage('Invalid stage filter'),
        
        query('assignedTo')
            .optional()
            .isMongoId().withMessage('Invalid user ID'),
        
        query('customerId')
            .optional()
            .isMongoId().withMessage('Invalid customer ID'),
        
        query('status')
            .optional()
            .isIn(['open', 'in-progress', 'won', 'lost'])
            .withMessage('Invalid status filter'),
        
        query('probability')
            .optional()
            .isInt({ min: 0, max: 100 }).withMessage('Probability must be between 0 and 100'),
        
        query('minAmount')
            .optional()
            .isFloat({ min: 0 }).withMessage('Minimum amount must be a positive number')
            .toFloat(),
        
        query('maxAmount')
            .optional()
            .isFloat({ min: 0 }).withMessage('Maximum amount must be a positive number')
            .toFloat(),
        
        query('expectedCloseStart')
            .optional()
            .isISO8601().withMessage('Invalid start date format')
            .toDate(),
        
        query('expectedCloseEnd')
            .optional()
            .isISO8601().withMessage('Invalid end date format')
            .toDate(),
        
        query('sortBy')
            .optional()
            .isIn(['createdAt', 'name', 'amount', 'expectedCloseDate', 'probability', 'stage'])
            .withMessage('Invalid sort field'),
        
        query('sortOrder')
            .optional()
            .isIn(['1', '-1']).withMessage('Sort order must be 1 or -1')
            .toInt(),
        
        query('search')
            .optional()
            .isString().withMessage('Search term must be a string')
            .isLength({ max: 100 }).withMessage('Search term too long')
    ],
    
    getById: [
        param('id')
            .isMongoId().withMessage('Invalid opportunity ID')
    ],
    
    delete: [
        param('id')
            .isMongoId().withMessage('Invalid opportunity ID')
    ],
    
    getPipeline: [
        query('stage')
            .optional()
            .isIn(Object.values(STAGES.OPPORTUNITY))
            .withMessage('Invalid stage filter'),
        
        query('assignedTo')
            .optional()
            .isMongoId().withMessage('Invalid user ID')
    ],
    
    getForecast: [
        query('months')
            .optional()
            .isInt({ min: 1, max: 12 }).withMessage('Months must be between 1 and 12')
            .toInt(),
        
        query('asOfDate')
            .optional()
            .isISO8601().withMessage('Invalid date format')
            .toDate()
    ]
};

module.exports = validateOpportunity;