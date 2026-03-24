// src/controllers/hr/training.controller.js
const { Training, Employee } = require('../../models/hr');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all trainings
// @route   GET /api/hr/trainings
// @access  Private (requires hr.training_view)
const getTrainings = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            status,
            type,
            startDate,
            endDate,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { organization: organizationId };
        
        if (status) filter.status = status;
        if (type) filter.type = type;
        
        if (startDate || endDate) {
            filter.startDate = {};
            if (startDate) filter.startDate.$gte = new Date(startDate);
            if (endDate) filter.endDate.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const trainings = await Training.find(filter)
            .sort({ startDate: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('trainer', 'firstName lastName')
            .populate('participants.employee', 'firstName lastName employeeId department');

        const total = await Training.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: trainings,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get trainings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch trainings'
        });
    }
};

// @desc    Get single training
// @route   GET /api/hr/trainings/:id
// @access  Private (requires hr.training_view)
const getTraining = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const training = await Training.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('trainer', 'firstName lastName')
        .populate('participants.employee', 'firstName lastName employeeId department');

        if (!training) {
            return res.status(404).json({
                success: false,
                message: 'Training not found'
            });
        }

        res.status(200).json({
            success: true,
            data: training
        });
    } catch (error) {
        console.error('Get training error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch training'
        });
    }
};

// @desc    Create training
// @route   POST /api/hr/trainings
// @access  Private (requires hr.training_create)
const createTraining = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            title,
            description,
            type,
            startDate,
            endDate,
            duration,
            location,
            trainerId,
            maxParticipants,
            cost,
            syllabus
        } = req.body;

        const training = await Training.create({
            organization: organizationId,
            title,
            description,
            type,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            duration,
            location,
            trainer: trainerId,
            maxParticipants,
            cost,
            syllabus,
            status: 'planned',
            createdBy: req.user.userId
        });

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'training_created',
            target: training._id,
            details: {
                title,
                type,
                startDate
            }
        });

        res.status(201).json({
            success: true,
            message: 'Training created successfully',
            data: training
        });
    } catch (error) {
        console.error('Create training error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create training'
        });
    }
};

// @desc    Update training
// @route   PUT /api/hr/trainings/:id
// @access  Private (requires hr.training_update)
const updateTraining = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const training = await Training.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!training) {
            return res.status(404).json({
                success: false,
                message: 'Training not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Training updated successfully',
            data: training
        });
    } catch (error) {
        console.error('Update training error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update training'
        });
    }
};

// @desc    Delete training
// @route   DELETE /api/hr/trainings/:id
// @access  Private (requires hr.training_manage)
const deleteTraining = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const training = await Training.findOneAndDelete({
            _id: req.params.id,
            organization: organizationId
        });

        if (!training) {
            return res.status(404).json({
                success: false,
                message: 'Training not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Training deleted successfully'
        });
    } catch (error) {
        console.error('Delete training error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete training'
        });
    }
};

// @desc    Enroll employee in training
// @route   POST /api/hr/trainings/:id/enroll
// @access  Private (requires hr.training_enroll)
const enrollEmployee = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { employeeId } = req.body;

        const training = await Training.findOne({ 
            _id: req.params.id,
            organization: organizationId
        });

        if (!training) {
            return res.status(404).json({
                success: false,
                message: 'Training not found'
            });
        }

        // Check if already enrolled
        if (training.participants.some(p => p.employee.toString() === employeeId)) {
            return res.status(400).json({
                success: false,
                message: 'Employee already enrolled'
            });
        }

        // Check capacity
        if (training.participants.length >= training.maxParticipants) {
            return res.status(400).json({
                success: false,
                message: 'Training is full'
            });
        }

        training.participants.push({
            employee: employeeId,
            enrolledAt: new Date(),
            status: 'enrolled'
        });

        await training.save();

        res.status(200).json({
            success: true,
            message: 'Employee enrolled successfully',
            data: training
        });
    } catch (error) {
        console.error('Enroll employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to enroll employee'
        });
    }
};

// @desc    Track training progress
// @route   PUT /api/hr/trainings/:trainingId/participants/:employeeId
// @access  Private (requires hr.training_track)
const trackProgress = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { trainingId, employeeId } = req.params;
        const { status, score, feedback, completedAt } = req.body;

        const training = await Training.findOne({ 
            _id: trainingId,
            organization: organizationId
        });

        if (!training) {
            return res.status(404).json({
                success: false,
                message: 'Training not found'
            });
        }

        const participant = training.participants.find(
            p => p.employee.toString() === employeeId
        );

        if (!participant) {
            return res.status(404).json({
                success: false,
                message: 'Employee not enrolled in this training'
            });
        }

        participant.status = status || participant.status;
        if (score) participant.score = score;
        if (feedback) participant.feedback = feedback;
        if (completedAt) participant.completedAt = new Date(completedAt);

        await training.save();

        res.status(200).json({
            success: true,
            message: 'Progress updated successfully',
            data: training
        });
    } catch (error) {
        console.error('Track progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track progress'
        });
    }
};

module.exports = {
    getTrainings,
    getTraining,
    createTraining,
    updateTraining,
    deleteTraining,
    enrollEmployee,
    trackProgress
};