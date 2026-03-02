// src/controllers/executive/index.js
const dashboardController = require('./dashboard.controller');
const analyticsController = require('./analytics.controller');
const governanceController = require('./governance.controller');
const reportsController = require('./reports.controller');

module.exports = {
    ...dashboardController,
    ...analyticsController,
    ...governanceController,
    ...reportsController
};