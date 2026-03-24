// src/models/executive/boardResolution.model.js
const mongoose = require('mongoose');

const boardResolutionSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Resolution details
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    resolutionNumber: {
        type: String,
        required: false,
        unique: true
    },
    
    // Type and category
    type: {
        type: String,
        enum: ['ordinary', 'special', 'unanimous', 'emergency'],
        default: 'ordinary'
    },
    category: {
        type: String,
        enum: ['financial', 'governance', 'strategic', 'operational', 'hr', 'legal'],
        required: true
    },
    
    // Meeting association
    meeting: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BoardMeeting',
        required: true
    },
    
    // Proposed by
    proposedBy: {
        member: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember',
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        }
    },
    
    // Seconded by (required for formal resolutions)
    secondedBy: {
        member: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        date: Date
    },
    
    // Voting
    voting: {
        method: {
            type: String,
            enum: ['show_of_hands', 'roll_call', 'secret_ballot', 'electronic'],
            default: 'show_of_hands'
        },
        startedAt: {  // ← ADD THIS LINE
            type: Date
        },
        quorum: {
            required: Number,
            achieved: Boolean
        },
        votes: [{
            member: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            vote: {
                type: String,
                enum: ['for', 'against', 'abstain', 'not_voted'],
                default: 'not_voted'
            },
            date: Date,
            notes: String
        }],
        totals: {
            for: {
                type: Number,
                default: 0
            },
            against: {
                type: Number,
                default: 0
            },
            abstain: {
                type: Number,
                default: 0
            },
            notVoted: {
                type: Number,
                default: 0
            }
        },
        requiredMajority: {
            type: String,
            enum: ['simple', 'two_thirds', 'three_quarters', 'unanimous'],
            default: 'simple'
        },
        passed: {
            type: Boolean,
            default: false
        },
        passedAt: Date,
        certifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        }
    },
    
    // Effective date
    effectiveDate: {
        type: Date,
        required: true
    },
    expiryDate: Date,
    
    // Implementation
    implementation: {
        assignedTo: [{
            member: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            department: String,
            tasks: [String]
        }],
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'overdue'],
            default: 'pending'
        },
        progress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        completionDate: Date,
        notes: String
    },
    
    // Attachments
    attachments: [{
        name: String,
        url: String,
        type: String,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        uploadedAt: Date
    }],
    
    // Amendments
    amendments: [{
        resolutionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'BoardResolution'
        },
        date: Date,
        description: String
    }],
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'proposed', 'voting', 'passed', 'defeated', 'implemented', 'archived'],
        default: 'draft'
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

// Generate resolution number
boardResolutionSchema.pre('save', async function() {
    if (this.isNew) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            organization: this.organization,
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            }
        });

        this.resolutionNumber = `RES-${year}-${(count + 1)
            .toString()
            .padStart(4, '0')}`;
    }
});

// Indexes
boardResolutionSchema.index({ organization: 1, resolutionNumber: 1 });
boardResolutionSchema.index({ organization: 1, status: 1 });
boardResolutionSchema.index({ meeting: 1 });

// Methods
boardResolutionSchema.methods.castVote = function(memberId, voteValue) {
    const voteIndex = this.voting.votes.findIndex(v => 
        v.member.toString() === memberId.toString()
    );
    
    if (voteIndex === -1) {
        this.voting.votes.push({
            member: memberId,
            vote: voteValue,
            date: new Date()
        });
    } else {
        this.voting.votes[voteIndex].vote = voteValue;
        this.voting.votes[voteIndex].date = new Date();
    }
    
    // Recalculate totals
    this.voting.totals = {
        for: this.voting.votes.filter(v => v.vote === 'for').length,
        against: this.voting.votes.filter(v => v.vote === 'against').length,
        abstain: this.voting.votes.filter(v => v.vote === 'abstain').length,
        notVoted: this.voting.votes.filter(v => v.vote === 'not_voted').length
    };
    
    // Check if passed based on required majority
    const totalVotes = this.voting.totals.for + this.voting.totals.against;
    const forVotes = this.voting.totals.for;
    
    switch(this.voting.requiredMajority) {
        case 'simple':
            this.voting.passed = forVotes > this.voting.totals.against;
            break;
        case 'two_thirds':
            this.voting.passed = forVotes >= (totalVotes * 2/3);
            break;
        case 'three_quarters':
            this.voting.passed = forVotes >= (totalVotes * 3/4);
            break;
        case 'unanimous':
            this.voting.passed = forVotes === totalVotes && totalVotes > 0;
            break;
    }
    
    if (this.voting.passed) {
        this.voting.passedAt = new Date();
        this.status = 'passed';
    }
    
    return this.save();
};

module.exports = mongoose.model('BoardResolution', boardResolutionSchema);
