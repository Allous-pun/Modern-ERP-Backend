// src/controllers/system/risk.controller.js
const mongoose = require('mongoose');
const RiskItem = require('../../models/system/risk-item.model');
const OrganizationMember = require('../../models/organizationMember.model');

// ============================================
// RISK REGISTER MANAGEMENT
// ============================================

/**
 * @desc    Get all risks
 * @route   GET /api/system/risks
 * @access  Private (requires security.risk_view)
 */
const getRisks = async (req, res) => {
    try {
        const { 
            category, 
            status, 
            level, 
            owner,
            search,
            page = 1, 
            limit = 20 
        } = req.query;

        // Build query
        const query = { organization: req.organization.id };
        
        if (category) query.category = category;
        if (status) query.status = status;
        if (level) query.riskLevel = level;
        if (owner) query.owner = owner;
        
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;
        
        // Get risks with pagination
        const [risks, total] = await Promise.all([
            RiskItem.find(query)
                .populate('owner', 'personalInfo.firstName personalInfo.lastName')
                .populate('createdBy', 'personalInfo.firstName personalInfo.lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            RiskItem.countDocuments(query)
        ]);

        // Calculate metrics (can be cached or computed on the fly)
        const metrics = await calculateMetrics(req.organization.id);

        res.status(200).json({
            success: true,
            count: risks.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: risks,
            metrics
        });

    } catch (error) {
        console.error('Get risks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch risks'
        });
    }
};

/**
 * @desc    Get single risk by ID - ENHANCED with dual lookup
 * @route   GET /api/system/risks/:riskId
 * @access  Private (requires security.risk_view)
 */
const getRisk = async (req, res) => {
    try {
        const { riskId } = req.params;

        let risk;
        
        // Try by ObjectId first
        if (riskId.match(/^[0-9a-fA-F]{24}$/)) {
            risk = await RiskItem.findOne({
                _id: riskId,
                organization: req.organization.id
            })
            .populate('owner', 'personalInfo.firstName personalInfo.lastName')
            .populate('stakeholders', 'personalInfo.firstName personalInfo.lastName')
            .populate('createdBy', 'personalInfo.firstName personalInfo.lastName')
            .populate('history.performedBy', 'personalInfo.firstName personalInfo.lastName')
            .lean();
        }
        
        // If not found, try by riskId field
        if (!risk) {
            risk = await RiskItem.findOne({
                riskId: riskId,
                organization: req.organization.id
            })
            .populate('owner', 'personalInfo.firstName personalInfo.lastName')
            .populate('stakeholders', 'personalInfo.firstName personalInfo.lastName')
            .populate('createdBy', 'personalInfo.firstName personalInfo.lastName')
            .populate('history.performedBy', 'personalInfo.firstName personalInfo.lastName')
            .lean();
        }

        if (!risk) {
            return res.status(404).json({
                success: false,
                message: 'Risk not found'
            });
        }

        res.status(200).json({
            success: true,
            data: risk
        });

    } catch (error) {
        console.error('Get risk error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch risk'
        });
    }
};

/**
 * @desc    Create a new risk - FAST VERSION with separate collection
 * @route   POST /api/system/risks
 * @access  Private (requires security.risk_manage)
 */
const createRisk = async (req, res) => {
    console.log('🚀 Create risk started at:', new Date().toISOString());
    
    try {
        const {
            title,
            description,
            category,
            subCategory,
            impact,
            probability,
            mitigationStrategy,
            mitigationPlan,
            contingencyPlan,
            owner,
            stakeholders,
            targetResolutionDate,
            monitoringFrequency,
            financialImpact,
            dependencies,
            notes
        } = req.body;

        // Validate owner if provided
        if (owner) {
            const ownerExists = await OrganizationMember.findById(owner);
            if (!ownerExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Owner not found'
                });
            }
        }

        // Validate stakeholders if provided
        if (stakeholders && stakeholders.length > 0) {
            const stakeholderCount = await OrganizationMember.countDocuments({
                _id: { $in: stakeholders }
            });
            if (stakeholderCount !== stakeholders.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more stakeholders not found'
                });
            }
        }

        // Get count for risk ID generation
        const riskCount = await RiskItem.countDocuments({ 
            organization: req.organization.id 
        }) + 1;
        
        const riskId = `RISK-${new Date().getFullYear()}-${String(riskCount).padStart(4, '0')}`;

        // Calculate initial risk score and level
        const impactMap = { very_low: 1, low: 2, medium: 3, high: 4, critical: 5 };
        const probMap = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 };
        
        const impactValue = impactMap[impact] || 1;
        const probValue = probMap[probability] || 1;
        const riskScore = impactValue * probValue;
        
        let riskLevel = 'low';
        if (riskScore <= 4) riskLevel = 'very_low';
        else if (riskScore <= 8) riskLevel = 'low';
        else if (riskScore <= 12) riskLevel = 'medium';
        else if (riskScore <= 16) riskLevel = 'high';
        else riskLevel = 'critical';

        // Calculate next review date
        let nextReviewDate = null;
        if (monitoringFrequency) {
            nextReviewDate = new Date();
            switch(monitoringFrequency) {
                case 'daily': nextReviewDate.setDate(nextReviewDate.getDate() + 1); break;
                case 'weekly': nextReviewDate.setDate(nextReviewDate.getDate() + 7); break;
                case 'monthly': nextReviewDate.setMonth(nextReviewDate.getMonth() + 1); break;
                case 'quarterly': nextReviewDate.setMonth(nextReviewDate.getMonth() + 3); break;
                case 'annually': nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1); break;
            }
        }

        // Create the risk item directly in its own collection
        const newRisk = await RiskItem.create({
            organization: req.organization.id,
            riskId,
            title,
            description,
            category,
            subCategory,
            impact,
            probability,
            riskScore,
            riskLevel,
            mitigationStrategy: mitigationStrategy || 'reduce',
            mitigationPlan,
            contingencyPlan,
            owner,
            stakeholders: stakeholders || [],
            targetResolutionDate,
            monitoringFrequency: monitoringFrequency || 'monthly',
            nextReviewDate,
            financialImpact,
            dependencies: dependencies || [],
            status: 'identified',
            identifiedDate: new Date(),
            lastReviewDate: new Date(),
            createdBy: req.user.memberId,
            history: [{
                action: 'created',
                performedBy: req.user.memberId,
                performedAt: new Date(),
                notes: 'Risk created'
            }],
            notes
        });

        console.log(`✅ Risk created in ${Date.now() - new Date(req._startTime).getTime()}ms`);

        res.status(201).json({
            success: true,
            message: 'Risk created successfully',
            data: newRisk
        });

    } catch (error) {
        console.error('❌ Create risk error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create risk',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Update a risk - ENHANCED with dual lookup
 * @route   PUT /api/system/risks/:riskId
 * @access  Private (requires security.risk_manage)
 */
const updateRisk = async (req, res) => {
    try {
        const { riskId } = req.params;
        const updates = req.body;

        let risk;
        
        // Try by ObjectId first
        if (riskId.match(/^[0-9a-fA-F]{24}$/)) {
            risk = await RiskItem.findOne({
                _id: riskId,
                organization: req.organization.id
            });
        }
        
        // If not found, try by riskId field
        if (!risk) {
            risk = await RiskItem.findOne({
                riskId: riskId,
                organization: req.organization.id
            });
        }

        if (!risk) {
            return res.status(404).json({
                success: false,
                message: 'Risk not found'
            });
        }

        // Validate owner if being updated
        if (updates.owner) {
            const ownerExists = await OrganizationMember.findById(updates.owner);
            if (!ownerExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Owner not found'
                });
            }
        }

        // Track changes for history
        const changes = {};
        const allowedFields = [
            'title', 'description', 'category', 'subCategory', 'impact',
            'probability', 'mitigationStrategy', 'mitigationPlan', 'contingencyPlan',
            'owner', 'stakeholders', 'targetResolutionDate', 'actualResolutionDate',
            'status', 'monitoringFrequency', 'financialImpact', 'dependencies', 'notes'
        ];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined && updates[field] !== risk[field]) {
                changes[field] = {
                    from: risk[field],
                    to: updates[field]
                };
                risk[field] = updates[field];
            }
        });

        // Recalculate risk score if impact or probability changed
        if (updates.impact || updates.probability) {
            const impactMap = { very_low: 1, low: 2, medium: 3, high: 4, critical: 5 };
            const probMap = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 };
            
            const impactValue = impactMap[risk.impact] || 1;
            const probValue = probMap[risk.probability] || 1;
            risk.riskScore = impactValue * probValue;
            
            if (risk.riskScore <= 4) risk.riskLevel = 'very_low';
            else if (risk.riskScore <= 8) risk.riskLevel = 'low';
            else if (risk.riskScore <= 12) risk.riskLevel = 'medium';
            else if (risk.riskScore <= 16) risk.riskLevel = 'high';
            else risk.riskLevel = 'critical';
        }

        // Recalculate next review date if monitoring frequency changed
        if (updates.monitoringFrequency) {
            const nextDate = new Date();
            switch(risk.monitoringFrequency) {
                case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
                case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
                case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
                case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
                case 'annually': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
            }
            risk.nextReviewDate = nextDate;
        }

        // Add to history if there were changes
        if (Object.keys(changes).length > 0) {
            risk.history.push({
                action: 'updated',
                performedBy: req.user.memberId,
                performedAt: new Date(),
                changes,
                notes: updates.historyNotes
            });
        }

        risk.updatedBy = req.user.memberId;
        risk.updatedAt = new Date();

        await risk.save();

        // Populate for response
        await risk.populate('owner', 'personalInfo.firstName personalInfo.lastName');
        await risk.populate('stakeholders', 'personalInfo.firstName personalInfo.lastName');

        res.status(200).json({
            success: true,
            message: 'Risk updated successfully',
            data: risk
        });

    } catch (error) {
        console.error('Update risk error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update risk'
        });
    }
};

/**
 * @desc    Update risk status - ENHANCED with dual lookup
 * @route   PATCH /api/system/risks/:riskId/status
 * @access  Private (requires security.risk_manage)
 */
const updateRiskStatus = async (req, res) => {
    try {
        const { riskId } = req.params;
        const { status, notes } = req.body;

        // First try to find by _id (MongoDB ObjectId)
        let risk;
        
        // Check if the riskId is a valid ObjectId (24 character hex string)
        if (riskId.match(/^[0-9a-fA-F]{24}$/)) {
            risk = await RiskItem.findOne({
                _id: riskId,
                organization: req.organization.id
            });
        }
        
        // If not found by _id, try by riskId field
        if (!risk) {
            risk = await RiskItem.findOne({
                riskId: riskId,
                organization: req.organization.id
            });
        }

        if (!risk) {
            return res.status(404).json({
                success: false,
                message: 'Risk not found'
            });
        }

        const oldStatus = risk.status;
        risk.status = status;

        // Add to history
        risk.history.push({
            action: status === 'closed' ? 'closed' : 'updated',
            performedBy: req.user.memberId,
            performedAt: new Date(),
            changes: { status: { from: oldStatus, to: status } },
            notes
        });

        if (status === 'closed') {
            risk.actualResolutionDate = new Date();
        }

        await risk.save();

        res.status(200).json({
            success: true,
            message: 'Risk status updated successfully',
            data: risk
        });

    } catch (error) {
        console.error('Update risk status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update risk status'
        });
    }
};

/**
 * @desc    Archive a risk (soft delete) - ENHANCED with dual lookup
 * @route   DELETE /api/system/risks/:riskId
 * @access  Private (requires security.risk_manage)
 */
const deleteRisk = async (req, res) => {
    try {
        const { riskId } = req.params;

        let risk;
        
        // Try by ObjectId first
        if (riskId.match(/^[0-9a-fA-F]{24}$/)) {
            risk = await RiskItem.findOne({
                _id: riskId,
                organization: req.organization.id
            });
        }
        
        // If not found, try by riskId field
        if (!risk) {
            risk = await RiskItem.findOne({
                riskId: riskId,
                organization: req.organization.id
            });
        }

        if (!risk) {
            return res.status(404).json({
                success: false,
                message: 'Risk not found'
            });
        }

        // Soft delete - set status to archived
        risk.status = 'archived';
        risk.history.push({
            action: 'archived',
            performedBy: req.user.memberId,
            performedAt: new Date(),
            notes: 'Risk archived'
        });

        await risk.save();

        res.status(200).json({
            success: true,
            message: 'Risk archived successfully'
        });

    } catch (error) {
        console.error('Archive risk error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to archive risk'
        });
    }
};

// ============================================
// RISK ASSESSMENTS (Using separate Assessment model)
// ============================================

/**
 * @desc    Create a risk assessment
 * @route   POST /api/system/risks/assessments
 * @access  Private (requires security.risk_manage)
 */
const createAssessment = async (req, res) => {
    console.log('📝 Creating assessment with findings:', req.body.findings);
    const startTime = Date.now();
    
    try {
        const Assessment = require('../../models/system/assessment.model');
        
        const {
            title,
            description,
            scope,
            methodology,
            findings,
            recommendations
        } = req.body;

        // Validate findings
        if (!findings || findings.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one finding is required'
            });
        }

        // Verify all risk IDs exist
        const riskIds = findings.map(f => f.riskId);
        const risks = await RiskItem.find({
            _id: { $in: riskIds },
            organization: req.organization.id
        });

        if (risks.length !== riskIds.length) {
            return res.status(400).json({
                success: false,
                message: 'One or more risk IDs are invalid'
            });
        }

        // Calculate summary stats from current risks
        const allRisks = await RiskItem.find({
            organization: req.organization.id,
            status: { $ne: 'archived' }
        });

        const summary = {
            totalRisks: allRisks.length,
            criticalRisks: allRisks.filter(r => r.riskLevel === 'critical').length,
            highRisks: allRisks.filter(r => r.riskLevel === 'high').length,
            mediumRisks: allRisks.filter(r => r.riskLevel === 'medium').length,
            lowRisks: allRisks.filter(r => r.riskLevel === 'low' || r.riskLevel === 'very_low').length
        };

        // Get previous scores for findings
        const findingsWithScores = await Promise.all(findings.map(async (finding) => {
            const risk = await RiskItem.findById(finding.riskId);
            return {
                riskId: finding.riskId,
                previousScore: risk?.riskScore || 0,
                observations: finding.observations
            };
        }));

        // Create assessment directly in its own collection
        const assessment = await Assessment.create({
            organization: req.organization.id,
            title,
            description,
            assessmentDate: new Date(),
            assessor: req.user.memberId,
            scope,
            methodology,
            summary,
            findings: findingsWithScores,
            recommendations: recommendations?.map(rec => ({
                ...rec,
                status: 'pending'
            })) || [],
            createdBy: req.user.memberId
        });

        // Populate for response
        await assessment.populate('assessor', 'personalInfo.firstName personalInfo.lastName');
        await assessment.populate('findings.riskId', 'riskId title category riskLevel');
        await assessment.populate('recommendations.assignedTo', 'personalInfo.firstName personalInfo.lastName');

        console.log(`✅ Assessment created in ${Date.now() - startTime}ms`);

        res.status(201).json({
            success: true,
            message: 'Assessment created successfully',
            data: assessment
        });

    } catch (error) {
        console.error('❌ Create assessment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create assessment',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Get risk assessments
 * @route   GET /api/system/risks/assessments
 * @access  Private (requires security.risk_view)
 */
const getAssessments = async (req, res) => {
    try {
        const Assessment = require('../../models/system/assessment.model');
        
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const [assessments, total] = await Promise.all([
            Assessment.find({ organization: req.organization.id })
                .populate('assessor', 'personalInfo.firstName personalInfo.lastName')
                .populate('findings.riskId', 'riskId title category riskLevel')
                .populate('recommendations.assignedTo', 'personalInfo.firstName personalInfo.lastName')
                .sort({ assessmentDate: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Assessment.countDocuments({ organization: req.organization.id })
        ]);

        res.status(200).json({
            success: true,
            count: assessments.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: assessments
        });

    } catch (error) {
        console.error('Get assessments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assessments'
        });
    }
};

/**
 * @desc    Get single assessment by ID
 * @route   GET /api/system/risks/assessments/:assessmentId
 * @access  Private (requires security.risk_view)
 */
const getAssessment = async (req, res) => {
    try {
        const Assessment = require('../../models/system/assessment.model');
        const { assessmentId } = req.params;

        const assessment = await Assessment.findOne({
            _id: assessmentId,
            organization: req.organization.id
        })
        .populate('assessor', 'personalInfo.firstName personalInfo.lastName')
        .populate('findings.riskId', 'riskId title category riskLevel description')
        .populate('recommendations.assignedTo', 'personalInfo.firstName personalInfo.lastName')
        .lean();

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: 'Assessment not found'
            });
        }

        res.status(200).json({
            success: true,
            data: assessment
        });

    } catch (error) {
        console.error('Get assessment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assessment'
        });
    }
};

/**
 * @desc    Update assessment recommendations status
 * @route   PATCH /api/system/risks/assessments/:assessmentId/recommendations/:recommendationId
 * @access  Private (requires security.risk_manage)
 */
const updateRecommendationStatus = async (req, res) => {
    try {
        const Assessment = require('../../models/system/assessment.model');
        const { assessmentId, recommendationId } = req.params;
        const { status } = req.body;

        const assessment = await Assessment.findOne({
            _id: assessmentId,
            organization: req.organization.id
        });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: 'Assessment not found'
            });
        }

        // Find and update the specific recommendation
        const recommendation = assessment.recommendations.id(recommendationId);
        if (!recommendation) {
            return res.status(404).json({
                success: false,
                message: 'Recommendation not found'
            });
        }

        recommendation.status = status;
        await assessment.save();

        res.status(200).json({
            success: true,
            message: 'Recommendation status updated successfully',
            data: recommendation
        });

    } catch (error) {
        console.error('Update recommendation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update recommendation status'
        });
    }
};

// ============================================
// RISK METRICS & REPORTS
// ============================================

/**
 * @desc    Get risk dashboard
 * @route   GET /api/system/risks/dashboard
 * @access  Private (requires security.risk_view)
 */
const getRiskDashboard = async (req, res) => {
    try {
        const Assessment = require('../../models/system/assessment.model');
        
        // Get all active risks
        const risks = await RiskItem.find({ 
            organization: req.organization.id,
            status: { $ne: 'archived' }
        })
        .populate('owner', 'personalInfo.firstName personalInfo.lastName')
        .sort({ createdAt: -1 })
        .lean();

        // Calculate metrics
        const metrics = await calculateMetrics(req.organization.id);

        // Get recent risks
        const recentRisks = risks.slice(0, 5).map(risk => ({
            _id: risk._id,
            title: risk.title,
            riskLevel: risk.riskLevel,
            riskScore: risk.riskScore,
            category: risk.category,
            status: risk.status,
            owner: risk.owner ? {
                name: `${risk.owner.personalInfo.firstName} ${risk.owner.personalInfo.lastName}`
            } : null
        }));

        // Get risks due for review
        const now = new Date();
        const upcomingReviews = risks
            .filter(r => r.nextReviewDate && new Date(r.nextReviewDate) > now)
            .sort((a, b) => new Date(a.nextReviewDate) - new Date(b.nextReviewDate))
            .slice(0, 5)
            .map(risk => ({
                _id: risk._id,
                title: risk.title,
                nextReviewDate: risk.nextReviewDate,
                owner: risk.owner ? {
                    name: `${risk.owner.personalInfo.firstName} ${risk.owner.personalInfo.lastName}`
                } : null
            }));

        // Get recent assessments
        const recentAssessments = await Assessment.find({ 
            organization: req.organization.id 
        })
        .populate('assessor', 'personalInfo.firstName personalInfo.lastName')
        .sort({ assessmentDate: -1 })
        .limit(5)
        .lean();

        res.status(200).json({
            success: true,
            data: {
                metrics,
                recentRisks,
                upcomingReviews,
                recentAssessments,
                heatMap: generateHeatMap(risks)
            }
        });

    } catch (error) {
        console.error('Get risk dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch risk dashboard'
        });
    }
};

/**
 * @desc    Export risk register
 * @route   GET /api/system/risks/export
 * @access  Private (requires security.risk_view)
 */
const exportRisks = async (req, res) => {
    try {
        const Assessment = require('../../models/system/assessment.model');
        
        // Get all risks
        const risks = await RiskItem.find({ 
            organization: req.organization.id,
            status: { $ne: 'archived' }
        })
        .populate('owner', 'personalInfo.firstName personalInfo.lastName')
        .populate('createdBy', 'personalInfo.firstName personalInfo.lastName')
        .lean();

        // Get assessments
        const assessments = await Assessment.find({ 
            organization: req.organization.id 
        })
        .populate('assessor', 'personalInfo.firstName personalInfo.lastName')
        .sort({ assessmentDate: -1 })
        .lean();

        // Calculate metrics
        const metrics = await calculateMetrics(req.organization.id);

        // Prepare export data
        const exportData = {
            organization: req.organization.id,
            exportDate: new Date(),
            metrics,
            risks: risks.map(risk => ({
                riskId: risk.riskId,
                title: risk.title,
                description: risk.description,
                category: risk.category,
                impact: risk.impact,
                probability: risk.probability,
                riskScore: risk.riskScore,
                riskLevel: risk.riskLevel,
                status: risk.status,
                owner: risk.owner ? `${risk.owner.personalInfo.firstName} ${risk.owner.personalInfo.lastName}` : null,
                identifiedDate: risk.identifiedDate,
                targetResolutionDate: risk.targetResolutionDate,
                mitigationStrategy: risk.mitigationStrategy,
                mitigationPlan: risk.mitigationPlan
            })),
            assessments
        };

        res.status(200).json({
            success: true,
            data: exportData
        });

    } catch (error) {
        console.error('Export risks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export risks'
        });
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate risk metrics for an organization
 */
async function calculateMetrics(organizationId) {
    const risks = await RiskItem.find({ 
        organization: organizationId,
        status: { $ne: 'archived' }
    });

    const metrics = {
        totalRisks: risks.length,
        byCategory: {},
        byStatus: {},
        byLevel: {},
        averageScore: 0,
        topRisks: [],
        lastUpdated: new Date()
    };

    if (risks.length === 0) return metrics;

    let totalScore = 0;

    risks.forEach(risk => {
        // Count by category
        metrics.byCategory[risk.category] = (metrics.byCategory[risk.category] || 0) + 1;
        
        // Count by status
        metrics.byStatus[risk.status] = (metrics.byStatus[risk.status] || 0) + 1;
        
        // Count by level
        metrics.byLevel[risk.riskLevel] = (metrics.byLevel[risk.riskLevel] || 0) + 1;
        
        totalScore += risk.riskScore || 0;
    });

    metrics.averageScore = Math.round((totalScore / risks.length) * 100) / 100;
    
    // Get top 5 risks by score
    metrics.topRisks = risks
        .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
        .slice(0, 5)
        .map(r => r._id);

    return metrics;
}

/**
 * Generate heat map data for visualization
 */
function generateHeatMap(risks) {
    const impactMap = { very_low: 1, low: 2, medium: 3, high: 4, critical: 5 };
    const probMap = { very_low: 1, low: 2, medium: 3, high: 4, very_high: 5 };
    
    const heatMap = Array(5).fill().map(() => Array(5).fill().map(() => []));
    
    risks.forEach(risk => {
        const impact = impactMap[risk.impact] || 1;
        const prob = probMap[risk.probability] || 1;
        heatMap[prob-1][impact-1].push({
            id: risk._id,
            title: risk.title,
            score: risk.riskScore
        });
    });
    
    return heatMap;
}

module.exports = {
    // Risk Register
    getRisks,
    getRisk,
    createRisk,
    updateRisk,
    updateRiskStatus,
    deleteRisk,
    
    // Assessments (using separate model)
    createAssessment,
    getAssessments,
    getAssessment,
    updateRecommendationStatus,
    
    // Dashboard & Reports
    getRiskDashboard,
    exportRisks
};