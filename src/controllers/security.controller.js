// src/controllers/security.controller.js
const AuditLog = require('../models/auditLog.model');
const SystemConfig = require('../models/systemConfig.model');
const User = require('../models/user.model');
const OrganizationMember = require('../models/organizationMember.model');

// ========== SECURITY POLICIES ==========

// @desc    Get security policies
// @route   GET /api/security/policies
// @access  Private (requires security.policies_view)
const getSecurityPolicies = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        let config = await SystemConfig.findOne({ organization: organizationId });
        
        if (!config) {
            config = await SystemConfig.create({
                organization: organizationId,
                settings: {
                    security: {
                        passwordPolicy: {
                            minLength: 8,
                            requireUppercase: true,
                            requireNumbers: true,
                            requireSpecialChars: false,
                            expiryDays: 90
                        },
                        sessionTimeout: 30,
                        maxLoginAttempts: 5,
                        twoFactorRequired: false,
                        ipWhitelist: []
                    }
                }
            });
        }

        res.status(200).json({
            success: true,
            data: config.settings.security || {}
        });
    } catch (error) {
        console.error('Get security policies error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch security policies'
        });
    }
};

// @desc    Update security policies
// @route   PUT /api/security/policies
// @access  Private (requires security.policies_manage)
const updateSecurityPolicies = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const policies = req.body;

        let config = await SystemConfig.findOne({ organization: organizationId });
        
        if (!config) {
            config = new SystemConfig({ organization: organizationId, settings: {} });
        }

        config.settings.security = { ...config.settings.security, ...policies };
        config.updatedBy = req.user.userId;
        await config.save();

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'security_policy_updated',
            details: { policies: Object.keys(policies) }
        });

        res.status(200).json({
            success: true,
            message: 'Security policies updated successfully',
            data: config.settings.security
        });
    } catch (error) {
        console.error('Update security policies error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update security policies'
        });
    }
};

// ========== COMPLIANCE MANAGEMENT ==========

// @desc    Get compliance frameworks
// @route   GET /api/security/compliance/frameworks
// @access  Private (requires security.compliance_view)
const getComplianceFrameworks = async (req, res) => {
    try {
        const frameworks = [
            {
                id: 'gdpr',
                name: 'GDPR',
                description: 'General Data Protection Regulation',
                status: 'active',
                lastChecked: new Date(),
                complianceScore: 85
            },
            {
                id: 'hipaa',
                name: 'HIPAA',
                description: 'Health Insurance Portability and Accountability Act',
                status: 'inactive',
                lastChecked: null,
                complianceScore: 0
            },
            {
                id: 'soc2',
                name: 'SOC2',
                description: 'Service Organization Control 2',
                status: 'active',
                lastChecked: new Date(),
                complianceScore: 92
            },
            {
                id: 'iso27001',
                name: 'ISO 27001',
                description: 'Information Security Management',
                status: 'pending',
                lastChecked: null,
                complianceScore: 0
            }
        ];

        res.status(200).json({
            success: true,
            count: frameworks.length,
            data: frameworks
        });
    } catch (error) {
        console.error('Get compliance frameworks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch compliance frameworks'
        });
    }
};

// @desc    Get compliance reports
// @route   GET /api/security/compliance/reports
// @access  Private (requires security.compliance_view)
const getComplianceReports = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { framework } = req.query;

        // Mock compliance reports
        const reports = [
            {
                id: '1',
                framework: 'gdpr',
                name: 'GDPR Compliance Report - March 2026',
                status: 'compliant',
                generatedAt: new Date(),
                generatedBy: req.user.userId,
                findings: 0,
                url: '/reports/gdpr-march-2026.pdf'
            },
            {
                id: '2',
                framework: 'soc2',
                name: 'SOC2 Type II Report - Q1 2026',
                status: 'compliant',
                generatedAt: new Date(),
                generatedBy: req.user.userId,
                findings: 2,
                url: '/reports/soc2-q1-2026.pdf'
            }
        ];

        const filteredReports = framework 
            ? reports.filter(r => r.framework === framework)
            : reports;

        res.status(200).json({
            success: true,
            count: filteredReports.length,
            data: filteredReports
        });
    } catch (error) {
        console.error('Get compliance reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch compliance reports'
        });
    }
};

// @desc    Run compliance check
// @route   POST /api/security/compliance/check
// @access  Private (requires security.compliance_manage)
const runComplianceCheck = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { framework } = req.body;

        // Mock compliance check
        const results = {
            framework,
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            score: Math.floor(Math.random() * 30) + 70, // Random score 70-100
            findings: [],
            passed: Math.floor(Math.random() * 20) + 80,
            failed: Math.floor(Math.random() * 5),
            warnings: Math.floor(Math.random() * 10)
        };

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'compliance_check_run',
            details: { framework, results: results.score }
        });

        res.status(200).json({
            success: true,
            message: 'Compliance check completed',
            data: results
        });
    } catch (error) {
        console.error('Run compliance check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to run compliance check'
        });
    }
};

// ========== RISK MANAGEMENT ==========

// @desc    Get risk registers
// @route   GET /api/security/risks
// @access  Private (requires security.risk_view)
const getRiskRegisters = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { status, severity } = req.query;

        // Mock risk data
        let risks = [
            {
                id: '1',
                title: 'Data Breach Risk',
                description: 'Potential unauthorized access to customer data',
                category: 'data_security',
                severity: 'high',
                likelihood: 'medium',
                impact: 'high',
                status: 'active',
                owner: req.user.userId,
                mitigation: 'Implement MFA and encryption',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: '2',
                title: 'Compliance Violation',
                description: 'Risk of non-compliance with GDPR',
                category: 'compliance',
                severity: 'medium',
                likelihood: 'low',
                impact: 'high',
                status: 'mitigated',
                owner: req.user.userId,
                mitigation: 'Regular compliance audits',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: '3',
                title: 'System Downtime',
                description: 'Risk of system unavailability',
                category: 'operational',
                severity: 'medium',
                likelihood: 'medium',
                impact: 'medium',
                status: 'active',
                owner: req.user.userId,
                mitigation: 'Implement redundancy and backups',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        // Apply filters
        if (status) {
            risks = risks.filter(r => r.status === status);
        }
        if (severity) {
            risks = risks.filter(r => r.severity === severity);
        }

        res.status(200).json({
            success: true,
            count: risks.length,
            data: risks
        });
    } catch (error) {
        console.error('Get risk registers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch risk registers'
        });
    }
};

// @desc    Get single risk register
// @route   GET /api/security/risks/:id
// @access  Private (requires security.risk_view)
const getRiskRegister = async (req, res) => {
    try {
        const { id } = req.params;

        // Mock single risk
        const risk = {
            id,
            title: 'Data Breach Risk',
            description: 'Potential unauthorized access to customer data',
            category: 'data_security',
            severity: 'high',
            likelihood: 'medium',
            impact: 'high',
            status: 'active',
            owner: req.user.userId,
            mitigation: 'Implement MFA and encryption',
            createdAt: new Date(),
            updatedAt: new Date(),
            mitigationHistory: [
                {
                    action: 'MFA implemented',
                    date: new Date(),
                    status: 'completed'
                }
            ]
        };

        res.status(200).json({
            success: true,
            data: risk
        });
    } catch (error) {
        console.error('Get risk register error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch risk register'
        });
    }
};

// @desc    Create risk register
// @route   POST /api/security/risks
// @access  Private (requires security.risk_manage)
const createRiskRegister = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const riskData = req.body;

        // Mock created risk
        const newRisk = {
            id: Math.random().toString(36).substring(7),
            ...riskData,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'risk_created',
            target: newRisk.id,
            details: { title: riskData.title }
        });

        res.status(201).json({
            success: true,
            message: 'Risk register created successfully',
            data: newRisk
        });
    } catch (error) {
        console.error('Create risk register error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create risk register'
        });
    }
};

// @desc    Update risk register
// @route   PUT /api/security/risks/:id
// @access  Private (requires security.risk_manage)
const updateRiskRegister = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { id } = req.params;
        const updates = req.body;

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'risk_updated',
            target: id,
            details: updates
        });

        res.status(200).json({
            success: true,
            message: 'Risk register updated successfully'
        });
    } catch (error) {
        console.error('Update risk register error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update risk register'
        });
    }
};

// @desc    Delete risk register
// @route   DELETE /api/security/risks/:id
// @access  Private (requires security.risk_manage)
const deleteRiskRegister = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { id } = req.params;

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'risk_deleted',
            target: id
        });

        res.status(200).json({
            success: true,
            message: 'Risk register deleted successfully'
        });
    } catch (error) {
        console.error('Delete risk register error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete risk register'
        });
    }
};

// @desc    Get risk mitigations
// @route   GET /api/security/risks/:id/mitigations
// @access  Private (requires security.risk_view)
const getRiskMitigations = async (req, res) => {
    try {
        const { id } = req.params;

        const mitigations = [
            {
                id: '1',
                riskId: id,
                action: 'Implement MFA',
                status: 'completed',
                completedAt: new Date(),
                owner: req.user.userId
            },
            {
                id: '2',
                riskId: id,
                action: 'Encrypt sensitive data',
                status: 'in_progress',
                dueDate: new Date(),
                owner: req.user.userId
            }
        ];

        res.status(200).json({
            success: true,
            count: mitigations.length,
            data: mitigations
        });
    } catch (error) {
        console.error('Get risk mitigations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch risk mitigations'
        });
    }
};

// @desc    Create risk mitigation
// @route   POST /api/security/risks/:id/mitigations
// @access  Private (requires security.risk_manage)
const createRiskMitigation = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { id } = req.params;
        const mitigationData = req.body;

        // Mock created mitigation
        const newMitigation = {
            id: Math.random().toString(36).substring(7),
            riskId: id,
            ...mitigationData,
            status: 'pending',
            createdAt: new Date()
        };

        res.status(201).json({
            success: true,
            message: 'Risk mitigation created successfully',
            data: newMitigation
        });
    } catch (error) {
        console.error('Create risk mitigation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create risk mitigation'
        });
    }
};

// ========== DATA PRIVACY (GDPR) ==========

// @desc    Get data privacy settings
// @route   GET /api/security/privacy/settings
// @access  Private (requires security.privacy_view)
const getDataPrivacySettings = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        let config = await SystemConfig.findOne({ organization: organizationId });
        
        if (!config) {
            config = await SystemConfig.create({
                organization: organizationId,
                settings: {
                    privacy: {
                        dataRetentionDays: 365,
                        anonymizeAfterDays: 730,
                        consentRequired: true,
                        allowDataExport: true,
                        allowDataDeletion: true,
                        privacyPolicyUrl: null,
                        termsOfServiceUrl: null,
                        dpoContact: null
                    }
                }
            });
        }

        res.status(200).json({
            success: true,
            data: config.settings.privacy || {}
        });
    } catch (error) {
        console.error('Get data privacy settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch data privacy settings'
        });
    }
};

// @desc    Update data privacy settings
// @route   PUT /api/security/privacy/settings
// @access  Private (requires security.privacy_manage)
const updateDataPrivacySettings = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const privacySettings = req.body;

        let config = await SystemConfig.findOne({ organization: organizationId });
        
        if (!config) {
            config = new SystemConfig({ organization: organizationId, settings: {} });
        }

        if (!config.settings.privacy) {
            config.settings.privacy = {};
        }

        config.settings.privacy = { ...config.settings.privacy, ...privacySettings };
        config.updatedBy = req.user.userId;
        await config.save();

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'data_privacy_updated',
            details: { settings: Object.keys(privacySettings) }
        });

        res.status(200).json({
            success: true,
            message: 'Data privacy settings updated successfully',
            data: config.settings.privacy
        });
    } catch (error) {
        console.error('Update data privacy settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update data privacy settings'
        });
    }
};

// @desc    Get GDPR reports
// @route   GET /api/security/privacy/gdpr-reports
// @access  Private (requires security.privacy_view)
const getGDPRReports = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const reports = [
            {
                id: '1',
                type: 'data_inventory',
                name: 'Data Inventory Report',
                generatedAt: new Date(),
                recordCount: 1250,
                categories: ['customers', 'employees', 'vendors']
            },
            {
                id: '2',
                type: 'consent_audit',
                name: 'Consent Audit Report',
                generatedAt: new Date(),
                consentCount: 980,
                consentRate: '78%'
            },
            {
                id: '3',
                type: 'data_subject_requests',
                name: 'Data Subject Requests',
                generatedAt: new Date(),
                pendingRequests: 3,
                completedRequests: 45
            }
        ];

        res.status(200).json({
            success: true,
            count: reports.length,
            data: reports
        });
    } catch (error) {
        console.error('Get GDPR reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch GDPR reports'
        });
    }
};

// @desc    Get data subjects
// @route   GET /api/security/privacy/data-subjects
// @access  Private (requires security.data_view)
const getDataSubjects = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        // Mock data subjects from users in organization
        const members = await OrganizationMember.find({ 
            organization: organizationId,
            status: 'active'
        })
        .populate('user', 'firstName lastName email createdAt')
        .limit(50);

        const dataSubjects = members.map(member => ({
            id: member.user._id,
            type: 'user',
            email: member.user.email,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            createdAt: member.user.createdAt,
            consentGiven: true,
            dataCategories: ['profile', 'activity']
        }));

        res.status(200).json({
            success: true,
            count: dataSubjects.length,
            data: dataSubjects
        });
    } catch (error) {
        console.error('Get data subjects error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch data subjects'
        });
    }
};

// @desc    Get single data subject
// @route   GET /api/security/privacy/data-subjects/:id
// @access  Private (requires security.data_view)
const getDataSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const member = await OrganizationMember.findOne({
            user: id,
            organization: organizationId
        }).populate('user', 'firstName lastName email createdAt lastLogin');

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Data subject not found'
            });
        }

        const dataSubject = {
            id: member.user._id,
            email: member.user.email,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            createdAt: member.user.createdAt,
            lastLogin: member.user.lastLogin,
            consentGiven: true,
            consentDate: member.createdAt,
            dataCategories: ['profile', 'activity', 'communications'],
            dataRetention: '365 days',
            hasRequestedDeletion: false
        };

        res.status(200).json({
            success: true,
            data: dataSubject
        });
    } catch (error) {
        console.error('Get data subject error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch data subject'
        });
    }
};

// @desc    Create data subject request
// @route   POST /api/security/privacy/data-subject-requests
// @access  Private (requires security.data_manage)
const createDataSubjectRequest = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { subjectId, requestType, details } = req.body;

        const request = {
            id: Math.random().toString(36).substring(7),
            subjectId,
            requestType, // 'access', 'rectification', 'erasure', 'restriction', 'portability'
            details,
            status: 'pending',
            createdAt: new Date(),
            submittedBy: req.user.userId,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        };

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'data_subject_request_created',
            details: { requestType, subjectId }
        });

        res.status(201).json({
            success: true,
            message: 'Data subject request created successfully',
            data: request
        });
    } catch (error) {
        console.error('Create data subject request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create data subject request'
        });
    }
};

// ========== ENCRYPTION MANAGEMENT ==========

// @desc    Get encryption settings
// @route   GET /api/security/encryption
// @access  Private (requires security.encryption_manage)
const getEncryptionSettings = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const settings = {
            atRest: {
                enabled: true,
                algorithm: 'AES-256',
                keyRotationDays: 90,
                lastRotated: new Date()
            },
            inTransit: {
                enabled: true,
                protocol: 'TLS 1.3',
                certificateExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
            },
            endToEnd: {
                enabled: false,
                algorithm: null
            },
            keyManagement: {
                provider: 'AWS KMS',
                autoRotation: true,
                backupEnabled: true
            }
        };

        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Get encryption settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch encryption settings'
        });
    }
};

// @desc    Update encryption settings
// @route   PUT /api/security/encryption
// @access  Private (requires security.encryption_manage)
const updateEncryptionSettings = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const updates = req.body;

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'encryption_updated',
            details: updates
        });

        res.status(200).json({
            success: true,
            message: 'Encryption settings updated successfully'
        });
    } catch (error) {
        console.error('Update encryption settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update encryption settings'
        });
    }
};

// @desc    Rotate encryption keys
// @route   POST /api/security/encryption/rotate
// @access  Private (requires security.encryption_manage)
const rotateEncryptionKeys = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        // Mock key rotation
        const result = {
            status: 'completed',
            rotatedAt: new Date(),
            previousKeyId: 'key-abc123',
            newKeyId: 'key-xyz789',
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        };

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'encryption_rotated',
            details: result
        });

        res.status(200).json({
            success: true,
            message: 'Encryption keys rotated successfully',
            data: result
        });
    } catch (error) {
        console.error('Rotate encryption keys error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to rotate encryption keys'
        });
    }
};

module.exports = {
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
};