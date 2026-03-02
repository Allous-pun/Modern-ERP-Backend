// src/routes/system.routes.js
const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { requireModule } = require('../middleware/module.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const {
    // User Management
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    
    // Role Management
    getRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    assignRoleToUser,
    
    // Permission Management
    getPermissions,
    getPermission,
    
    // Audit Logs
    getAuditLogs,
    
    // System Configuration
    getSystemConfig,
    updateSystemConfig,
    
    // Backup Management
    getBackups,
    createBackup,
    restoreBackup,
    deleteBackup,
    
    // Security Policies
    getSecurityPolicies,
    updateSecurityPolicies,
    
    // Compliance
    getComplianceReports,
    
    // Risk Management
    getRiskRegisters,
    createRiskRegister,
    updateRiskRegister,
    
    // Data Privacy
    getDataPrivacySettings,
    updateDataPrivacySettings,
    getGDPRReports
} = require('../controllers/system.controller');

const router = express.Router();

// All system routes require:
// 1. Authentication (protect)
// 2. System module installed (requireModule)
router.use(protect);
router.use(requireModule('system'));

// ========== USER MANAGEMENT ==========
router.get('/users',
    requirePermission('system.users_view'),
    getUsers
);

router.get('/users/:id',
    requirePermission('system.users_view'),
    getUser
);

router.post('/users',
    requirePermission('system.users_manage'),
    createUser
);

router.put('/users/:id',
    requirePermission('system.users_manage'),
    updateUser
);

router.delete('/users/:id',
    requirePermission('system.users_manage'),
    deleteUser
);

// ========== ROLE MANAGEMENT ==========
router.get('/roles',
    requirePermission('system.roles_view'),
    getRoles
);

router.get('/roles/:id',
    requirePermission('system.roles_view'),
    getRole
);

router.post('/roles',
    requirePermission('system.roles_manage'),
    createRole
);

router.put('/roles/:id',
    requirePermission('system.roles_manage'),
    updateRole
);

router.delete('/roles/:id',
    requirePermission('system.roles_manage'),
    deleteRole
);

router.post('/roles/assign/:userId',
    requirePermission('system.users_manage'),
    assignRoleToUser
);

// ========== PERMISSION MANAGEMENT ==========
router.get('/permissions',
    requirePermission('system.permissions_view'),
    getPermissions
);

router.get('/permissions/:id',
    requirePermission('system.permissions_view'),
    getPermission
);

// ========== AUDIT LOGS ==========
router.get('/audit-logs',
    requirePermission('system.audit_view'),
    getAuditLogs
);

// ========== SYSTEM CONFIGURATION ==========
router.get('/config',
    requirePermission('system.config_view'),
    getSystemConfig
);

router.put('/config',
    requirePermission('system.config_manage'),
    updateSystemConfig
);

// ========== BACKUP MANAGEMENT ==========
router.get('/backups',
    requirePermission('system.backups_manage'),
    getBackups
);

router.post('/backups',
    requirePermission('system.backups_manage'),
    createBackup
);

router.post('/backups/:id/restore',
    requirePermission('system.backups_manage'),
    restoreBackup
);

router.delete('/backups/:id',
    requirePermission('system.backups_manage'),
    deleteBackup
);

module.exports = router;