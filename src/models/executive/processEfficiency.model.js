// src/models/executive/processEfficiency.model.js
const mongoose = require('mongoose');

const processEfficiencySchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Process identification
    processName: {
        type: String,
        required: true
    },
    processId: String,
    category: {
        type: String,
        enum: ['manufacturing', 'service', 'administrative', 'logistics', 'quality'],
        required: true
    },
    department: String,
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    
    // Process steps
    steps: [{
        name: String,
        order: Number,
        duration: {
            planned: Number,
            actual: Number,
            variance: Number
        },
        resources: [{
            type: String,
            quantity: Number,
            cost: Number
        }],
        inputs: [{
            name: String,
            quantity: Number,
            unit: String
        }],
        outputs: [{
            name: String,
            quantity: Number,
            unit: String,
            quality: Number
        }],
        waiting: {
            time: Number,
            reason: String
        },
        bottlenecks: {
            isBottleneck: Boolean,
            capacity: Number,
            demand: Number,
            utilization: Number
        },
        quality: {
            defects: Number,
            rework: Number,
            scrap: Number,
            yield: Number
        }
    }],
    
    // Time metrics
    cycleTime: {
        total: Number,
        valueAdding: Number,
        nonValueAdding: Number,
        waiting: Number,
        processing: Number,
        moving: Number,
        inspection: Number
    },
    
    // Throughput metrics
    throughput: {
        rate: Number,
        capacity: Number,
        utilization: Number,
        theoretical: Number,
        actual: Number
    },
    
    // Efficiency metrics
    efficiency: {
        oee: Number, // Overall Equipment Effectiveness
        availability: Number,
        performance: Number,
        quality: Number,
        taktTime: Number,
        cycleEfficiency: Number
    },
    
    // Cost metrics
    costs: {
        labor: {
            perUnit: Number,
            total: Number
        },
        material: {
            perUnit: Number,
            total: Number
        },
        overhead: {
            perUnit: Number,
            total: Number
        },
        total: Number,
        target: Number,
        variance: Number
    },
    
    // Quality metrics
    quality: {
        defectRate: Number,
        firstPassYield: Number,
        finalYield: Number,
        reworkRate: Number,
        scrapRate: Number,
        customerComplaints: Number,
        cpk: Number, // Process Capability Index
        sigma: Number // Six Sigma level
    },
    
    // Resource utilization
    resources: {
        equipment: [{
            name: String,
            utilization: Number,
            availability: Number,
            maintenance: {
                last: Date,
                next: Date,
                hours: Number
            }
        }],
        labor: [{
            role: String,
            count: Number,
            utilization: Number,
            productivity: Number
        }],
        materials: [{
            name: String,
            consumption: Number,
            waste: Number,
            efficiency: Number
        }]
    },
    
    // Bottlenecks and constraints
    bottlenecks: [{
        step: String,
        reason: String,
        impact: {
            throughput: Number,
            delay: Number,
            cost: Number
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
        },
        recommendation: String,
        status: {
            type: String,
            enum: ['identified', 'analyzing', 'addressing', 'resolved']
        }
    }],
    
    // Historical data
    history: [{
        date: Date,
        metrics: {
            cycleTime: Number,
            throughput: Number,
            efficiency: Number,
            quality: Number,
            cost: Number
        },
        notes: String
    }],
    
    // Improvement initiatives
    improvements: [{
        title: String,
        description: String,
        expectedImpact: {
            metric: String,
            value: Number
        },
        status: {
            type: String,
            enum: ['proposed', 'planned', 'in_progress', 'completed', 'cancelled']
        },
        startedAt: Date,
        completedAt: Date,
        actualImpact: {
            metric: String,
            value: Number
        },
        roi: Number
    }],
    
    // Benchmarking
    benchmarks: {
        industry: {
            cycleTime: Number,
            efficiency: Number,
            quality: Number,
            cost: Number
        },
        bestPractice: {
            cycleTime: Number,
            efficiency: Number,
            quality: Number,
            cost: Number
        },
        gap: {
            cycleTime: Number,
            efficiency: Number,
            quality: Number,
            cost: Number
        }
    },
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastAnalyzed: Date
}, {
    timestamps: true
});

// Indexes
processEfficiencySchema.index({ organization: 1, processName: 1 });
processEfficiencySchema.index({ organization: 1, category: 1 });
processEfficiencySchema.index({ 'bottlenecks.severity': 1 });

module.exports = mongoose.model('ProcessEfficiency', processEfficiencySchema);