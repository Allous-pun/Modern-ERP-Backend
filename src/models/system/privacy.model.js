// src/models/system/privacy.model.js
const mongoose = require('mongoose');

const privacySchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        unique: true,
        index: true
    },

    // ============================================
    // DATA RETENTION POLICIES
    // ============================================
    dataRetention: {
        userDataRetentionDays: {
            type: Number,
            default: 365, // 1 year
            min: 30,
            max: 3650
        },
        activityLogRetentionDays: {
            type: Number,
            default: 90, // 3 months
            min: 30,
            max: 730
        },
        financialDataRetentionDays: {
            type: Number,
            default: 2190, // 6 years (tax requirements)
            min: 365,
            max: 3650
        },
        hrDataRetentionDays: {
            type: Number,
            default: 1825, // 5 years
            min: 365,
            max: 3650
        },
        autoAnonymizeAfterRetention: {
            type: Boolean,
            default: true
        }
    },

    // ============================================
    // CONSENT MANAGEMENT
    // ============================================
    consentSettings: {
        requireConsentForDataProcessing: {
            type: Boolean,
            default: true
        },
        consentVersion: {
            type: String,
            default: '1.0'
        },
        consentLastUpdated: Date,
        consentText: String,
        
        // Consent purposes
        purposes: [{
            purposeId: String,
            purposeName: String,
            description: String,
            required: {
                type: Boolean,
                default: false
            },
            isActive: {
                type: Boolean,
                default: true
            }
        }]
    },

    // ============================================
    // USER CONSENTS (embedded for quick access)
    // ============================================
    userConsents: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember',
            required: true
        },
        consentVersion: String,
        consentedAt: {
            type: Date,
            default: Date.now
        },
        consentedPurposes: [String],
        ipAddress: String,
        userAgent: String,
        consentDocument: {
            filename: String,
            fileUrl: String,
            publicId: String, // Cloudinary public_id
            uploadedAt: Date
        },
        withdrawnAt: Date,
        withdrawnReason: String
    }],

    // ============================================
    // DATA SUBJECT REQUESTS (DSR)
    // ============================================
    dataSubjectRequests: [{
        requestId: {
            type: String,
            unique: true,
            sparse: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        requestType: {
            type: String,
            enum: [
                'access',           // Right to access
                'rectification',    // Right to rectify
                'erasure',          // Right to be forgotten
                'restrict',         // Right to restrict processing
                'portability',      // Right to data portability
                'object'            // Right to object
            ],
            required: true
        },
        requestDate: {
            type: Date,
            default: Date.now
        },
        description: String,
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'rejected', 'expired'],
            default: 'pending'
        },
        dueDate: Date,
        completedAt: Date,
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        responseData: {
            filename: String,
            fileUrl: String,
            publicId: String, // Cloudinary public_id
            uploadedAt: Date
        },
        rejectionReason: String,
        notes: String
    }],

    // ============================================
    // DATA PROCESSING AGREEMENTS
    // ============================================
    dataProcessingAgreements: [{
        title: String,
        counterparty: String,
        agreementDate: Date,
        effectiveDate: Date,
        expiryDate: Date,
        scope: String,
        documentFile: {
            filename: String,
            fileUrl: String,
            publicId: String, // Cloudinary public_id
            uploadedAt: Date
        },
        status: {
            type: String,
            enum: ['active', 'expired', 'terminated'],
            default: 'active'
        },
        signedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        notes: String
    }],

    // ============================================
    // PRIVACY POLICIES
    // ============================================
    privacyPolicies: [{
        version: String,
        effectiveDate: Date,
        content: String,
        documentFile: {
            filename: String,
            fileUrl: String,
            publicId: String, // Cloudinary public_id
            uploadedAt: Date
        },
        isCurrent: {
            type: Boolean,
            default: false
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        approvedAt: Date,
        notes: String
    }],

    // ============================================
    // GDPR SPECIFIC
    // ============================================
    gdprSettings: {
        dataProtectionOfficer: {
            name: String,
            email: String,
            phone: String,
            memberId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            }
        },
        representativeInEU: {
            name: String,
            email: String,
            phone: String,
            address: String
        },
        supervisoryAuthority: {
            name: String,
            country: String,
            contactEmail: String,
            registrationNumber: String
        },
        crossBorderTransfers: {
            type: Boolean,
            default: false
        },
        adequacyDecisions: [String],
        bindingCorporateRules: {
            hasBCR: { type: Boolean, default: false },
            documentFile: {
                filename: String,
                fileUrl: String,
                publicId: String
            }
        }
    },

    // ============================================
    // DATA BREACH MANAGEMENT
    // ============================================
    dataBreaches: [{
        breachId: String,
        discoveryDate: Date,
        notificationDate: Date,
        description: String,
        affectedData: [String],
        affectedUsers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        }],
        affectedRecords: Number,
        riskAssessment: String,
        actionsTaken: String,
        notifiedAuthority: {
            type: Boolean,
            default: false
        },
        authorityNotificationDate: Date,
        notifiedAffected: {
            type: Boolean,
            default: false
        },
        affectedNotificationDate: Date,
        status: {
            type: String,
            enum: ['investigating', 'mitigated', 'resolved', 'closed'],
            default: 'investigating'
        },
        reportFile: {
            filename: String,
            fileUrl: String,
            publicId: String,
            uploadedAt: Date
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    // ============================================
    // DATA MAPPING / INVENTORY
    // ============================================
    dataInventory: [{
        dataCategory: String,
        dataElements: [String],
        purpose: String,
        legalBasis: String,
        retentionPeriod: Number,
        recipients: [String],
        thirdCountryTransfers: Boolean,
        safeguards: String,
        dataSubjects: [String],
        controller: String,
        processor: String
    }],

    // ============================================
    // METADATA
    // ============================================
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    lastReviewDate: Date,
    nextReviewDate: Date
}, {
    timestamps: true
});

// Indexes
privacySchema.index({ organization: 1, 'userConsents.userId': 1 });
privacySchema.index({ organization: 1, 'dataSubjectRequests.userId': 1 });
privacySchema.index({ organization: 1, 'dataSubjectRequests.status': 1 });
privacySchema.index({ organization: 1, 'dataBreaches.status': 1 });

// Virtual for compliance score
privacySchema.virtual('complianceScore').get(function() {
    let score = 0;
    let total = 0;

    // Check DPO appointment
    if (this.gdprSettings?.dataProtectionOfficer?.name) score += 10;
    total += 10;

    // Check privacy policy
    if (this.privacyPolicies?.some(p => p.isCurrent)) score += 10;
    total += 10;

    // Check consent management
    if (this.consentSettings?.requireConsentForDataProcessing) score += 10;
    total += 10;

    // Check data retention policies
    if (this.dataRetention) score += 10;
    total += 10;

    // Check data processing agreements
    if (this.dataProcessingAgreements?.length > 0) score += 10;
    total += 10;

    // Check data breach procedure
    if (this.dataBreaches) score += 10;
    total += 10;

    return Math.round((score / total) * 100);
});

module.exports = mongoose.model('Privacy', privacySchema);