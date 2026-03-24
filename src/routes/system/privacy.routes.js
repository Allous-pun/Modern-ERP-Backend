// src/routes/system/privacy.routes.js
const express = require('express');
const { upload } = require('../../config/cloudinary');
const {
    // Settings
    getPrivacySettings,
    updateRetentionPolicies,
    
    // Consent
    getConsentSettings,
    updateConsentSettings,
    recordUserConsent,
    withdrawUserConsent,
    
    // DSR
    getDataSubjectRequests,
    createDataSubjectRequest,
    updateDataSubjectRequest,
    uploadDsrResponse,
    
    // Policies
    getPrivacyPolicies,
    createPrivacyPolicy,
    
    // DPA
    uploadDPA,
    
    // Breaches
    reportDataBreach,
    updateDataBreach,
    
    // GDPR
    updateGdprSettings,
    
    // Reports
    getComplianceReport,
    exportPrivacyData
} = require('../../controllers/system/privacy.controller');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

// ============================================
// PRIVACY SETTINGS
// ============================================
/**
 * @route   GET /api/system/privacy
 * @desc    Get privacy settings
 * @access  Private (requires security.privacy_view)
 */
router.get('/', requirePermission('security.privacy_view'), getPrivacySettings);

/**
 * @route   PUT /api/system/privacy/retention
 * @desc    Update data retention policies
 * @access  Private (requires security.privacy_manage)
 */
router.put('/retention', requirePermission('security.privacy_manage'), updateRetentionPolicies);

// ============================================
// CONSENT MANAGEMENT
// ============================================
/**
 * @route   GET /api/system/privacy/consent/settings
 * @desc    Get consent settings
 * @access  Private (requires security.privacy_view)
 */
router.get('/consent/settings', requirePermission('security.privacy_view'), getConsentSettings);

/**
 * @route   PUT /api/system/privacy/consent/settings
 * @desc    Update consent settings
 * @access  Private (requires security.privacy_manage)
 */
router.put('/consent/settings', requirePermission('security.privacy_manage'), updateConsentSettings);

/**
 * @route   POST /api/system/privacy/consent/record
 * @desc    Record user consent
 * @access  Private (requires security.privacy_manage)
 */
router.post('/consent/record', requirePermission('security.privacy_manage'), recordUserConsent);

/**
 * @route   POST /api/system/privacy/consent/withdraw/:userId
 * @desc    Withdraw user consent
 * @access  Private (requires security.privacy_manage)
 */
router.post('/consent/withdraw/:userId', requirePermission('security.privacy_manage'), withdrawUserConsent);

// ============================================
// DATA SUBJECT REQUESTS (DSR)
// ============================================
/**
 * @route   GET /api/system/privacy/dsr
 * @desc    Get all data subject requests
 * @access  Private (requires security.privacy_view)
 */
router.get('/dsr', requirePermission('security.privacy_view'), getDataSubjectRequests);

/**
 * @route   POST /api/system/privacy/dsr
 * @desc    Create a data subject request
 * @access  Private (requires security.privacy_manage)
 */
router.post('/dsr', requirePermission('security.privacy_manage'), createDataSubjectRequest);

/**
 * @route   PUT /api/system/privacy/dsr/:requestId
 * @desc    Update data subject request status
 * @access  Private (requires security.privacy_manage)
 */
router.put('/dsr/:requestId', requirePermission('security.privacy_manage'), updateDataSubjectRequest);

/**
 * @route   POST /api/system/privacy/dsr/:requestId/response
 * @desc    Upload response for data subject request
 * @access  Private (requires security.privacy_manage)
 */
router.post('/dsr/:requestId/response', 
    requirePermission('security.privacy_manage'),
    upload.single('file'),
    uploadDsrResponse
);

// ============================================
// PRIVACY POLICIES
// ============================================
/**
 * @route   GET /api/system/privacy/policies
 * @desc    Get privacy policies
 * @access  Private (requires security.privacy_view)
 */
router.get('/policies', requirePermission('security.privacy_view'), getPrivacyPolicies);

/**
 * @route   POST /api/system/privacy/policies
 * @desc    Create new privacy policy version
 * @access  Private (requires security.privacy_manage)
 */
router.post('/policies', requirePermission('security.privacy_manage'), createPrivacyPolicy);

// ============================================
// DATA PROCESSING AGREEMENTS (DPA)
// ============================================
/**
 * @route   POST /api/system/privacy/dpa
 * @desc    Upload data processing agreement
 * @access  Private (requires security.privacy_manage)
 */
router.post('/dpa', 
    requirePermission('security.privacy_manage'),
    upload.single('file'),
    uploadDPA
);

// ============================================
// DATA BREACH MANAGEMENT
// ============================================
/**
 * @route   POST /api/system/privacy/breaches
 * @desc    Report a data breach
 * @access  Private (requires security.privacy_manage)
 */
router.post('/breaches', requirePermission('security.privacy_manage'), reportDataBreach);

/**
 * @route   PUT /api/system/privacy/breaches/:breachId
 * @desc    Update data breach status
 * @access  Private (requires security.privacy_manage)
 */
router.put('/breaches/:breachId', requirePermission('security.privacy_manage'), updateDataBreach);

// ============================================
// GDPR COMPLIANCE
// ============================================
/**
 * @route   PUT /api/system/privacy/gdpr
 * @desc    Update GDPR settings
 * @access  Private (requires security.privacy_manage)
 */
router.put('/gdpr', requirePermission('security.privacy_manage'), updateGdprSettings);

// ============================================
// REPORTS & EXPORTS
// ============================================
/**
 * @route   GET /api/system/privacy/reports/compliance
 * @desc    Get privacy compliance report
 * @access  Private (requires security.privacy_view)
 */
router.get('/reports/compliance', requirePermission('security.privacy_view'), getComplianceReport);

/**
 * @route   GET /api/system/privacy/export
 * @desc    Export all privacy data (GDPR portability)
 * @access  Private (requires security.privacy_view)
 */
router.get('/export', requirePermission('security.privacy_view'), exportPrivacyData);

module.exports = router;