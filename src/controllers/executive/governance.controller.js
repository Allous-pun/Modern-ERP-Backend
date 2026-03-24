// src/controllers/executive/governance.controller.js
const BoardMeeting = require('../../models/executive/boardMeeting.model');
const BoardResolution = require('../../models/executive/boardResolution.model');
const GovernanceReport = require('../../models/executive/governanceReport.model');
const { logExecutiveAction } = require('../../services/executive/auditHelper.service');
const mongoose = require('mongoose');

// Helper function to get user ID from req.user
const getUserId = (req) => {
    return req.user?.memberId || req.user?.id || req.user?._id;
};

// ==================== BOARD MEETING MANAGEMENT ====================

/**
 * @desc    Get all board meetings
 * @route   GET /api/executive/governance/meetings
 * @access  Private (Chairman, Board Members)
 */
const getBoardMeetings = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { status, type, startDate, endDate, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        
        const query = { organization: req.organization.id };
        
        if (status) query.status = status;
        if (type) query.meetingType = type;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }
        
        const meetings = await BoardMeeting.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('createdBy', 'personalInfo firstName personalInfo lastName email')
            .populate('attendees.member', 'personalInfo firstName personalInfo lastName email');
        
        const total = await BoardMeeting.countDocuments(query);
        
        // Apply settings to meetings (date formatting, etc.)
        const enhancedMeetings = meetings.map(meeting => 
            applySettingsToMeeting(meeting, req.settings)
        );
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'board_meetings',
            description: 'Viewed board meetings list',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            count: enhancedMeetings.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: enhancedMeetings
        });
        
    } catch (error) {
        console.error('Get board meetings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch board meetings'
        });
    }
};

/**
 * @desc    Get single board meeting
 * @route   GET /api/executive/governance/meetings/:id
 * @access  Private (Chairman, Board Members)
 */
const getBoardMeetingById = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        const meeting = await BoardMeeting.findOne({
            _id: id,
            organization: req.organization.id
        })
        .populate('createdBy', 'personalInfo firstName personalInfo lastName email')
        .populate('attendees.member', 'personalInfo firstName personalInfo lastName email')
        .populate('agenda.presenter', 'personalInfo firstName personalInfo lastName email')
        .populate('resolutions');
        
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Board meeting not found'
            });
        }
        
        // Apply settings to meeting
        const enhancedMeeting = applySettingsToMeeting(meeting, req.settings);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'board_meeting',
            targetId: meeting._id,
            targetName: meeting.title,
            description: `Viewed board meeting: ${meeting.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: enhancedMeeting
        });
        
    } catch (error) {
        console.error('Get board meeting error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch board meeting'
        });
    }
};

/**
 * @desc    Create board meeting
 * @route   POST /api/executive/governance/meetings
 * @access  Private (Chairman, Company Secretary)
 */
const createBoardMeeting = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const {
            title,
            description,
            meetingType,
            date,
            startTime,
            endTime,
            location,
            venue,
            meetingLink,
            agenda,
            attendees,
            quorum
        } = req.body;
        
        // Get user ID safely from req.user
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Validate required fields
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Title is required'
            });
        }
        
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date is required'
            });
        }
        
        if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one attendee is required'
            });
        }
        
        // Validate each attendee has required fields
        attendees.forEach((attendee, index) => {
            if (!attendee.memberId) {
                throw new Error(`Attendee at index ${index} missing memberId`);
            }
            if (!attendee.role) {
                throw new Error(`Attendee at index ${index} missing role`);
            }
        });
        
        // Use settings for default values if needed
        const settings = req.settings;
        
        // Calculate quorum required (usually 50% + 1 of board members)
        const quorumRequired = quorum || Math.ceil(attendees.length / 2) + 1;
        
        const meeting = new BoardMeeting({
            organization: req.organization.id,
            title,
            description,
            meetingType,
            date,
            startTime,
            endTime,
            location,
            venue,
            meetingLink,
            agenda: agenda ? agenda.map((item, index) => ({
                ...item,
                order: index + 1
            })) : [],
            attendees: attendees.map(attendee => ({
                member: attendee.memberId,
                role: attendee.role,
                status: 'pending'
            })),
            quorum: {
                required: quorumRequired,
                achieved: false
            },
            createdBy: userId
        });
        
        await meeting.save();
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'board_meeting',
            targetId: meeting._id,
            targetName: meeting.title,
            changes: req.body,
            description: `Created board meeting: ${meeting.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(201).json({
            success: true,
            data: meeting,
            message: 'Board meeting created successfully'
        });
        
    } catch (error) {
        console.error('Create board meeting error:', error);
        
        // Check for MongoDB validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: Object.keys(error.errors).map(key => ({
                    field: key,
                    message: error.errors[key].message
                }))
            });
        }
        
        // Check for MongoDB duplicate key errors
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'A meeting with these details already exists'
            });
        }
        
        // Check for CastError (invalid ObjectId)
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: `Invalid ${error.path}: ${error.value}`
            });
        }
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'board_meeting',
            description: 'Failed to create board meeting',
            success: false,
            error: {
                message: error.message,
                name: error.name,
                code: error.code
            }
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create board meeting',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Update board meeting
 * @route   PUT /api/executive/governance/meetings/:id
 * @access  Private (Chairman, Company Secretary)
 */
const updateBoardMeeting = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        const meeting = await BoardMeeting.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Board meeting not found'
            });
        }
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Store old values for audit
        const oldValues = {
            title: meeting.title,
            date: meeting.date,
            status: meeting.status
        };
        
        // Update fields
        Object.assign(meeting, req.body);
        meeting.updatedBy = userId;  // ← FIXED
        
        await meeting.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'board_meeting',
            targetId: meeting._id,
            targetName: meeting.title,
            changes: {
                before: oldValues,
                after: {
                    title: meeting.title,
                    date: meeting.date,
                    status: meeting.status
                }
            },
            description: `Updated board meeting: ${meeting.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: meeting,
            message: 'Board meeting updated successfully'
        });
        
    } catch (error) {
        console.error('Update board meeting error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update board meeting'
        });
    }
};

/**
 * @desc    Update meeting minutes
 * @route   PUT /api/executive/governance/meetings/:id/minutes
 * @access  Private (Chairman, Company Secretary)
 */
const updateMeetingMinutes = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        const { content } = req.body;
        
        const meeting = await BoardMeeting.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Board meeting not found'
            });
        }
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        await meeting.updateMinutes(content, userId);  // ← FIXED
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'board_meeting_minutes',
            targetId: meeting._id,
            targetName: meeting.title,
            description: `Updated minutes for: ${meeting.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: meeting,
            message: 'Meeting minutes updated successfully'
        });
        
    } catch (error) {
        console.error('Update minutes error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update meeting minutes'
        });
    }
};

/**
 * @desc    Approve meeting minutes
 * @route   POST /api/executive/governance/meetings/:id/minutes/approve
 * @access  Private (Chairman only)
 */
const approveMeetingMinutes = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        const meeting = await BoardMeeting.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Board meeting not found'
            });
        }
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        await meeting.approveMinutes(userId);  // ← FIXED
        
        await logExecutiveAction({
            req,
            action: 'approve',
            targetType: 'board_meeting_minutes',
            targetId: meeting._id,
            targetName: meeting.title,
            description: `Approved minutes for: ${meeting.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: meeting,
            message: 'Meeting minutes approved successfully'
        });
        
    } catch (error) {
        console.error('Approve minutes error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve meeting minutes'
        });
    }
};

/**
 * @desc    Record attendance
 * @route   POST /api/executive/governance/meetings/:id/attendance
 * @access  Private (Chairman, Company Secretary)
 */
const recordAttendance = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        const { attendance } = req.body; // Array of { memberId, status, checkInTime }
        
        const meeting = await BoardMeeting.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Board meeting not found'
            });
        }
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Update attendance for each member
        attendance.forEach(record => {
            const attendee = meeting.attendees.find(
                a => a.member.toString() === record.memberId
            );
            if (attendee) {
                attendee.attendanceStatus = record.status;
                attendee.checkInTime = record.checkInTime || new Date();
            }
        });
        
        // Check quorum
        meeting.checkQuorum();
        meeting.updatedBy = userId;  // ← FIXED
        
        await meeting.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'board_meeting_attendance',
            targetId: meeting._id,
            targetName: meeting.title,
            description: `Recorded attendance for: ${meeting.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: meeting,
            message: 'Attendance recorded successfully'
        });
        
    } catch (error) {
        console.error('Record attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record attendance'
        });
    }
};

// ==================== RESOLUTIONS & VOTING ====================

/**
 * @desc    Get all resolutions
 * @route   GET /api/executive/governance/resolutions
 * @access  Private (Chairman, Board Members)
 */
const getResolutions = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { status, category, meetingId, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        
        const query = { organization: req.organization.id };
        
        if (status) query.status = status;
        if (category) query.category = category;
        if (meetingId) query.meeting = meetingId;
        
        const resolutions = await BoardResolution.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('meeting', 'title date')
            .populate('proposedBy.member', 'personalInfo firstName personalInfo lastName email')
            .populate('voting.votes.member', 'personalInfo firstName personalInfo lastName email');
        
        const total = await BoardResolution.countDocuments(query);
        
        // Apply settings to resolutions (date formatting, etc.)
        const enhancedResolutions = resolutions.map(resolution =>
            applySettingsToResolution(resolution, req.settings)
        );
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'board_resolutions',
            description: 'Viewed resolutions list',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            count: enhancedResolutions.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: enhancedResolutions
        });
        
    } catch (error) {
        console.error('Get resolutions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch resolutions'
        });
    }
};

/**
 * @desc    Create resolution
 * @route   POST /api/executive/governance/resolutions
 * @access  Private (Chairman, Board Members)
 */
const createResolution = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const {
            title,
            description,
            type,
            category,
            meetingId,
            proposedBy,
            secondedBy,
            voting,
            effectiveDate
        } = req.body;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        console.log('=== CREATE RESOLUTION REQUEST ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Organization ID:', req.organization?.id);
        console.log('User ID:', userId);
        
        // Validate meeting exists
        const meeting = await BoardMeeting.findOne({
            _id: meetingId,
            organization: req.organization.id
        });
        
        if (!meeting) {
            return res.status(400).json({
                success: false,
                message: 'Meeting not found'
            });
        }
        
        const resolution = new BoardResolution({
            organization: req.organization.id,
            title,
            description,
            type: type || 'ordinary',
            category,
            meeting: meetingId,
            proposedBy: {
                member: proposedBy || userId,
                date: new Date()
            },
            secondedBy: secondedBy ? {
                member: secondedBy,
                date: new Date()
            } : undefined,
            voting: {
                method: voting?.method || 'show_of_hands',
                requiredMajority: voting?.requiredMajority || 'simple',
                votes: []
            },
            effectiveDate,
            createdBy: userId
        });
        
        console.log('Resolution object before save:', JSON.stringify(resolution, null, 2));
        
        await resolution.save();
        
        console.log('Resolution saved successfully with ID:', resolution._id);
        console.log('Resolution number generated:', resolution.resolutionNumber);
        
        // Add to meeting's resolutions array
        if (meetingId) {
            await BoardMeeting.findByIdAndUpdate(meetingId, {
                $push: { resolutions: resolution._id }
            });
        }
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'board_resolution',
            targetId: resolution._id,
            targetName: resolution.title,
            changes: req.body,
            description: `Created resolution: ${resolution.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(201).json({
            success: true,
            data: resolution,
            message: 'Resolution created successfully'
        });
        
    } catch (error) {
        console.error('=== CREATE RESOLUTION ERROR DETAILS ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error code:', error.code);
        
        // Check for MongoDB validation errors
        if (error.name === 'ValidationError') {
            console.error('Validation errors:', error.errors);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: Object.keys(error.errors).map(key => ({
                    field: key,
                    message: error.errors[key].message
                }))
            });
        }
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'board_resolution',
            description: 'Failed to create resolution',
            success: false,
            error: {
                message: error.message,
                name: error.name,
                code: error.code
            }
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create resolution'
        });
    }
};

/**
 * @desc    Update resolution status
 * @route   PUT /api/executive/governance/resolutions/:id/status
 * @access  Private (Chairman, Company Secretary, Creator)
 */
const updateResolutionStatus = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validate status
        const validStatuses = ['draft', 'proposed', 'voting', 'passed', 'defeated', 'implemented', 'archived'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }
        
        const resolution = await BoardResolution.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!resolution) {
            return res.status(404).json({
                success: false,
                message: 'Resolution not found'
            });
        }
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Check permissions based on status transition
        const oldStatus = resolution.status;
        
        // Only creator or chairman can edit draft
        if (oldStatus === 'draft' && status !== 'draft') {
            const isCreator = resolution.createdBy.toString() === userId.toString();
            const isChairman = req.user.roles?.some(r => r.name === 'Chairman');
            
            if (!isCreator && !isChairman) {
                return res.status(403).json({
                    success: false,
                    message: 'Only the creator or Chairman can submit a draft for voting'
                });
            }
        }
        
        // Only Chairman can mark as passed/defeated
        if ((status === 'passed' || status === 'defeated') && oldStatus === 'voting') {
            const isChairman = req.user.roles?.some(r => r.name === 'Chairman');
            
            if (!isChairman) {
                return res.status(403).json({
                    success: false,
                    message: 'Only the Chairman can finalize voting results'
                });
            }
        }
        
        // Update status
        resolution.status = status;
        resolution.updatedBy = userId;
        
        // If moving to voting, update voting start time
        if (status === 'voting' && oldStatus !== 'voting') {
            resolution.voting.startedAt = new Date();
        }
        
        // If moving to passed/defeated, update passedAt
        if (status === 'passed' || status === 'defeated') {
            resolution.voting.passedAt = new Date();
            if (status === 'passed') {
                resolution.voting.passed = true;
            }
        }
        
        await resolution.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'board_resolution',
            targetId: resolution._id,
            targetName: resolution.title,
            changes: { 
                before: { status: oldStatus },
                after: { status }
            },
            description: `Updated resolution status from ${oldStatus} to ${status}: ${resolution.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: resolution,
            message: `Resolution status updated to ${status} successfully`
        });
        
    } catch (error) {
        console.error('Update resolution status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update resolution status'
        });
    }
};

/**
 * @desc    Cast vote on resolution
 * @route   POST /api/executive/governance/resolutions/:id/vote
 * @access  Private (Board Members only)
 */
const castVote = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        const { vote } = req.body; // 'for', 'against', 'abstain'
        
        const resolution = await BoardResolution.findOne({
            _id: id,
            organization: req.organization.id,
            status: { $in: ['proposed', 'voting'] }
        });
        
        if (!resolution) {
            return res.status(404).json({
                success: false,
                message: 'Resolution not found or voting is closed'
            });
        }
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        await resolution.castVote(userId, vote);  // ← FIXED
        
        await logExecutiveAction({
            req,
            action: 'vote',
            targetType: 'board_resolution',
            targetId: resolution._id,
            targetName: resolution.title,
            changes: { vote },
            description: `Voted ${vote} on resolution: ${resolution.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: resolution,
            message: 'Vote recorded successfully'
        });
        
    } catch (error) {
        console.error('Cast vote error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cast vote'
        });
    }
};

// ==================== GOVERNANCE REPORTS ====================
/**
 * @desc    Generate governance report
 * @route   POST /api/executive/governance/reports
 * @access  Private (Chairman, Company Secretary)
 */
const generateGovernanceReport = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { type, period } = req.body;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Use settings for report generation
        const settings = req.settings;
        
        // Gather data for report
        const meetings = await BoardMeeting.find({
            organization: req.organization.id,
            date: {
                $gte: period.start,
                $lte: period.end
            }
        });
        
        const resolutions = await BoardResolution.find({
            organization: req.organization.id,
            createdAt: {
                $gte: period.start,
                $lte: period.end
            }
        });
        
        // Calculate average attendance percentage (for display)
        let averageAttendance = 0;
        if (meetings.length > 0) {
            let totalPresent = 0;
            let totalAttendees = 0;
            
            meetings.forEach(meeting => {
                const presentCount = meeting.attendees?.filter(a => a.attendanceStatus === 'present').length || 0;
                const totalCount = meeting.attendees?.length || 0;
                
                totalPresent += presentCount;
                totalAttendees += totalCount;
            });
            
            averageAttendance = totalAttendees > 0 ? Math.round((totalPresent / totalAttendees) * 100) : 0;
        }
        
        // Get detailed attendance stats (array of member attendance records)
        const attendanceStats = calculateAttendanceStats(meetings);
        
        // Calculate statistics - CORRECT STRUCTURE
        const statistics = {
            meetings: {
                total: meetings.length,
                held: meetings.filter(m => m.status === 'completed').length,
                attendance: averageAttendance  // ← This should be the NUMBER
            },
            resolutions: {
                total: resolutions.length,
                passed: resolutions.filter(r => r.status === 'passed').length,
                defeated: resolutions.filter(r => r.status === 'defeated').length,
                implemented: resolutions.filter(r => r.implementation?.status === 'completed').length
            }
            // Note: attendance array is separate, not inside statistics
        };
        
        const report = new GovernanceReport({
            organization: req.organization.id,
            title: `Governance Report - ${period.quarter ? `Q${period.quarter}` : ''} ${period.year}`,
            type,
            period,
            statistics,
            attendance: attendanceStats,  // ← Add this line - detailed attendance array
            createdBy: userId,
            status: 'draft'
        });
        
        await report.save();
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'governance_report',
            targetId: report._id,
            targetName: report.title,
            description: `Generated governance report: ${report.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(201).json({
            success: true,
            data: report,
            message: 'Governance report generated successfully'
        });
        
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate governance report'
        });
    }
};

/**
 * @desc    Get governance reports
 * @route   GET /api/executive/governance/reports
 * @access  Private (Chairman, Board Members)
 */
const getGovernanceReports = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { type, year, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        
        const query = { organization: req.organization.id };
        if (type) query.type = type;
        if (year) query['period.year'] = parseInt(year);
        
        const reports = await GovernanceReport.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('createdBy', 'personalInfo firstName personalInfo lastName email');
        
        const total = await GovernanceReport.countDocuments(query);
        
        // Apply settings to reports
        const enhancedReports = reports.map(report =>
            applySettingsToReport(report, req.settings)
        );
        
        res.status(200).json({
            success: true,
            count: enhancedReports.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: enhancedReports
        });
        
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch governance reports'
        });
    }
};

// ==================== CRUD REPORT CONTROLLERS ====================

/**
 * @desc    Get single governance report by ID
 * @route   GET /api/executive/governance/reports/:id
 * @access  Private (Chairman, Board Members)
 */
const getGovernanceReportById = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        const report = await GovernanceReport.findOne({
            _id: id,
            organization: req.organization.id
        }).populate('createdBy', 'personalInfo firstName personalInfo lastName email');
        
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Governance report not found'
            });
        }
        
        // Apply settings to report
        const enhancedReport = applySettingsToReport(report, req.settings);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'governance_report',
            targetId: report._id,
            targetName: report.title,
            description: `Viewed governance report: ${report.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: enhancedReport
        });
        
    } catch (error) {
        console.error('Get report by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch governance report'
        });
    }
};

/**
 * @desc    Update governance report
 * @route   PUT /api/executive/governance/reports/:id
 * @access  Private (Chairman, Company Secretary, Creator)
 */
const updateGovernanceReport = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const report = await GovernanceReport.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Governance report not found'
            });
        }
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Check permissions (only creator or chairman can update)
        const isCreator = report.createdBy.toString() === userId.toString();
        const isChairman = req.user.roles?.some(r => r.name === 'Chairman');
        const isCompanySecretary = req.user.roles?.some(r => r.name === 'Company Secretary');
        
        if (!isCreator && !isChairman && !isCompanySecretary) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this report'
            });
        }
        
        // Store old values for audit
        const oldValues = {
            title: report.title,
            status: report.approval?.status
        };
        
        // Update fields
        if (updates.title) report.title = updates.title;
        if (updates.executive) report.executive = updates.executive;
        if (updates.introduction) report.introduction = updates.introduction;
        if (updates.sections) report.sections = updates.sections;
        if (updates.findings) report.findings = updates.findings;
        if (updates.compliance) report.compliance = updates.compliance;
        
        report.version = (report.version || 1) + 1;
        
        await report.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'governance_report',
            targetId: report._id,
            targetName: report.title,
            changes: {
                before: oldValues,
                after: {
                    title: report.title,
                    status: report.approval?.status
                }
            },
            description: `Updated governance report: ${report.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: report,
            message: 'Governance report updated successfully'
        });
        
    } catch (error) {
        console.error('Update report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update governance report'
        });
    }
};

/**
 * @desc    Update report status (approval workflow)
 * @route   PUT /api/executive/governance/reports/:id/status
 * @access  Private (Chairman, Company Secretary)
 */
const updateReportStatus = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        const { status, comments } = req.body;
        
        // Validate status
        const validStatuses = ['draft', 'under_review', 'approved', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }
        
        const report = await GovernanceReport.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Governance report not found'
            });
        }
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Check permissions based on status transition
        const oldStatus = report.approval?.status || 'draft';
        
        // Initialize approval if it doesn't exist
        if (!report.approval) {
            report.approval = {};
        }
        
        // Update status and add approval info
        report.approval.status = status;
        
        if (status === 'under_review') {
            report.review = {
                reviewedBy: userId,
                reviewedAt: new Date(),
                comments: comments || 'Sent for review'
            };
        } else if (status === 'approved' || status === 'rejected') {
            report.approval.approvedBy = userId;
            report.approval.approvedAt = new Date();
            if (comments) {
                if (!report.review) report.review = {};
                report.review.comments = comments;
            }
        }
        
        report.version = (report.version || 1) + 1;
        
        await report.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'governance_report',
            targetId: report._id,
            targetName: report.title,
            changes: { 
                before: { status: oldStatus },
                after: { status }
            },
            description: `Updated report status from ${oldStatus} to ${status}: ${report.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: report,
            message: `Report status updated to ${status} successfully`
        });
        
    } catch (error) {
        console.error('Update report status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update report status'
        });
    }
};

/**
 * @desc    Delete governance report
 * @route   DELETE /api/executive/governance/reports/:id
 * @access  Private (Chairman, Company Secretary, Creator)
 */
const deleteGovernanceReport = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        const report = await GovernanceReport.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!report) {
            return res.status(404).json({
                success: false,
                message: 'Governance report not found'
            });
        }
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Check permissions (only creator or chairman can delete)
        const isCreator = report.createdBy.toString() === userId.toString();
        const isChairman = req.user.roles?.some(r => r.name === 'Chairman');
        const isCompanySecretary = req.user.roles?.some(r => r.name === 'Company Secretary');
        
        if (!isCreator && !isChairman && !isCompanySecretary) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this report'
            });
        }
        
        await report.deleteOne();
        
        await logExecutiveAction({
            req,
            action: 'delete',
            targetType: 'governance_report',
            targetId: report._id,
            targetName: report.title,
            description: `Deleted governance report: ${report.title}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            message: 'Governance report deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete governance report'
        });
    }
};

// ==================== HELPER FUNCTIONS ====================

function applySettingsToMeeting(meeting, settings) {
    if (!meeting || !settings) return meeting;
    
    const meetingObj = meeting.toObject ? meeting.toObject() : meeting;
    
    // Add date format info based on settings
    meetingObj.dateFormat = settings.dateFormat || 'DD/MM/YYYY';
    meetingObj.timeFormat = settings.timeFormat || '24h';
    
    // Format dates if needed (client can also format)
    if (meetingObj.date) {
        meetingObj.formattedDate = new Date(meetingObj.date).toLocaleDateString(
            settings.defaultLanguage || 'en-US',
            { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                timeZone: settings.timezone || 'UTC'
            }
        );
    }
    
    return meetingObj;
}

function applySettingsToResolution(resolution, settings) {
    if (!resolution || !settings) return resolution;
    
    const resolutionObj = resolution.toObject ? resolution.toObject() : resolution;
    
    // Add date format info
    resolutionObj.dateFormat = settings.dateFormat || 'DD/MM/YYYY';
    
    // Format dates if needed
    if (resolutionObj.effectiveDate) {
        resolutionObj.formattedEffectiveDate = new Date(resolutionObj.effectiveDate).toLocaleDateString(
            settings.defaultLanguage || 'en-US'
        );
    }
    
    return resolutionObj;
}

function applySettingsToReport(report, settings) {
    if (!report || !settings) return report;
    
    const reportObj = report.toObject ? report.toObject() : report;
    
    // Add formatting info
    reportObj.dateFormat = settings.dateFormat || 'DD/MM/YYYY';
    reportObj.currency = settings.baseCurrency || 'USD';
    
    return reportObj;
}

function calculateAttendanceStats(meetings) {
    const attendanceMap = new Map();
    
    meetings.forEach(meeting => {
        meeting.attendees.forEach(attendee => {
            if (attendee.attendanceStatus === 'present') {
                const memberId = attendee.member.toString();
                attendanceMap.set(memberId, (attendanceMap.get(memberId) || 0) + 1);
            }
        });
    });
    
    return Array.from(attendanceMap.entries()).map(([memberId, count]) => ({
        member: memberId,
        meetingsAttended: count,
        meetingsTotal: meetings.length,
        percentage: (count / meetings.length) * 100
    }));
}

module.exports = {
    // Board Meetings
    getBoardMeetings,
    getBoardMeetingById,
    createBoardMeeting,
    updateBoardMeeting,
    updateMeetingMinutes,
    approveMeetingMinutes,
    recordAttendance,
    
    // Resolutions
    getResolutions,
    createResolution,
    castVote,
    updateResolutionStatus,
    
    // Reports
    generateGovernanceReport,
    getGovernanceReports,
    getGovernanceReportById,
    updateGovernanceReport,
    updateReportStatus,
    deleteGovernanceReport
};