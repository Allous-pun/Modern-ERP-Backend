// src/controllers/system/privacy.controller.js
const Privacy = require('../../models/system/privacy.model');
const OrganizationMember = require('../../models/organizationMember.model');
const { cloudinary } = require('../../config/cloudinary');
const mongoose = require('mongoose');

// ============================================
// PRIVACY SETTINGS MANAGEMENT
// ============================================

/**
 * @desc    Get privacy settings
 * @route   GET /api/system/privacy
 * @access  Private (requires security.privacy_view)
 */
const getPrivacySettings = async (req, res) => {
    try {
        let privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        })
        .populate('gdprSettings.dataProtectionOfficer.memberId', 'personalInfo.firstName personalInfo.lastName email')
        .populate('privacyPolicies.approvedBy', 'personalInfo.firstName personalInfo.lastName')
        .populate('dataProcessingAgreements.signedBy', 'personalInfo.firstName personalInfo.lastName');

        if (!privacy) {
            // Create default privacy settings
            privacy = await Privacy.create({
                organization: req.organization.id,
                dataRetention: {
                    userDataRetentionDays: 365,
                    activityLogRetentionDays: 90,
                    financialDataRetentionDays: 2190,
                    hrDataRetentionDays: 1825,
                    autoAnonymizeAfterRetention: true
                },
                consentSettings: {
                    requireConsentForDataProcessing: true,
                    consentVersion: '1.0',
                    consentLastUpdated: new Date(),
                    purposes: [
                        {
                            purposeId: 'essential',
                            purposeName: 'Essential Operations',
                            description: 'Required for basic system functionality',
                            required: true,
                            isActive: true
                        },
                        {
                            purposeId: 'marketing',
                            purposeName: 'Marketing Communications',
                            description: 'Send promotional emails and updates',
                            required: false,
                            isActive: true
                        },
                        {
                            purposeId: 'analytics',
                            purposeName: 'Analytics & Improvements',
                            description: 'Analyze usage to improve our services',
                            required: false,
                            isActive: true
                        }
                    ]
                }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                ...privacy.toObject(),
                complianceScore: privacy.complianceScore
            }
        });

    } catch (error) {
        console.error('Get privacy settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch privacy settings'
        });
    }
};

/**
 * @desc    Update data retention policies
 * @route   PUT /api/system/privacy/retention
 * @access  Private (requires security.privacy_manage)
 */
const updateRetentionPolicies = async (req, res) => {
    try {
        const {
            userDataRetentionDays,
            activityLogRetentionDays,
            financialDataRetentionDays,
            hrDataRetentionDays,
            autoAnonymizeAfterRetention
        } = req.body;

        let privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy) {
            privacy = new Privacy({ organization: req.organization.id });
        }

        if (!privacy.dataRetention) privacy.dataRetention = {};

        if (userDataRetentionDays) privacy.dataRetention.userDataRetentionDays = userDataRetentionDays;
        if (activityLogRetentionDays) privacy.dataRetention.activityLogRetentionDays = activityLogRetentionDays;
        if (financialDataRetentionDays) privacy.dataRetention.financialDataRetentionDays = financialDataRetentionDays;
        if (hrDataRetentionDays) privacy.dataRetention.hrDataRetentionDays = hrDataRetentionDays;
        if (autoAnonymizeAfterRetention !== undefined) {
            privacy.dataRetention.autoAnonymizeAfterRetention = autoAnonymizeAfterRetention;
        }

        privacy.updatedBy = req.user.memberId;
        await privacy.save();

        res.status(200).json({
            success: true,
            message: 'Retention policies updated successfully',
            data: privacy.dataRetention
        });

    } catch (error) {
        console.error('Update retention policies error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update retention policies'
        });
    }
};

// ============================================
// CONSENT MANAGEMENT
// ============================================

/**
 * @desc    Get consent settings
 * @route   GET /api/system/privacy/consent/settings
 * @access  Private (requires security.privacy_view)
 */
const getConsentSettings = async (req, res) => {
    try {
        const privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy || !privacy.consentSettings) {
            return res.status(404).json({
                success: false,
                message: 'Consent settings not found'
            });
        }

        res.status(200).json({
            success: true,
            data: privacy.consentSettings
        });

    } catch (error) {
        console.error('Get consent settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch consent settings'
        });
    }
};

/**
 * @desc    Update consent settings
 * @route   PUT /api/system/privacy/consent/settings
 * @access  Private (requires security.privacy_manage)
 */
const updateConsentSettings = async (req, res) => {
    try {
        const {
            requireConsentForDataProcessing,
            consentVersion,
            consentText,
            purposes
        } = req.body;

        let privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy) {
            privacy = new Privacy({ organization: req.organization.id });
        }

        if (!privacy.consentSettings) privacy.consentSettings = {};

        if (requireConsentForDataProcessing !== undefined) {
            privacy.consentSettings.requireConsentForDataProcessing = requireConsentForDataProcessing;
        }
        if (consentVersion) privacy.consentSettings.consentVersion = consentVersion;
        if (consentText) privacy.consentSettings.consentText = consentText;
        if (purposes) privacy.consentSettings.purposes = purposes;

        privacy.consentSettings.consentLastUpdated = new Date();
        privacy.updatedBy = req.user.memberId;
        await privacy.save();

        res.status(200).json({
            success: true,
            message: 'Consent settings updated successfully',
            data: privacy.consentSettings
        });

    } catch (error) {
        console.error('Update consent settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update consent settings'
        });
    }
};

/**
 * @desc    Record user consent
 * @route   POST /api/system/privacy/consent/record
 * @access  Private (requires security.privacy_manage)
 */
const recordUserConsent = async (req, res) => {
    try {
        const {
            userId,
            consentedPurposes,
            consentDocument
        } = req.body;

        const privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy) {
            return res.status(404).json({
                success: false,
                message: 'Privacy settings not found'
            });
        }

        // Check if user exists
        const user = await OrganizationMember.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Remove any existing consent for this user
        privacy.userConsents = privacy.userConsents.filter(c => 
            c.userId.toString() !== userId.toString() || c.withdrawnAt
        );

        // Add new consent
        privacy.userConsents.push({
            userId,
            consentVersion: privacy.consentSettings?.consentVersion || '1.0',
            consentedAt: new Date(),
            consentedPurposes,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            consentDocument: consentDocument ? {
                filename: consentDocument.filename,
                fileUrl: consentDocument.fileUrl,
                publicId: consentDocument.publicId,
                uploadedAt: new Date()
            } : undefined
        });

        privacy.updatedBy = req.user.memberId;
        await privacy.save();

        res.status(200).json({
            success: true,
            message: 'User consent recorded successfully'
        });

    } catch (error) {
        console.error('Record user consent error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record user consent'
        });
    }
};

/**
 * @desc    Withdraw user consent
 * @route   POST /api/system/privacy/consent/withdraw/:userId
 * @access  Private (requires security.privacy_manage)
 */
const withdrawUserConsent = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        const privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy) {
            return res.status(404).json({
                success: false,
                message: 'Privacy settings not found'
            });
        }

        const consent = privacy.userConsents.find(c => 
            c.userId.toString() === userId.toString() && !c.withdrawnAt
        );

        if (!consent) {
            return res.status(404).json({
                success: false,
                message: 'Active consent not found for this user'
            });
        }

        consent.withdrawnAt = new Date();
        consent.withdrawnReason = reason;

        privacy.updatedBy = req.user.memberId;
        await privacy.save();

        res.status(200).json({
            success: true,
            message: 'User consent withdrawn successfully'
        });

    } catch (error) {
        console.error('Withdraw user consent error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to withdraw user consent'
        });
    }
};

// ============================================
// DATA SUBJECT REQUESTS (DSR)
// ============================================

/**
 * @desc    Get all data subject requests
 * @route   GET /api/system/privacy/dsr
 * @access  Private (requires security.privacy_view)
 */
const getDataSubjectRequests = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy || !privacy.dataSubjectRequests) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }

        let requests = privacy.dataSubjectRequests;

        // Apply status filter
        if (status) {
            requests = requests.filter(r => r.status === status);
        }

        // Sort by request date (newest first)
        requests.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

        // Paginate
        const paginatedRequests = requests.slice(skip, skip + limit);

        // Populate user info
        const userIds = [...new Set(paginatedRequests.map(r => r.userId).filter(id => id))];
        const users = await OrganizationMember.find(
            { _id: { $in: userIds } },
            'personalInfo.firstName personalInfo.lastName email'
        ).lean();

        const userMap = {};
        users.forEach(u => {
            userMap[u._id.toString()] = u;
        });

        const requestsWithUserInfo = paginatedRequests.map(req => ({
            ...req.toObject(),
            user: req.userId ? userMap[req.userId.toString()] : null
        }));

        res.status(200).json({
            success: true,
            count: requestsWithUserInfo.length,
            total: requests.length,
            page: parseInt(page),
            pages: Math.ceil(requests.length / limit),
            data: requestsWithUserInfo
        });

    } catch (error) {
        console.error('Get data subject requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch data subject requests'
        });
    }
};

/**
 * @desc    Create a data subject request
 * @route   POST /api/system/privacy/dsr
 * @access  Private (requires security.privacy_manage)
 */
const createDataSubjectRequest = async (req, res) => {
    try {
        const {
            userId,
            requestType,
            description
        } = req.body;

        let privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy) {
            privacy = new Privacy({ organization: req.organization.id });
        }

        // Generate request ID
        const requestCount = privacy.dataSubjectRequests?.length + 1 || 1;
        const requestId = `DSR-${new Date().getFullYear()}-${String(requestCount).padStart(4, '0')}`;

        // Calculate due date (30 days by default for GDPR)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        const newRequest = {
            requestId,
            userId,
            requestType,
            description,
            requestDate: new Date(),
            status: 'pending',
            dueDate
        };

        if (!privacy.dataSubjectRequests) {
            privacy.dataSubjectRequests = [];
        }

        privacy.dataSubjectRequests.push(newRequest);
        privacy.updatedBy = req.user.memberId;
        await privacy.save();

        const createdRequest = privacy.dataSubjectRequests[privacy.dataSubjectRequests.length - 1];

        res.status(201).json({
            success: true,
            message: 'Data subject request created successfully',
            data: createdRequest
        });

    } catch (error) {
        console.error('Create data subject request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create data subject request'
        });
    }
};

/**
 * @desc    Update data subject request status
 * @route   PUT /api/system/privacy/dsr/:requestId
 * @access  Private (requires security.privacy_manage)
 */
const updateDataSubjectRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status, rejectionReason, notes } = req.body;

        const privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy) {
            return res.status(404).json({
                success: false,
                message: 'Privacy settings not found'
            });
        }

        const request = privacy.dataSubjectRequests.find(r => r.requestId === requestId);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Data subject request not found'
            });
        }

        request.status = status;
        if (status === 'completed') {
            request.completedAt = new Date();
            request.processedBy = req.user.memberId;
        }
        if (status === 'rejected') {
            request.rejectionReason = rejectionReason;
        }
        if (notes) request.notes = notes;

        privacy.updatedBy = req.user.memberId;
        await privacy.save();

        res.status(200).json({
            success: true,
            message: 'Data subject request updated successfully',
            data: request
        });

    } catch (error) {
        console.error('Update data subject request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update data subject request'
        });
    }
};

/**
 * @desc    Upload response for data subject request
 * @route   POST /api/system/privacy/dsr/:requestId/response
 * @access  Private (requires security.privacy_manage)
 */
const uploadDsrResponse = async (req, res) => {
    try {
        const { requestId } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy) {
            return res.status(404).json({
                success: false,
                message: 'Privacy settings not found'
            });
        }

        const request = privacy.dataSubjectRequests.find(r => r.requestId === requestId);
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Data subject request not found'
            });
        }

        request.responseData = {
            filename: file.originalname,
            fileUrl: file.path,
            publicId: file.filename,
            uploadedAt: new Date()
        };
        request.status = 'completed';
        request.completedAt = new Date();
        request.processedBy = req.user.memberId;

        privacy.updatedBy = req.user.memberId;
        await privacy.save();

        res.status(200).json({
            success: true,
            message: 'Response uploaded successfully',
            data: request.responseData
        });

    } catch (error) {
        console.error('Upload DSR response error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload response'
        });
    }
};

// ============================================
// PRIVACY POLICIES
// ============================================

/**
 * @desc    Get privacy policies
 * @route   GET /api/system/privacy/policies
 * @access  Private (requires security.privacy_view)
 */
const getPrivacyPolicies = async (req, res) => {
    try {
        const privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        })
        .populate('privacyPolicies.approvedBy', 'personalInfo.firstName personalInfo.lastName');

        if (!privacy || !privacy.privacyPolicies) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }

        res.status(200).json({
            success: true,
            count: privacy.privacyPolicies.length,
            data: privacy.privacyPolicies
        });

    } catch (error) {
        console.error('Get privacy policies error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch privacy policies'
        });
    }
};

/**
 * @desc    Create new privacy policy version
 * @route   POST /api/system/privacy/policies
 * @access  Private (requires security.privacy_manage)
 */
const createPrivacyPolicy = async (req, res) => {
    try {
        const {
            version,
            effectiveDate,
            content,
            notes
        } = req.body;

        let privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy) {
            privacy = new Privacy({ organization: req.organization.id });
        }

        // Set all existing policies to not current
        if (privacy.privacyPolicies) {
            privacy.privacyPolicies.forEach(p => {
                p.isCurrent = false;
            });
        } else {
            privacy.privacyPolicies = [];
        }

        // Add new policy
        privacy.privacyPolicies.push({
            version,
            effectiveDate: effectiveDate || new Date(),
            content,
            isCurrent: true,
            approvedBy: req.user.memberId,
            approvedAt: new Date(),
            notes
        });

        privacy.updatedBy = req.user.memberId;
        await privacy.save();

        res.status(201).json({
            success: true,
            message: 'Privacy policy created successfully',
            data: privacy.privacyPolicies[privacy.privacyPolicies.length - 1]
        });

    } catch (error) {
        console.error('Create privacy policy error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create privacy policy'
        });
    }
};

// ============================================
// DATA PROCESSING AGREEMENTS
// ============================================

/**
 * @desc    Upload data processing agreement
 * @route   POST /api/system/privacy/dpa
 * @access  Private (requires security.privacy_manage)
 */
const uploadDPA = async (req, res) => {
    try {
        const {
            title,
            counterparty,
            agreementDate,
            effectiveDate,
            expiryDate,
            scope
        } = req.body;

        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        let privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy) {
            privacy = new Privacy({ organization: req.organization.id });
        }

        if (!privacy.dataProcessingAgreements) {
            privacy.dataProcessingAgreements = [];
        }

        privacy.dataProcessingAgreements.push({
            title,
            counterparty,
            agreementDate: agreementDate || new Date(),
            effectiveDate: effectiveDate || new Date(),
            expiryDate,
            scope,
            documentFile: {
                filename: file.originalname,
                fileUrl: file.path,
                publicId: file.filename,
                uploadedAt: new Date()
            },
            status: 'active',
            signedBy: req.user.memberId
        });

        privacy.updatedBy = req.user.memberId;
        await privacy.save();

        res.status(201).json({
            success: true,
            message: 'DPA uploaded successfully',
            data: privacy.dataProcessingAgreements[privacy.dataProcessingAgreements.length - 1]
        });

    } catch (error) {
        console.error('Upload DPA error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload DPA'
        });
    }
};

// ============================================
// DATA BREACH MANAGEMENT
// ============================================

/**
 * @desc    Report a data breach
 * @route   POST /api/system/privacy/breaches
 * @access  Private (requires security.privacy_manage)
 */
const reportDataBreach = async (req, res) => {
    try {
        const {
            discoveryDate,
            description,
            affectedData,
            affectedUsers,
            affectedRecords,
            riskAssessment,
            actionsTaken
        } = req.body;

        let privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy) {
            privacy = new Privacy({ organization: req.organization.id });
        }

        // Generate breach ID
        const breachCount = privacy.dataBreaches?.length + 1 || 1;
        const breachId = `BR-${new Date().getFullYear()}-${String(breachCount).padStart(4, '0')}`;

        if (!privacy.dataBreaches) {
            privacy.dataBreaches = [];
        }

        privacy.dataBreaches.push({
            breachId,
            discoveryDate: discoveryDate || new Date(),
            description,
            affectedData,
            affectedUsers,
            affectedRecords,
            riskAssessment,
            actionsTaken,
            status: 'investigating',
            createdBy: req.user.memberId,
            createdAt: new Date()
        });

        privacy.updatedBy = req.user.memberId;
        await privacy.save();

        res.status(201).json({
            success: true,
            message: 'Data breach reported successfully',
            data: privacy.dataBreaches[privacy.dataBreaches.length - 1]
        });

    } catch (error) {
        console.error('Report data breach error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to report data breach'
        });
    }
};

/**
 * @desc    Update data breach status
 * @route   PUT /api/system/privacy/breaches/:breachId
 * @access  Private (requires security.privacy_manage)
 */
const updateDataBreach = async (req, res) => {
    try {
        const { breachId } = req.params;
        const { status, notifiedAuthority, notifiedAffected, reportFile } = req.body;

        const privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy) {
            return res.status(404).json({
                success: false,
                message: 'Privacy settings not found'
            });
        }

        const breach = privacy.dataBreaches.find(b => b.breachId === breachId);
        if (!breach) {
            return res.status(404).json({
                success: false,
                message: 'Data breach not found'
            });
        }

        if (status) breach.status = status;
        if (notifiedAuthority !== undefined) {
            breach.notifiedAuthority = notifiedAuthority;
            if (notifiedAuthority) {
                breach.authorityNotificationDate = new Date();
            }
        }
        if (notifiedAffected !== undefined) {
            breach.notifiedAffected = notifiedAffected;
            if (notifiedAffected) {
                breach.affectedNotificationDate = new Date();
            }
        }

        privacy.updatedBy = req.user.memberId;
        await privacy.save();

        res.status(200).json({
            success: true,
            message: 'Data breach updated successfully',
            data: breach
        });

    } catch (error) {
        console.error('Update data breach error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update data breach'
        });
    }
};

// ============================================
// GDPR COMPLIANCE
// ============================================

/**
 * @desc    Update GDPR settings
 * @route   PUT /api/system/privacy/gdpr
 * @access  Private (requires security.privacy_manage)
 */
const updateGdprSettings = async (req, res) => {
    try {
        const {
            dataProtectionOfficer,
            representativeInEU,
            supervisoryAuthority,
            crossBorderTransfers,
            adequacyDecisions
        } = req.body;

        let privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy) {
            privacy = new Privacy({ organization: req.organization.id });
        }

        if (!privacy.gdprSettings) privacy.gdprSettings = {};

        if (dataProtectionOfficer) privacy.gdprSettings.dataProtectionOfficer = dataProtectionOfficer;
        if (representativeInEU) privacy.gdprSettings.representativeInEU = representativeInEU;
        if (supervisoryAuthority) privacy.gdprSettings.supervisoryAuthority = supervisoryAuthority;
        if (crossBorderTransfers !== undefined) privacy.gdprSettings.crossBorderTransfers = crossBorderTransfers;
        if (adequacyDecisions) privacy.gdprSettings.adequacyDecisions = adequacyDecisions;

        privacy.updatedBy = req.user.memberId;
        await privacy.save();

        res.status(200).json({
            success: true,
            message: 'GDPR settings updated successfully',
            data: privacy.gdprSettings
        });

    } catch (error) {
        console.error('Update GDPR settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update GDPR settings'
        });
    }
};

// ============================================
// REPORTS & EXPORTS
// ============================================

/**
 * @desc    Get privacy compliance report
 * @route   GET /api/system/privacy/reports/compliance
 * @access  Private (requires security.privacy_view)
 */
const getComplianceReport = async (req, res) => {
    try {
        const privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        })
        .populate('userConsents.userId', 'personalInfo.firstName personalInfo.lastName email')
        .populate('dataSubjectRequests.userId', 'personalInfo.firstName personalInfo.lastName email');

        if (!privacy) {
            return res.status(404).json({
                success: false,
                message: 'Privacy settings not found'
            });
        }

        const report = {
            organization: req.organization.id,
            generatedAt: new Date(),
            generatedBy: req.user.memberId,
            
            complianceScore: privacy.complianceScore,
            
            summary: {
                totalUsersWithConsent: privacy.userConsents?.filter(c => !c.withdrawnAt).length || 0,
                totalConsentsWithdrawn: privacy.userConsents?.filter(c => c.withdrawnAt).length || 0,
                pendingDSR: privacy.dataSubjectRequests?.filter(r => r.status === 'pending').length || 0,
                activeDPAs: privacy.dataProcessingAgreements?.filter(a => a.status === 'active').length || 0,
                dataBreaches: privacy.dataBreaches?.length || 0
            },
            
            dataRetention: privacy.dataRetention,
            consentPurposes: privacy.consentSettings?.purposes,
            gdprSettings: privacy.gdprSettings,
            
            recentDSR: privacy.dataSubjectRequests?.slice(-5).map(r => ({
                requestId: r.requestId,
                requestType: r.requestType,
                status: r.status,
                requestDate: r.requestDate,
                dueDate: r.dueDate
            })),
            
            recentBreaches: privacy.dataBreaches?.slice(-5).map(b => ({
                breachId: b.breachId,
                discoveryDate: b.discoveryDate,
                status: b.status,
                affectedRecords: b.affectedRecords
            }))
        };

        res.status(200).json({
            success: true,
            data: report
        });

    } catch (error) {
        console.error('Get compliance report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate compliance report'
        });
    }
};

/**
 * @desc    Export all privacy data (for GDPR data portability)
 * @route   GET /api/system/privacy/export
 * @access  Private (requires security.privacy_view)
 */
const exportPrivacyData = async (req, res) => {
    try {
        const privacy = await Privacy.findOne({ 
            organization: req.organization.id 
        });

        if (!privacy) {
            return res.status(404).json({
                success: false,
                message: 'No privacy data found'
            });
        }

        // Remove sensitive metadata
        const exportData = {
            organization: privacy.organization,
            exportedAt: new Date(),
            dataRetention: privacy.dataRetention,
            consentSettings: {
                version: privacy.consentSettings?.consentVersion,
                lastUpdated: privacy.consentSettings?.consentLastUpdated,
                purposes: privacy.consentSettings?.purposes
            },
            userConsents: privacy.userConsents?.map(c => ({
                userId: c.userId,
                consentedAt: c.consentedAt,
                consentedPurposes: c.consentedPurposes,
                withdrawnAt: c.withdrawnAt
            })),
            dataSubjectRequests: privacy.dataSubjectRequests?.map(r => ({
                requestId: r.requestId,
                requestType: r.requestType,
                requestDate: r.requestDate,
                status: r.status,
                completedAt: r.completedAt
            })),
            dataProcessingAgreements: privacy.dataProcessingAgreements?.map(a => ({
                title: a.title,
                counterparty: a.counterparty,
                effectiveDate: a.effectiveDate,
                expiryDate: a.expiryDate,
                status: a.status
            })),
            dataBreaches: privacy.dataBreaches?.map(b => ({
                breachId: b.breachId,
                discoveryDate: b.discoveryDate,
                status: b.status,
                affectedRecords: b.affectedRecords
            })),
            gdprSettings: privacy.gdprSettings
        };

        res.status(200).json({
            success: true,
            data: exportData
        });

    } catch (error) {
        console.error('Export privacy data error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export privacy data'
        });
    }
};

module.exports = {
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
};