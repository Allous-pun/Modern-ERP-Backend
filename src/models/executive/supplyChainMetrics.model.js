// src/models/executive/supplyChainMetrics.model.js
const mongoose = require('mongoose');

const supplyChainMetricsSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Period
    period: {
        start: Date,
        end: Date,
        type: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly']
        }
    },
    
    // Inventory Metrics
    inventory: {
        total: {
            value: Number,
            units: Number
        },
        byCategory: [{
            category: String,
            value: Number,
            units: Number,
            turnover: Number,
            daysOnHand: Number
        }],
        byLocation: [{
            warehouse: String,
            value: Number,
            units: Number,
            utilization: Number
        }],
        metrics: {
            turnover: Number,
            daysOnHand: Number,
            accuracy: Number,
            obsolescence: Number,
            slowMoving: Number,
            deadStock: Number,
            stockouts: Number
        },
        abc: {
            a: { value: Number, percentage: Number },
            b: { value: Number, percentage: Number },
            c: { value: Number, percentage: Number }
        }
    },
    
    // Supplier Metrics
    suppliers: {
        total: Number,
        active: Number,
        performance: {
            overall: Number,
            bySupplier: [{
                supplierId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Supplier'
                },
                name: String,
                metrics: {
                    onTimeDelivery: Number,
                    quality: Number,
                    cost: Number,
                    leadTime: Number,
                    responsiveness: Number
                },
                risk: {
                    level: {
                        type: String,
                        enum: ['low', 'medium', 'high', 'critical']
                    },
                    factors: [String],
                    mitigation: String
                },
                status: {
                    type: String,
                    enum: ['preferred', 'approved', 'probation', 'discontinued']
                }
            }]
        },
        compliance: {
            certified: Number,
            audited: Number,
            nonCompliant: Number
        }
    },
    
    // Procurement Metrics
    procurement: {
        spend: {
            total: Number,
            byCategory: [{
                category: String,
                amount: Number,
                percentage: Number
            }],
            bySupplier: [{
                supplier: String,
                amount: Number,
                percentage: Number
            }]
        },
        purchasing: {
            orders: {
                total: Number,
                value: Number,
                average: Number
            },
            cycleTime: {
                orderToDelivery: Number,
                approval: Number,
                processing: Number
            },
            costSavings: {
                negotiated: Number,
                bulk: Number,
                total: Number
            }
        }
    },
    
    // Logistics Metrics - FIXED SECTION
    logistics: {
        transportation: {
            modes: [{
                type: {
                    type: String,
                    required: true
                },
                volume: {
                    type: Number,
                    required: true
                },
                cost: {
                    type: Number,
                    required: true
                },
                transitTime: {
                    type: Number,
                    required: true
                }
            }],
            carriers: [{
                name: String,
                performance: {
                    onTime: Number,
                    damage: Number,
                    cost: Number
                }
            }],
            metrics: {
                costPerUnit: Number,
                costPerMile: Number,
                fuelEfficiency: Number,
                utilization: Number
            }
        },
        warehousing: {
            facilities: [{
                name: String,
                capacity: Number,
                utilization: Number,
                accuracy: Number,
                productivity: Number
            }],
            operations: {
                receiving: {
                    volume: Number,
                    cycleTime: Number
                },
                putaway: {
                    volume: Number,
                    cycleTime: Number
                },
                picking: {
                    volume: Number,
                    accuracy: Number,
                    cycleTime: Number
                },
                packing: {
                    volume: Number,
                    cycleTime: Number
                },
                shipping: {
                    volume: Number,
                    accuracy: Number,
                    cycleTime: Number
                }
            },
            costs: {
                perUnit: Number,
                labor: Number,
                space: Number,
                equipment: Number
            }
        }
    },
    
    // Demand Planning
    demand: {
        forecast: {
            accuracy: Number,
            bias: Number,
            mape: Number, // Mean Absolute Percentage Error
            byProduct: [{
                product: String,
                forecast: Number,
                actual: Number,
                accuracy: Number
            }]
        },
        planning: {
            coverage: Number,
            serviceLevel: Number,
            fillRate: Number,
            backlog: Number
        }
    },
    
    // Risk Metrics
    risks: {
        overall: {
            level: {
                type: String,
                enum: ['low', 'medium', 'high', 'critical']
            },
            score: Number
        },
        byCategory: [{
            category: String,
            level: String,
            probability: Number,
            impact: Number,
            mitigation: String
        }],
        disruptions: [{
            type: String,
            date: Date,
            duration: Number,
            impact: String,
            resolved: Boolean
        }]
    },
    
    // Sustainability Metrics
    sustainability: {
        carbonFootprint: Number,
        waste: Number,
        recycling: Number,
        greenSuppliers: Number,
        sustainablePackaging: Number
    },
    
    // Metadata
    generatedAt: {
        type: Date,
        default: Date.now
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    }
}, {
    timestamps: true
});

// Indexes
supplyChainMetricsSchema.index({ organization: 1, 'period.start': -1, 'period.end': -1 });
supplyChainMetricsSchema.index({ organization: 1, 'risks.overall.level': 1 });

module.exports = mongoose.model('SupplyChainMetrics', supplyChainMetricsSchema);