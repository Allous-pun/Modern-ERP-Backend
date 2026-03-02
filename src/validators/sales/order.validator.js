// src/validators/sales/order.validator.js
const { body, param, query } = require('express-validator');
const { STAGES } = require('../../utils/sales/stages');

const validateOrder = {
    create: [
        body('quote')
            .optional()
            .isMongoId().withMessage('Invalid quote ID'),
        
        body('opportunity')
            .optional()
            .isMongoId().withMessage('Invalid opportunity ID'),
        
        body('customer')
            .notEmpty().withMessage('Customer is required')
            .isMongoId().withMessage('Invalid customer ID'),
        
        body('contact')
            .optional()
            .isMongoId().withMessage('Invalid contact ID'),
        
        body('requiredDate')
            .optional()
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
        
        body('paymentMethod')
            .optional()
            .isIn(['cash', 'credit_card', 'bank_transfer', 'check', 'other'])
            .withMessage('Invalid payment method'),
        
        body('shippingMethod')
            .optional()
            .isString().withMessage('Shipping method must be a string'),
        
        body('shippingAddress')
            .optional()
            .isObject().withMessage('Shipping address must be an object'),
        
        body('billingAddress')
            .optional()
            .isObject().withMessage('Billing address must be an object'),
        
        body('notes')
            .optional()
            .isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters')
    ],
    
    update: [
        param('id')
            .isMongoId().withMessage('Invalid order ID'),
        
        body('requiredDate')
            .optional()
            .isISO8601().withMessage('Invalid date format')
            .toDate(),
        
        body('status')
            .optional()
            .isIn(Object.values(STAGES.ORDER))
            .withMessage('Invalid order status')
    ],
    
    fulfill: [
        param('id')
            .isMongoId().withMessage('Invalid order ID'),
        
        body('trackingNumber')
            .optional()
            .isString().withMessage('Tracking number must be a string'),
        
        body('carrier')
            .optional()
            .isString().withMessage('Carrier must be a string'),
        
        body('fulfillmentDate')
            .optional()
            .isISO8601().withMessage('Invalid date format')
            .toDate()
    ],
    
    cancel: [
        param('id')
            .isMongoId().withMessage('Invalid order ID'),
        
        body('reason')
            .notEmpty().withMessage('Cancellation reason is required')
            .isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
    ],
    
    invoice: [
        param('id')
            .isMongoId().withMessage('Invalid order ID'),
        
        body('invoiceNumber')
            .notEmpty().withMessage('Invoice number is required')
            .isString().withMessage('Invoice number must be a string'),
        
        body('invoiceDate')
            .optional()
            .isISO8601().withMessage('Invalid date format')
            .toDate()
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
            .isIn(Object.values(STAGES.ORDER))
            .withMessage('Invalid status filter'),
        
        query('customerId')
            .optional()
            .isMongoId().withMessage('Invalid customer ID'),
        
        query('paymentStatus')
            .optional()
            .isIn(['pending', 'paid', 'partial', 'refunded'])
            .withMessage('Invalid payment status'),
        
        query('sortBy')
            .optional()
            .isIn(['createdAt', 'orderNumber', 'orderDate', 'total'])
            .withMessage('Invalid sort field'),
        
        query('sortOrder')
            .optional()
            .isIn(['1', '-1']).withMessage('Sort order must be 1 or -1')
            .toInt()
    ]
};

module.exports = validateOrder;