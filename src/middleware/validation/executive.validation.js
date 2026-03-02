// src/middleware/validation/executive.validation.js
const { body, param, query } = require('express-validator');

exports.validateDashboard = [
    body('name')
        .notEmpty().withMessage('Dashboard name is required')
        .isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
    body('type')
        .isIn(['strategic', 'governance', 'full_analytics', 'operations', 'custom'])
        .withMessage('Invalid dashboard type'),
    body('audience')
        .isArray().withMessage('Audience must be an array')
        .notEmpty().withMessage('At least one audience is required')
];

exports.validateKPI = [
    body('name')
        .notEmpty().withMessage('KPI name is required')
        .isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
    body('category')
        .isIn(['financial', 'operational', 'strategic', 'hr', 'technology', 'sales', 'marketing', 'customer', 'quality', 'compliance', 'risk', 'sustainability', 'innovation'])
        .withMessage('Invalid KPI category'),
    body('formula')
        .isIn(['direct', 'percentage', 'ratio', 'average', 'sum', 'count', 'growth_rate', 'custom'])
        .withMessage('Invalid formula type'),
    body('targets.current')
        .isNumeric().withMessage('Current target must be a number')
        .notEmpty().withMessage('Current target is required')
];

exports.validateMetric = [
    body('name')
        .notEmpty().withMessage('Metric name is required')
        .isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
    body('category')
        .isIn(['financial', 'operational', 'strategic', 'hr', 'technology', 'sales', 'marketing', 'customer', 'quality', 'compliance', 'risk', 'sustainability', 'innovation', 'productivity', 'efficiency', 'growth', 'profitability', 'liquidity', 'leverage', 'activity', 'valuation', 'market'])
        .withMessage('Invalid metric category'),
    body('metricType')
        .isIn(['counter', 'gauge', 'percentage', 'ratio', 'average', 'sum', 'minimum', 'maximum', 'median', 'mode', 'standard_deviation', 'variance', 'cumulative', 'rate'])
        .withMessage('Invalid metric type'),
    body('unit')
        .isIn(['number', 'usd', 'eur', 'gbp', 'jpy', 'cny', 'percent', 'ratio', 'hours', 'days', 'minutes', 'seconds', 'count', 'score', 'index', 'bps', 'custom'])
        .withMessage('Invalid unit')
];

exports.validateReport = [
    body('name')
        .notEmpty().withMessage('Report name is required')
        .isLength({ min: 3, max: 200 }).withMessage('Name must be between 3 and 200 characters'),
    body('type')
        .isIn(['board', 'executive', 'shareholder', 'regulatory', 'financial', 'operational', 'strategic', 'compliance', 'annual', 'quarterly', 'monthly', 'weekly', 'ad_hoc'])
        .withMessage('Invalid report type'),
    body('category')
        .isIn(['board_package', 'management_review', 'financial_statement', 'performance_report', 'risk_report', 'compliance_report', 'investor_presentation', 'strategy_document'])
        .withMessage('Invalid report category')
];

// Validation for query parameters
exports.validateDateRange = [
    query('startDate')
        .optional()
        .isISO8601().withMessage('Invalid start date format'),
    query('endDate')
        .optional()
        .isISO8601().withMessage('Invalid end date format')
        .custom((endDate, { req }) => {
            if (req.query.startDate && new Date(endDate) < new Date(req.query.startDate)) {
                throw new Error('End date must be after start date');
            }
            return true;
        }),
    query('period')
        .optional()
        .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'annual'])
        .withMessage('Invalid period')
];

// Validation for IDs
exports.validateId = [
    param('id')
        .isMongoId().withMessage('Invalid ID format')
];