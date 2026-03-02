// src/services/sales/index.js
/**
 * Sales Module Services Index
 * This file exports all services for the Sales, Marketing & CRM module
 */

const PipelineService = require('./pipeline.service');
const CommissionService = require('./commission.service');
const ForecastService = require('./forecast.service');
const ReportingService = require('./reporting.service');

module.exports = {
    PipelineService,
    CommissionService,
    ForecastService,
    ReportingService,
    
    // Initialize all services
    initialize: () => {
        console.log('✅ Sales module services initialized successfully');
    }
};