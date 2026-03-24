// src/models/executive/boardMeeting.model.js
const mongoose = require('mongoose');

const boardMeetingSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Meeting details
    title: {
        type: String,
        required: true
    },
    description: String,
    meetingType: {
        type: String,
        enum: ['regular', 'special', 'emergency', 'annual'],
        default: 'regular'
    },
    
    // Schedule
    date: {
        type: Date,
        required: true
    },
    startTime: String,
    endTime: String,
    duration: Number, // in minutes
    
    // Location
    location: {
        type: String,
        enum: ['physical', 'virtual', 'hybrid'],
        default: 'physical'
    },
    venue: String,
    meetingLink: String,
    
    // Agenda
    agenda: [{
        item: {
            type: String,
            required: true
        },
        description: String,
        presenter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        duration: Number, // minutes allocated
        attachments: [{
            name: String,
            url: String,
            type: String
        }],
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'deferred'],
            default: 'pending'
        },
        notes: String,
        order: Number
    }],
    
    // Attendees
    attendees: [{
        member: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember',
            required: true
        },
        role: {
            type: String,
            enum: ['chairman', 'board_member', 'secretary', 'observer', 'guest'],
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined', 'tentative'],
            default: 'pending'
        },
        responseDate: Date,
        attendanceStatus: {
            type: String,
            enum: ['present', 'absent', 'late', 'excused'],
            default: null
        },
        checkInTime: Date,
        checkOutTime: Date
    }],
    
    // Quorum
    quorum: {
        required: Number,
        achieved: {
            type: Boolean,
            default: false
        },
        achievedAt: Date,
        totalPresent: {
            type: Number,
            default: 0
        }
    },
    
    // Minutes
    minutes: {
        content: String,
        approved: {
            type: Boolean,
            default: false
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        approvedAt: Date,
        version: {
            type: Number,
            default: 1
        },
        history: [{
            content: String,
            updatedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            updatedAt: Date,
            version: Number
        }]
    },
    
    // Resolutions passed in this meeting
    resolutions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BoardResolution'
    }],
    
    // Attachments
    attachments: [{
        name: String,
        url: String,
        type: String,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Status
    status: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'],
        default: 'scheduled'
    },
    cancellationReason: String,
    
    // Notifications
    notifications: {
        reminders: [{
            type: {
                type: String,
                enum: ['email', 'sms', 'push'],
                default: 'email'
            },
            sentAt: Date,
            status: String
        }],
        lastReminderSent: Date
    },
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    }
}, {
    timestamps: true
});

// Indexes
boardMeetingSchema.index({ organization: 1, date: -1 });
boardMeetingSchema.index({ organization: 1, status: 1 });
boardMeetingSchema.index({ 'attendees.member': 1 });

// Methods
boardMeetingSchema.methods.checkQuorum = function() {
    const present = this.attendees.filter(a => a.attendanceStatus === 'present').length;
    this.quorum.totalPresent = present;
    this.quorum.achieved = present >= this.quorum.required;
    if (this.quorum.achieved) {
        this.quorum.achievedAt = new Date();
    }
    return this.quorum.achieved;
};

boardMeetingSchema.methods.addAttendee = function(memberId, role) {
    this.attendees.push({
        member: memberId,
        role,
        status: 'pending'
    });
    return this.save();
};

boardMeetingSchema.methods.updateMinutes = function(content, updatedBy) {
    // Save current to history
    this.minutes.history.push({
        content: this.minutes.content,
        updatedBy: this.minutes.approvedBy,
        updatedAt: new Date(),
        version: this.minutes.version
    });
    
    // Update with new content
    this.minutes.content = content;
    this.minutes.version += 1;
    this.minutes.approved = false;
    this.updatedBy = updatedBy;
    
    return this.save();
};

boardMeetingSchema.methods.approveMinutes = function(approvedBy) {
    this.minutes.approved = true;
    this.minutes.approvedBy = approvedBy;
    this.minutes.approvedAt = new Date();
    this.updatedBy = approvedBy;
    return this.save();
};

// Statics
boardMeetingSchema.statics.getUpcomingMeetings = function(organizationId, limit = 10) {
    return this.find({
        organization: organizationId,
        date: { $gte: new Date() },
        status: { $in: ['scheduled', 'in_progress'] }
    })
    .sort({ date: 1 })
    .limit(limit)
    .populate('createdBy', 'personalInfo firstName personalInfo lastName email');
};

boardMeetingSchema.statics.getPastMeetings = function(organizationId, limit = 10) {
    return this.find({
        organization: organizationId,
        date: { $lt: new Date() }
    })
    .sort({ date: -1 })
    .limit(limit);
};

module.exports = mongoose.model('BoardMeeting', boardMeetingSchema);