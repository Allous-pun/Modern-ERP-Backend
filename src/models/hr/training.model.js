// src/models/hr/training.model.js
const mongoose = require('mongoose');

const trainingParticipantSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: [true, 'Employee is required']
    },
    enrolledAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['enrolled', 'in-progress', 'completed', 'dropped', 'no-show'],
        default: 'enrolled'
    },
    attendance: [{
        date: Date,
        status: {
            type: String,
            enum: ['present', 'absent', 'late']
        }
    }],
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    score: {
        type: Number,
        min: 0,
        max: 100
    },
    feedback: String,
    completedAt: Date,
    certificateIssued: {
        type: Boolean,
        default: false
    },
    certificateUrl: String
}, { _id: true });

const trainingModuleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Module title is required'],
        trim: true
    },
    description: String,
    duration: Number, // in minutes
    order: Number,
    materials: [{
        name: String,
        type: {
            type: String,
            enum: ['video', 'document', 'quiz', 'assignment']
        },
        url: String
    }]
}, { _id: true });

const trainingSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // Basic Information
    title: {
        type: String,
        required: [true, 'Training title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    
    // Type
    type: {
        type: String,
        required: [true, 'Training type is required'],
        enum: ['technical', 'soft-skills', 'compliance', 'leadership', 'onboarding', 'certification', 'other'],
        index: true
    },
    
    // Category
    category: {
        type: String,
        enum: ['internal', 'external', 'online', 'in-person']
    },
    
    // Schedule
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    duration: {
        type: Number, // in hours
        required: [true, 'Duration is required']
    },
    
    // Location
    location: {
        type: String,
        trim: true
    },
    onlineLink: String,
    
    // Trainer
    trainer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    trainerName: String,
    trainerBio: String,
    
    // Capacity
    maxParticipants: {
        type: Number,
        required: [true, 'Maximum participants is required'],
        min: [1, 'Maximum participants must be at least 1']
    },
    enrolledCount: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Participants
    participants: [trainingParticipantSchema],
    
    // Curriculum
    modules: [trainingModuleSchema],
    
    // Materials
    materials: [{
        name: String,
        type: {
            type: String,
            enum: ['presentation', 'handout', 'video', 'exercise', 'other']
        },
        url: String,
        uploadedAt: Date
    }],
    
    // Cost
    cost: {
        amount: {
            type: Number,
            min: 0,
            default: 0
        },
        currency: {
            type: String,
            default: 'USD'
        }
    },
    
    // Prerequisites
    prerequisites: [String],
    
    // Learning Objectives
    objectives: [String],
    
    // Evaluation
    evaluationMethod: {
        type: String,
        enum: ['exam', 'project', 'attendance', 'certification', 'none']
    },
    passingScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 70
    },
    
    // Certification
    providesCertificate: {
        type: Boolean,
        default: false
    },
    certificateTemplate: String,
    
    // Status
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: ['planned', 'open', 'in-progress', 'completed', 'cancelled'],
        default: 'planned',
        index: true
    },
    
    // Feedback
    feedback: [{
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee'
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comments: String,
        submittedAt: Date
    }],
    
    // Average Rating
    averageRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator is required']
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Notes
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
trainingSchema.index({ organization: 1, status: 1 });
trainingSchema.index({ organization: 1, type: 1 });
trainingSchema.index({ organization: 1, startDate: 1 });
trainingSchema.index({ 'participants.employee': 1 });

// Virtual for available spots
trainingSchema.virtual('availableSpots').get(function() {
    return Math.max(0, this.maxParticipants - (this.participants?.length || 0));
});

// Virtual for is full
trainingSchema.virtual('isFull').get(function() {
    return (this.participants?.length || 0) >= this.maxParticipants;
});

// Virtual for is open
trainingSchema.virtual('isOpen').get(function() {
    const now = new Date();
    return this.status === 'open' && 
           now >= this.startDate && 
           now <= this.endDate;
});

// Method to enroll employee
trainingSchema.methods.enrollEmployee = async function(employeeId) {
    if (this.isFull) {
        throw new Error('Training is full');
    }
    
    if (this.participants.some(p => p.employee.toString() === employeeId.toString())) {
        throw new Error('Employee already enrolled');
    }
    
    this.participants.push({
        employee: employeeId,
        enrolledAt: new Date(),
        status: 'enrolled'
    });
    
    this.enrolledCount = this.participants.length;
    await this.save();
    
    return this;
};

// Method to update participant progress
trainingSchema.methods.updateProgress = async function(employeeId, progress) {
    const participant = this.participants.find(
        p => p.employee.toString() === employeeId.toString()
    );
    
    if (!participant) {
        throw new Error('Employee not enrolled');
    }
    
    participant.progress = progress;
    
    if (progress >= 100) {
        participant.status = 'completed';
        participant.completedAt = new Date();
    } else if (progress > 0) {
        participant.status = 'in-progress';
    }
    
    await this.save();
    return participant;
};

// Method to mark attendance
trainingSchema.methods.markAttendance = async function(employeeId, date, status) {
    const participant = this.participants.find(
        p => p.employee.toString() === employeeId.toString()
    );
    
    if (!participant) {
        throw new Error('Employee not enrolled');
    }
    
    participant.attendance.push({ date, status });
    await this.save();
    
    return participant;
};

// Method to issue certificate
trainingSchema.methods.issueCertificate = async function(employeeId, certificateUrl) {
    const participant = this.participants.find(
        p => p.employee.toString() === employeeId.toString()
    );
    
    if (!participant) {
        throw new Error('Employee not enrolled');
    }
    
    participant.certificateIssued = true;
    participant.certificateUrl = certificateUrl;
    await this.save();
    
    return participant;
};

// Static method to get upcoming trainings
trainingSchema.statics.getUpcomingTrainings = async function(organizationId, days = 30) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.find({
        organization: organizationId,
        status: { $in: ['planned', 'open'] },
        startDate: { $gte: today, $lte: futureDate }
    }).sort('startDate');
};

// Static method to get training summary
trainingSchema.statics.getTrainingSummary = async function(organizationId) {
    const pipeline = [
        { $match: { organization: mongoose.Types.ObjectId(organizationId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalParticipants: { $sum: { $size: '$participants' } },
                completedParticipants: {
                    $sum: {
                        $size: {
                            $filter: {
                                input: '$participants',
                                as: 'p',
                                cond: { $eq: ['$$p.status', 'completed'] }
                            }
                        }
                    }
                }
            }
        }
    ];

    return this.aggregate(pipeline);
};

module.exports = mongoose.model('Training', trainingSchema);