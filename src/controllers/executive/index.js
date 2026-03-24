// src/controllers/executive/index.js
const strategicDashboardController = require('./strategicDashboard.controller');
const governanceController = require('./governance.controller');
const analyticsController = require('./analytics.controller');
const operationsDashboardController = require('./operationsDashboard.controller');
const financialOversightController = require('./financialOversight.controller');
const technologyController = require('./technology.controller');
const itGovernanceController = require('./itGovernance.controller');
const strategicPlanningController = require('./strategicPlanning.controller');
const reportsController = require('./reports.controller');

module.exports = {
    strategicDashboard: strategicDashboardController,
    governance: governanceController,
    analytics: analyticsController,
    operationsDashboard: operationsDashboardController,
    financialOversight: financialOversightController,
    technology: technologyController,
    itGovernance: itGovernanceController,
    strategicPlanning: strategicPlanningController,
    reports: reportsController
};