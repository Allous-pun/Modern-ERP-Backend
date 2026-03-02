// src/models/hr/employee.model.js
const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Emergency contact name is required'],
        trim: true
    },
    relationship: {
        type: String,
        required: [true, 'Relationship is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
    },
    address: String,
    isPrimary: {
        type: Boolean,
        default: false
    }
}, { _id: true });

const employmentHistorySchema = new mongoose.Schema({
    company: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true
    },
    position: {
        type: String,
        required: [true, 'Position is required'],
        trim: true
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: Date,
    isCurrent: {
        type: Boolean,
        default: false
    },
    responsibilities: String,
    achievements: [String]
}, { _id: true });

const educationSchema = new mongoose.Schema({
    degree: {
        type: String,
        required: [true, 'Degree is required'],
        trim: true
    },
    institution: {
        type: String,
        required: [true, 'Institution is required'],
        trim: true
    },
    fieldOfStudy: {
        type: String,
        trim: true
    },
    startDate: Date,
    endDate: Date,
    isCompleted: {
        type: Boolean,
        default: false
    },
    grade: String,
    certificateNumber: String
}, { _id: true });

const documentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Document name is required'],
        trim: true
    },
    type: {
        type: String,
        enum: ['contract', 'id', 'certificate', 'resume', 'other'],
        required: true
    },
    url: {
        type: String,
        required: [true, 'Document URL is required']
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: Date,
    notes: String
}, { _id: true });

const employeeSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: [true, 'Organization is required'],
        index: true
    },
    
    // User Account Link (if user exists)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        sparse: true,
        unique: true
    },
    
    // Basic Information
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        trim: true,
        unique: true
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    middleName: {
        type: String,
        trim: true,
        maxlength: [50, 'Middle name cannot exceed 50 characters']
    },
    preferredName: {
        type: String,
        trim: true
    },
    
    // Personal Information
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    dateOfBirth: Date,
    maritalStatus: {
        type: String,
        enum: ['single', 'married', 'divorced', 'widowed', 'other']
    },
    nationality: String,
    religion: String,
    
    // Contact Information
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
    },
    personalEmail: {
        type: String,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    mobile: String,
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    
    // Employment Details
    department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true
    },
    position: {
        type: String,
        required: [true, 'Position is required'],
        trim: true
    },
    jobTitle: {
        type: String,
        trim: true
    },
    employmentType: {
        type: String,
        required: [true, 'Employment type is required'],
        enum: ['full-time', 'part-time', 'contract', 'intern', 'temporary', 'consultant'],
        default: 'full-time'
    },
    employmentStatus: {
        type: String,
        required: [true, 'Employment status is required'],
        enum: ['active', 'probation', 'notice', 'terminated', 'resigned', 'retired', 'on-leave'],
        default: 'active'
    },
    
    // Dates
    hireDate: {
        type: Date,
        required: [true, 'Hire date is required']
    },
    probationEndDate: Date,
    confirmationDate: Date,
    terminationDate: Date,
    lastWorkingDate: Date,
    
    // Reporting Structure
    reportsTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    reportsToName: String,
    
    // Work Location
    workLocation: {
        type: String,
        trim: true
    },
    workPhone: String,
    workEmail: {
        type: String,
        lowercase: true,
        trim: true
    },
    
    // Compensation (Basic)
    currentSalary: {
        amount: Number,
        currency: {
            type: String,
            default: 'USD'
        },
        frequency: {
            type: String,
            enum: ['hourly', 'daily', 'weekly', 'monthly', 'annual']
        },
        effectiveDate: Date
    },
    
    // Leave Balances
    leaveBalance: {
        annual: { type: Number, default: 20 },
        sick: { type: Number, default: 10 },
        personal: { type: Number, default: 5 },
        maternity: { type: Number, default: 90 },
        paternity: { type: Number, default: 10 },
        unpaid: { type: Number, default: 0 },
        other: { type: Number, default: 0 }
    },
    
    // Bank Details
    bankDetails: {
        bankName: String,
        accountName: String,
        accountNumber: String,
        bankCode: String,
        branchCode: String,
        swiftCode: String,
        currency: {
            type: String,
            default: 'USD'
        }
    },
    
    // Tax Information
    taxInformation: {
        taxId: String,
        taxCode: String,
        taxBracket: String,
        allowance: Number,
        deductions: Number
    },
    
    // Emergency Contacts
    emergencyContacts: [emergencyContactSchema],
    
    // Employment History
    employmentHistory: [employmentHistorySchema],
    
    // Education
    education: [educationSchema],
    
    // Skills
    skills: [{
        name: String,
        level: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert']
        },
        yearsOfExperience: Number
    }],
    
    // Certifications
    certifications: [{
        name: String,
        issuingAuthority: String,
        licenseNumber: String,
        issueDate: Date,
        expiryDate: Date,
        url: String
    }],
    
    // Documents
    documents: [documentSchema],
    
    // Custom Fields (for extensibility)
    customFields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
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
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
employeeSchema.index({ organization: 1, employeeId: 1 }, { unique: true });
employeeSchema.index({ organization: 1, email: 1 });
employeeSchema.index({ organization: 1, department: 1 });
employeeSchema.index({ organization: 1, employmentStatus: 1 });
employeeSchema.index({ organization: 1, reportsTo: 1 });
employeeSchema.index({ hireDate: -1 });

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`.trim();
});

// Virtual for age
employeeSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});

// Virtual for years of service
employeeSchema.virtual('yearsOfService').get(function() {
    if (!this.hireDate) return 0;
    const today = new Date();
    const hire = new Date(this.hireDate);
    const years = (today - hire) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.round(years * 10) / 10;
});

// Method to check if on probation
employeeSchema.virtual('isOnProbation').get(function() {
    if (this.employmentStatus !== 'probation') return false;
    if (!this.probationEndDate) return true;
    return new Date() <= this.probationEndDate;
});

// Method to calculate available leave
employeeSchema.methods.getAvailableLeave = function(leaveType) {
    const taken = this.leaveTaken?.[leaveType] || 0;
    const total = this.leaveBalance[leaveType] || 0;
    return Math.max(0, total - taken);
};

// Method to update leave balance
employeeSchema.methods.updateLeaveBalance = async function(leaveType, days, operation = 'deduct') {
    if (operation === 'deduct') {
        this.leaveBalance[leaveType] = Math.max(0, this.leaveBalance[leaveType] - days);
    } else if (operation === 'add') {
        this.leaveBalance[leaveType] = (this.leaveBalance[leaveType] || 0) + days;
    }
    await this.save();
};

// Static method to get employees by department
employeeSchema.statics.getByDepartment = async function(organizationId, department) {
    return this.find({
        organization: organizationId,
        department,
        employmentStatus: 'active'
    }).sort('lastName firstName');
};

// Static method to get organization chart
employeeSchema.statics.getOrgChart = async function(organizationId) {
    const employees = await this.find({
        organization: organizationId,
        employmentStatus: 'active'
    }).select('firstName lastName position department reportsTo');

    const orgChart = [];
    const employeeMap = {};

    // Create map of employees
    employees.forEach(emp => {
        employeeMap[emp._id] = {
            ...emp.toObject(),
            children: []
        };
    });

    // Build tree structure
    employees.forEach(emp => {
        if (emp.reportsTo && employeeMap[emp.reportsTo]) {
            employeeMap[emp.reportsTo].children.push(employeeMap[emp._id]);
        } else {
            orgChart.push(employeeMap[emp._id]);
        }
    });

    return orgChart;
};

module.exports = mongoose.model('Employee', employeeSchema);