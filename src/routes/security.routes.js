// src/routes/security.routes.js
const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { requireModule } = require('../middleware/module.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const {
    // Security Policies
    getSecurityPolicies,
    updateSecurityPolicies,
    
    // Compliance Management
    getComplianceFrameworks,
    getComplianceReports,
    runComplianceCheck,
    
    // Risk Management
    getRiskRegisters,
    getRiskRegister,
    createRiskRegister,
    updateRiskRegister,
    deleteRiskRegister,
    getRiskMitigations,
    createRiskMitigation,
    
    // Data Privacy
    getDataPrivacySettings,
    updateDataPrivacySettings,
    getGDPRReports,
    getDataSubjects,
    getDataSubject,
    createDataSubjectRequest,
    
    // Encryption Management
    getEncryptionSettings,
    updateEncryptionSettings,
    rotateEncryptionKeys
} = require('../controllers/security.controller');

const router = express.Router();

// All security routes require:
// 1. Authentication (protect)
// 2. Security module installed (requireModule)
router.use(protect);
router.use(requireModule('security'));

// ========== SECURITY POLICIES ==========
router.get('/policies',
    requirePermission('security.policies_view'),
    getSecurityPolicies
);

router.put('/policies',
    requirePermission('security.policies_manage'),
    updateSecurityPolicies
);

// ========== COMPLIANCE MANAGEMENT ==========
router.get('/compliance/frameworks',
    requirePermission('security.compliance_view'),
    getComplianceFrameworks
);

router.get('/compliance/reports',
    requirePermission('security.compliance_view'),
    getComplianceReports
);

router.post('/compliance/check',
    requirePermission('security.compliance_manage'),
    runComplianceCheck
);

// ========== RISK MANAGEMENT ==========
router.get('/risks',
    requirePermission('security.risk_view'),
    getRiskRegisters
);

router.get('/risks/:id',
    requirePermission('security.risk_view'),
    getRiskRegister
);

router.post('/risks',
    requirePermission('security.risk_manage'),
    createRiskRegister
);

router.put('/risks/:id',
    requirePermission('security.risk_manage'),
    updateRiskRegister
);

router.delete('/risks/:id',
    requirePermission('security.risk_manage'),
    deleteRiskRegister
);

router.get('/risks/:id/mitigations',
    requirePermission('security.risk_view'),
    getRiskMitigations
);

router.post('/risks/:id/mitigations',
    requirePermission('security.risk_manage'),
    createRiskMitigation
);

// ========== DATA PRIVACY (GDPR) ==========
router.get('/privacy/settings',
    requirePermission('security.privacy_view'),
    getDataPrivacySettings
);

router.put('/privacy/settings',
    requirePermission('security.privacy_manage'),
    updateDataPrivacySettings
);

router.get('/privacy/gdpr-reports',
    requirePermission('security.privacy_view'),
    getGDPRReports
);

router.get('/privacy/data-subjects',
    requirePermission('security.data_view'),
    getDataSubjects
);

router.get('/privacy/data-subjects/:id',
    requirePermission('security.data_view'),
    getDataSubject
);

router.post('/privacy/data-subject-requests',
    requirePermission('security.data_manage'),
    createDataSubjectRequest
);

// ========== ENCRYPTION MANAGEMENT ==========
router.get('/encryption',
    requirePermission('security.encryption_manage'),
    getEncryptionSettings
);

router.put('/encryption',
    requirePermission('security.encryption_manage'),
    updateEncryptionSettings
);

router.post('/encryption/rotate',
    requirePermission('security.encryption_manage'),
    rotateEncryptionKeys
);

module.exports = router;