// src/validators/system/risk.validator.js
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

// Validate create risk
const validateCreateRisk = [
    body('title')
        .notEmpty()
        .withMessage('Risk title is required')
        .isString()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    
    body('description')
        .notEmpty()
        .withMessage('Risk description is required')
        .isString()
        .trim(),
    
    body('category')
        .isIn([
            'operational', 'financial', 'strategic', 'compliance',
            'reputational', 'cybersecurity', 'hr', 'environmental',
            'project', 'market', 'legal', 'technology'
        ])
        .withMessage('Invalid risk category'),
    
    body('subCategory')
        .optional()
        .isString()
        .trim(),
    
    body('impact')
        .isIn(['very_low', 'low', 'medium', 'high', 'critical'])
        .withMessage('Invalid impact level'),
    
    body('probability')
        .isIn(['very_low', 'low', 'medium', 'high', 'very_high'])
        .withMessage('Invalid probability level'),
    
    body('mitigationStrategy')
        .optional()
        .isIn(['avoid', 'reduce', 'transfer', 'accept', 'exploit'])
        .withMessage('Invalid mitigation strategy'),
    
    body('mitigationPlan')
        .optional()
        .isString()
        .trim(),
    
    body('contingencyPlan')
        .optional()
        .isString()
        .trim(),
    
    body('owner')
        .optional()
        .isMongoId()
        .withMessage('Invalid owner ID'),
    
    body('stakeholders')
        .optional()
        .isArray()
        .withMessage('Stakeholders must be an array'),
    
    body('stakeholders.*')
        .optional()
        .isMongoId()
        .withMessage('Invalid stakeholder ID'),
    
    body('targetResolutionDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid target resolution date'),
    
    body('monitoringFrequency')
        .optional()
        .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'annually'])
        .withMessage('Invalid monitoring frequency'),
    
    body('financialImpact')
        .optional()
        .isObject()
        .withMessage('Financial impact must be an object'),
    
    body('financialImpact.currency')
        .optional()
        .isString()
        .isLength({ min: 3, max: 3 })
        .withMessage('Currency must be 3 characters'),
    
    body('financialImpact.minAmount')
        .optional()
        .isNumeric()
        .withMessage('Min amount must be a number'),
    
    body('financialImpact.maxAmount')
        .optional()
        .isNumeric()
        .withMessage('Max amount must be a number'),
    
    body('financialImpact.expectedAmount')
        .optional()
        .isNumeric()
        .withMessage('Expected amount must be a number'),
    
    body('dependencies')
        .optional()
        .isArray()
        .withMessage('Dependencies must be an array'),
    
    body('notes')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notes cannot exceed 1000 characters'),
    
    handleValidationErrors
];

// Validate update risk
const validateUpdateRisk = [
    param('riskId')
        .isMongoId()
        .withMessage('Invalid risk ID'),
    
    body('title')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    
    body('description')
        .optional()
        .isString()
        .trim(),
    
    body('category')
        .optional()
        .isIn([
            'operational', 'financial', 'strategic', 'compliance',
            'reputational', 'cybersecurity', 'hr', 'environmental',
            'project', 'market', 'legal', 'technology'
        ])
        .withMessage('Invalid risk category'),
    
    body('impact')
        .optional()
        .isIn(['very_low', 'low', 'medium', 'high', 'critical'])
        .withMessage('Invalid impact level'),
    
    body('probability')
        .optional()
        .isIn(['very_low', 'low', 'medium', 'high', 'very_high'])
        .withMessage('Invalid probability level'),
    
    body('status')
        .optional()
        .isIn(['identified', 'assessed', 'mitigating', 'monitoring', 'closed', 'archived'])
        .withMessage('Invalid status'),
    
    body('historyNotes')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage('History notes cannot exceed 500 characters'),
    
    handleValidationErrors
];

// Validate update risk status
const validateUpdateRiskStatus = [
    param('riskId')
        .isMongoId()
        .withMessage('Invalid risk ID'),
    
    body('status')
        .isIn(['identified', 'assessed', 'mitigating', 'monitoring', 'closed', 'archived'])
        .withMessage('Invalid status'),
    
    body('notes')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters'),
    
    handleValidationErrors
];

// Validate create assessment
const validateCreateAssessment = [
    body('title')
        .notEmpty()
        .withMessage('Assessment title is required')
        .isString()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    
    body('description')
        .optional()
        .isString()
        .trim(),
    
    body('scope')
        .optional()
        .isString()
        .trim(),
    
    body('methodology')
        .optional()
        .isString()
        .trim(),
    
    body('findings')
        .optional()
        .isArray()
        .withMessage('Findings must be an array'),
    
    body('recommendations')
        .optional()
        .isArray()
        .withMessage('Recommendations must be an array'),
    
    body('recommendations.*.recommendation')
        .if(body('recommendations').exists())
        .notEmpty()
        .withMessage('Recommendation text is required'),
    
    body('recommendations.*.priority')
        .if(body('recommendations').exists())
        .isIn(['critical', 'high', 'medium', 'low'])
        .withMessage('Invalid priority'),
    
    handleValidationErrors
];

// Validate pagination and filters
const validateRiskQuery = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    query('category')
        .optional()
        .isString(),
    
    query('status')
        .optional()
        .isIn(['identified', 'assessed', 'mitigating', 'monitoring', 'closed', 'archived'])
        .withMessage('Invalid status filter'),
    
    query('level')
        .optional()
        .isIn(['very_low', 'low', 'medium', 'high', 'critical'])
        .withMessage('Invalid risk level filter'),
    
    query('owner')
        .optional()
        .isMongoId()
        .withMessage('Invalid owner ID'),
    
    query('search')
        .optional()
        .isString()
        .trim(),
    
    handleValidationErrors
];

module.exports = {
    validateCreateRisk,
    validateUpdateRisk,
    validateUpdateRiskStatus,
    validateCreateAssessment,
    validateRiskQuery
};