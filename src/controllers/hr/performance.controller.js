// src/controllers/hr/performance.controller.js
const { Performance, Employee } = require('../../models/hr');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all performance reviews
// @route   GET /api/hr/performance
// @access  Private (requires hr.performance_view)
const getPerformanceReviews = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            employeeId,
            status,
            reviewPeriod,
            year,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { organization: organizationId };
        
        if (employeeId) filter.employee = employeeId;
        if (status) filter.status = status;
        if (reviewPeriod) filter.reviewPeriod = reviewPeriod;
        if (year) filter.year = parseInt(year);

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reviews = await Performance.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('employee', 'firstName lastName employeeId department')
            .populate('reviewer', 'firstName lastName')
            .populate('approvedBy', 'firstName lastName');

        const total = await Performance.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: reviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get performance reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch performance reviews'
        });
    }
};

// @desc    Get single performance review
// @route   GET /api/hr/performance/:id
// @access  Private (requires hr.performance_view)
const getPerformanceReview = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const review = await Performance.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('employee', 'firstName lastName employeeId department')
        .populate('reviewer', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName');

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found'
            });
        }

        res.status(200).json({
            success: true,
            data: review
        });
    } catch (error) {
        console.error('Get performance review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch performance review'
        });
    }
};

// @desc    Create performance review
// @route   POST /api/hr/performance
// @access  Private (requires hr.performance_create)
const createPerformanceReview = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            employeeId,
            reviewPeriod,
            year,
            reviewerId,
            dueDate,
            template
        } = req.body;

        // Check if review already exists for this period
        const existingReview = await Performance.findOne({
            organization: organizationId,
            employee: employeeId,
            reviewPeriod,
            year
        });

        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'Performance review already exists for this period'
            });
        }

        const review = await Performance.create({
            organization: organizationId,
            employee: employeeId,
            reviewPeriod,
            year,
            reviewer: reviewerId || req.user.userId,
            dueDate: new Date(dueDate),
            template,
            status: 'draft',
            createdBy: req.user.userId
        });

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'performance_review_created',
            target: review._id,
            details: {
                employeeId,
                reviewPeriod,
                year
            }
        });

        res.status(201).json({
            success: true,
            message: 'Performance review created successfully',
            data: review
        });
    } catch (error) {
        console.error('Create performance review error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create performance review'
        });
    }
};

// @desc    Update performance review
// @route   PUT /api/hr/performance/:id
// @access  Private (requires hr.performance_update)
const updatePerformanceReview = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const review = await Performance.findOne({ 
            _id: req.params.id,
            organization: organizationId,
            status: 'draft'
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found or cannot be updated'
            });
        }

        Object.assign(review, req.body);
        await review.save();

        res.status(200).json({
            success: true,
            message: 'Performance review updated successfully',
            data: review
        });
    } catch (error) {
        console.error('Update performance review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update performance review'
        });
    }
};

// @desc    Submit performance review
// @route   POST /api/hr/performance/:id/submit
// @access  Private (requires hr.performance_update)
const submitPerformanceReview = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const review = await Performance.findOne({ 
            _id: req.params.id,
            organization: organizationId,
            status: 'draft'
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found or already submitted'
            });
        }

        review.status = 'submitted';
        review.submittedAt = new Date();
        await review.save();

        res.status(200).json({
            success: true,
            message: 'Performance review submitted successfully',
            data: review
        });
    } catch (error) {
        console.error('Submit performance review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit performance review'
        });
    }
};

// @desc    Approve performance review
// @route   POST /api/hr/performance/:id/approve
// @access  Private (requires hr.performance_approve)
const approvePerformanceReview = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { comments, score, rating } = req.body;

        const review = await Performance.findOne({ 
            _id: req.params.id,
            organization: organizationId,
            status: 'submitted'
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found or cannot be approved'
            });
        }

        review.status = 'approved';
        review.approvedBy = req.user.userId;
        review.approvedAt = new Date();
        review.approvalComments = comments;
        if (score) review.score = score;
        if (rating) review.rating = rating;
        await review.save();

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'performance_review_approved',
            target: review._id,
            details: {
                employeeId: review.employee,
                score,
                rating
            }
        });

        res.status(200).json({
            success: true,
            message: 'Performance review approved',
            data: review
        });
    } catch (error) {
        console.error('Approve performance review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve performance review'
        });
    }
};

module.exports = {
    getPerformanceReviews,
    getPerformanceReview,
    createPerformanceReview,
    updatePerformanceReview,
    submitPerformanceReview,
    approvePerformanceReview
};