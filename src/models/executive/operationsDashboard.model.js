// src/models/executive/operationsDashboard.model.js
const mongoose = require('mongoose');

const operationsDashboardSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Dashboard configuration
    name: {
        type: String,
        required: true
    },
    description: String,
    type: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'custom'],
        default: 'daily'
    },
    
    // Date range
    period: {
        start: Date,
        end: Date,
        label: String
    },
    
    // Operational KPIs
    kpis: {
        overall: {
            efficiency: {
                value: Number,
                target: Number,
                trend: {
                    direction: String,
                    percentage: Number
                },
                status: {
                    type: String,
                    enum: ['excellent', 'good', 'average', 'poor']
                }
            },
            productivity: {
                value: Number,
                target: Number,
                trend: String,
                status: String
            },
            quality: {
                value: Number,
                target: Number,
                trend: String,
                status: String
            },
            utilization: {
                value: Number,
                target: Number,
                trend: String,
                status: String
            }
        },
        
        // Department-specific KPIs
        departments: [{
            name: String,
            metrics: {
                efficiency: Number,
                productivity: Number,
                quality: Number,
                utilization: Number,
                costPerUnit: Number,
                cycleTime: Number
            },
            kpis: [{
                name: String,
                value: Number,
                target: Number,
                unit: String,
                status: String,
                trend: String
            }]
        }]
    },
    
    // Process Efficiency Metrics
    processEfficiency: {
        overall: {
            cycleTime: Number,
            throughput: Number,
            defectRate: Number,
            firstPassYield: Number,
            oee: Number // Overall Equipment Effectiveness
        },
        
        processes: [{
            name: String,
            category: String,
            metrics: {
                cycleTime: {
                    current: Number,
                    average: Number,
                    target: Number,
                    trend: String
                },
                throughput: {
                    current: Number,
                    capacity: Number,
                    utilization: Number
                },
                quality: {
                    defectRate: Number,
                    firstPassYield: Number,
                    reworkRate: Number
                },
                cost: {
                    perUnit: Number,
                    total: Number,
                    variance: Number
                }
            },
            bottlenecks: [{
                stage: String,
                impact: String,
                severity: {
                    type: String,
                    enum: ['low', 'medium', 'high', 'critical']
                },
                recommendation: String
            }],
            status: {
                type: String,
                enum: ['optimal', 'efficient', 'needs_improvement', 'critical']
            }
        }]
    },
    
    // Supply Chain Metrics
    supplyChain: {
        inventory: {
            turnover: Number,
            daysOnHand: Number,
            accuracy: Number,
            value: Number,
            slowMoving: Number,
            deadStock: Number
        },
        suppliers: {
            total: Number,
            active: Number,
            performance: {
                onTimeDelivery: Number,
                quality: Number,
                cost: Number,
                leadTime: Number
            },
            risk: [{
                supplier: String,
                riskLevel: String,
                mitigation: String
            }]
        },
        logistics: {
            shipping: {
                onTime: Number,
                cost: Number,
                damageRate: Number
            },
            warehouse: {
                utilization: Number,
                accuracy: Number,
                productivity: Number
            },
            transportation: {
                fleetUtilization: Number,
                fuelEfficiency: Number,
                maintenance: Number
            }
        }
    },
    
    // Production Metrics (if applicable)
    production: {
        output: {
            total: Number,
            planned: Number,
            achieved: Number,
            variance: Number
        },
        efficiency: {
            oee: Number,
            availability: Number,
            performance: Number,
            quality: Number
        },
        downtime: {
            total: Number,
            planned: Number,
            unplanned: Number,
            mttr: Number, // Mean Time To Repair
            mtbf: Number // Mean Time Between Failures
        },
        lines: [{
            name: String,
            output: Number,
            efficiency: Number,
            status: {
                type: String,
                enum: ['running', 'idle', 'down', 'maintenance']
            },
            nextMaintenance: Date
        }]
    },
    
    // Service Operations Metrics
    service: {
        tickets: {
            total: Number,
            open: Number,
            resolved: Number,
            sla: {
                compliance: Number,
                breached: Number
            }
        },
        response: {
            average: Number,
            byPriority: {
                critical: Number,
                high: Number,
                medium: Number,
                low: Number
            }
        },
        resolution: {
            average: Number,
            firstContact: Number,
            satisfaction: Number
        },
        workload: {
            perAgent: [{
                agent: String,
                assigned: Number,
                resolved: Number,
                backlog: Number
            }],
            distribution: {
                type: String,
                value: Number
            }
        }
    },
    
    // Quality Metrics
    quality: {
        overall: {
            defectRate: Number,
            customerComplaints: Number,
            returns: Number,
            warranty: Number
        },
        byProduct: [{
            product: String,
            defectRate: Number,
            returns: Number,
            qualityScore: Number
        }],
        byProcess: [{
            process: String,
            cpk: Number, // Process Capability Index
            defectRate: Number,
            sigma: Number
        }],
        inspections: {
            total: Number,
            passed: Number,
            failed: Number,
            rate: Number
        }
    },
    
    // Resource Utilization
    resources: {
        equipment: {
            total: Number,
            available: Number,
            inUse: Number,
            maintenance: Number,
            utilization: Number
        },
        labor: {
            total: Number,
            scheduled: Number,
            actual: Number,
            overtime: Number,
            productivity: Number
        },
        facilities: {
            utilization: Number,
            capacity: Number,
            maintenance: [{
                facility: String,
                status: String,
                nextDate: Date
            }]
        }
    },
    
    // Cost Metrics
    operationalCosts: {
        total: Number,
        byCategory: [{
            category: String,
            amount: Number,
            budget: Number,
            variance: Number
        }],
        perUnit: Number,
        trends: {
            daily: [{
                date: Date,
                value: Number
            }],
            monthly: [{
                month: String,
                value: Number
            }]
        }
    },
    
    // Alerts and Notifications
    alerts: [{
        type: {
            type: String,
            enum: ['bottleneck', 'quality', 'downtime', 'inventory', 'performance']
        },
        severity: {
            type: String,
            enum: ['info', 'warning', 'critical']
        },
        message: String,
        metric: String,
        value: Number,
        threshold: Number,
        timestamp: Date,
        acknowledged: {
            by: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            at: Date
        },
        resolved: {
            type: Boolean,
            default: false
        }
    }],
    
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
    }
}, {
    timestamps: true
});

// Indexes
operationsDashboardSchema.index({ organization: 1, type: 1 });
operationsDashboardSchema.index({ organization: 1, 'period.start': -1, 'period.end': -1 });

module.exports = mongoose.model('OperationsDashboard', operationsDashboardSchema);