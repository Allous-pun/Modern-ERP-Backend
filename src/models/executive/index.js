// src/controllers/executive/index.js
const dashboardController = require('./dashboard.controller');
const analyticsController = require('./analytics.controller');
const governanceController = require('./governance.controller');
const reportsController = require('./reports.controller');

module.exports = {
    // Dashboard controllers
    getStrategicDashboards: dashboardController.getStrategicDashboards,
    getGovernanceDashboard: dashboardController.getGovernanceDashboard,
    getFullAnalyticsDashboard: dashboardController.getFullAnalyticsDashboard,
    getOperationsDashboard: dashboardController.getOperationsDashboard,
    
    // Analytics controllers
    getFinancialAnalytics: analyticsController.getFinancialAnalytics,
    getTechnologyAnalytics: analyticsController.getTechnologyAnalytics,
    getITGovernanceAnalytics: analyticsController.getITGovernanceAnalytics,
    getRiskAnalytics: analyticsController.getRiskAnalytics,
    getHRAnalytics: analyticsController.getHRAnalytics,
    
    // Governance controllers
    getStrategicPlan: governanceController.getStrategicPlan,
    updateStrategicPlan: governanceController.updateStrategicPlan,
    getStrategyPerformance: governanceController.getStrategyPerformance,
    
    // Reports controllers
    getReports: reportsController.getReports,
    getReport: reportsController.getReport,
    createReport: reportsController.createReport,
    exportReport: reportsController.exportReport
};