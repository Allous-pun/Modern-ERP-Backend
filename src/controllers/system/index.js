// src/controllers/system/index.js

// User Management
const userController = require('./user.controller');

// Role Management (to be added)
// const roleController = require('./role.controller');

// Audit Logs (to be added)
const auditController = require('./audit.controller');

// Backup Management (to be added)
const backupController = require('./backup.controller');

// System Configuration (to be added)
// const configController = require('./config.controller');

// Security Policies (to be added)
// const securityController = require('./security.controller');

// Compliance (to be added)
const complianceController = require('./compliance.controller');

// Risk Management (to be added)
const riskController = require('./risk.controller');

// Data Privacy (to be added)
const privacyController = require('./privacy.controller');

module.exports = {
    // User Management
    ...userController,
    
    // Role Management (to be added)
    // ...roleController,
    
    // Audit Logs (to be added)
    ...auditController,
    
    // Backup Management (to be added)
    ...backupController,
    
    // System Configuration (to be added)
    // ...configController,
    
    // Security Policies (to be added)
    // ...securityController,
    
    // Compliance (to be added)
    ...complianceController,
    
    // Risk Management (to be added)
    ...riskController,
    
    // Data Privacy (to be added)
    ...privacyController
};