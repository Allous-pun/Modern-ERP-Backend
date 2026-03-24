// src/models/executive/technologyDashboard.model.js
const mongoose = require('mongoose');

const technologyDashboardSchema = new mongoose.Schema({
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
    period: {
        start: Date,
        end: Date,
        type: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly'],
            default: 'monthly'
        }
    },
    
    // Technology Strategy Overview
    strategy: {
        vision: String,
        mission: String,
        strategicPillars: [{
            name: String,
            description: String,
            progress: Number,
            status: {
                type: String,
                enum: ['on_track', 'at_risk', 'behind', 'completed']
            }
        }],
        objectives: [{
            name: String,
            target: String,
            progress: Number,
            deadline: Date
        }],
        budget: {
            allocated: Number,
            spent: Number,
            variance: Number,
            roi: Number
        }
    },
    
    // Innovation Pipeline
    innovation: {
        ideas: {
            total: Number,
            submitted: Number,
            underReview: Number,
            approved: Number,
            implemented: Number,
            rejected: Number
        },
        byCategory: [{
            category: String,
            count: Number,
            value: Number
        }],
        topIdeas: [{
            title: String,
            description: String,
            submittedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'OrganizationMember'
            },
            submittedAt: Date,
            potential: {
                type: String,
                enum: ['high', 'medium', 'low']
            },
            effort: {
                type: String,
                enum: ['high', 'medium', 'low']
            },
            status: String
        }],
        metrics: {
            submissionRate: Number,
            approvalRate: Number,
            implementationRate: Number,
            averageTimeToApprove: Number,
            averageTimeToImplement: Number,
            innovationScore: Number
        }
    },
    
    // R&D Pipeline
    rAndD: {
        projects: {
            total: Number,
            active: Number,
            completed: Number,
            onHold: Number,
            cancelled: Number
        },
        byStage: [{
            stage: {
                type: String,
                enum: ['ideation', 'research', 'development', 'testing', 'launch', 'maintenance']
            },
            count: Number,
            value: Number
        }],
        timeline: [{
            project: String,
            stage: String,
            startDate: Date,
            plannedEndDate: Date,
            actualEndDate: Date,
            progress: Number,
            status: String
        }],
        investment: {
            total: Number,
            byProject: [{
                project: String,
                amount: Number,
                roi: Number
            }],
            byQuarter: [{
                quarter: String,
                amount: Number
            }]
        },
        metrics: {
            timeToMarket: Number,
            successRate: Number,
            innovationIndex: Number,
            patentFilingRate: Number
        }
    },
    
    // Product Development
    productDevelopment: {
        products: {
            total: Number,
            inDevelopment: Number,
            inTesting: Number,
            launched: Number,
            deprecated: Number
        },
        roadmap: [{
            product: String,
            version: String,
            features: [String],
            plannedDate: Date,
            actualDate: Date,
            status: {
                type: String,
                enum: ['planned', 'in_progress', 'delayed', 'completed', 'cancelled']
            },
            progress: Number,
            blockers: [String]
        }],
        releases: [{
            version: String,
            date: Date,
            features: [String],
            bugs: Number,
            satisfaction: Number
        }],
        metrics: {
            velocity: Number,
            cycleTime: Number,
            deploymentFrequency: Number,
            changeFailureRate: Number,
            meanTimeToRecovery: Number
        }
    },
    
    // Technical Debt
    technicalDebt: {
        total: {
            estimated: Number,
            critical: Number,
            high: Number,
            medium: Number,
            low: Number
        },
        byComponent: [{
            component: String,
            debt: Number,
            interest: Number,
            priority: String,
            remediation: String
        }],
        trends: {
            daily: [{
                date: Date,
                value: Number
            }],
            monthly: [{
                month: String,
                value: Number
            }]
        },
        metrics: {
            debtRatio: Number,
            interestAccrued: Number,
            remediationProgress: Number,
            timeToFix: Number
        }
    },
    
    // Architecture Governance
    architecture: {
        principles: [{
            name: String,
            description: String,
            compliance: Number
        }],
        standards: [{
            name: String,
            version: String,
            compliance: Number,
            exceptions: Number
        }],
        patterns: [{
            name: String,
            usage: Number,
            effectiveness: Number
        }],
        reviews: [{
            component: String,
            date: Date,
            findings: [String],
            recommendations: [String],
            status: String
        }],
        metrics: {
            standardizationRate: Number,
            complianceScore: Number,
            architectureQuality: Number,
            technicalFit: Number
        }
    },
    
    // System Performance
    systemPerformance: {
        overall: {
            availability: Number,
            performance: Number,
            reliability: Number,
            scalability: Number
        },
        bySystem: [{
            name: String,
            type: String,
            metrics: {
                uptime: Number,
                responseTime: Number,
                throughput: Number,
                errorRate: Number,
                cpuUsage: Number,
                memoryUsage: Number,
                diskUsage: Number
            },
            alerts: [{
                type: String,
                severity: String,
                message: String,
                timestamp: Date
            }]
        }],
        apis: {
            total: Number,
            active: Number,
            performance: {
                averageLatency: Number,
                p95Latency: Number,
                p99Latency: Number,
                errorRate: Number
            },
            usage: [{
                endpoint: String,
                calls: Number,
                users: Number,
                trends: String
            }]
        },
        databases: [{
            name: String,
            type: String,
            size: Number,
            growth: Number,
            performance: {
                queryTime: Number,
                connections: Number,
                locks: Number
            },
            health: String
        }]
    },
    
    // Security Metrics
    security: {
            posture: {
                score: Number,
                level: {
                    type: String,
                    enum: ['excellent', 'good', 'fair', 'poor', 'critical']
                }
            },
            vulnerabilities: {
                total: Number,
                critical: Number,
                high: Number,
                medium: Number,
                low: Number,
                byAge: {
                    '0-30': Number,
                    '31-60': Number,
                    '61-90': Number,
                    '90+': Number
                }
            },
            incidents: {
                total: Number,
                resolved: Number,
                open: Number,
                bySeverity: {
                    critical: Number,
                    high: Number,
                    medium: Number,
                    low: Number
                },
                meanTimeToDetect: Number,
                meanTimeToResolve: Number
            },
            compliance: {
                standards: [{
                    name: String,
                    compliance: Number,
                    findings: Number,
                    lastAudit: Date
                }],
                score: Number,
                gaps: [String]
            }
        },
        
        // Cloud Infrastructure
        cloud: {
            providers: [{
                name: String,
                services: [String],
                cost: {
                    monthly: Number,
                    trend: String,
                    forecast: Number
                },
                usage: {
                    compute: Number,
                    storage: Number,
                    network: Number
                },
                optimization: {
                    savings: Number,
                    recommendations: [String]
                }
            }],
            cost: {
                total: Number,
                byService: [{
                    service: String,
                    cost: Number,
                    trend: String
                }],
                byEnvironment: [{
                    environment: String,
                    cost: Number
                }],
                forecast: Number
            },
            resources: {
                total: Number,
                utilized: Number,
                idle: Number,
                efficiency: Number
            }
        },
        
        // DevOps Metrics
        devops: {
            pipelines: [{
                name: String,
                builds: {
                    total: Number,
                    successful: Number,
                    failed: Number,
                    successRate: Number
                },
                deployments: {
                    total: Number,
                    successful: Number,
                    failed: Number,
                    frequency: Number
                },
                leadTime: Number,
                cycleTime: Number
            }],
            metrics: {
                deploymentFrequency: Number,
                leadTimeForChanges: Number,
                timeToRestore: Number,
                changeFailureRate: Number,
                availability: Number
            }
        },
        
        // Innovation Metrics
        innovationMetrics: {
            ideaVelocity: Number,
            conceptToLaunch: Number,
            innovationROI: Number,
            patentCount: Number,
            researchPapers: Number,
            partnerships: [{
                partner: String,
                focus: String,
                value: String,
                status: String
            }]
        },
        
        // Alerts
        alerts: [{
            type: {
                type: String,
                enum: ['performance', 'security', 'debt', 'innovation', 'compliance']
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
    technologyDashboardSchema.index({ organization: 1, 'period.start': -1, 'period.end': -1 });
    technologyDashboardSchema.index({ organization: 1, 'strategy.objectives.status': 1 });
    
    module.exports = mongoose.model('TechnologyDashboard', technologyDashboardSchema);