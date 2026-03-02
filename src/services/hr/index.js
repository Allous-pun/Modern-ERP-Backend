// src/services/hr/index.js
/**
 * HR Module Services Index
 * This file exports all services for the Human Resources module
 */

const EmployeeService = require('./employee.service');
const PayrollService = require('./payroll.service');
const ReportingService = require('./reporting.service');

module.exports = {
    EmployeeService,
    PayrollService,
    ReportingService,
    
    // Initialize all services
    initialize: () => {
        console.log('✅ HR module services initialized successfully');
    }
};