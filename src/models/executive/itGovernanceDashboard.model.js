// src/models/executive/itGovernanceDashboard.model.js
const mongoose = require('mongoose');

const itGovernanceDashboardSchema = new mongoose.Schema({
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
    
    // IT Strategy Alignment
    strategyAlignment: {
        vision: String,
        mission: String,
        strategicObjectives: [{
            name: String,
            description: String,
            businessGoal: String,
            progress: Number,
            status: {
                type: String,
                enum: ['on_track', 'at_risk', 'behind', 'completed']
            },
            metrics: [{
                name: String,
                target: Number,
                actual: Number,
                unit: String
            }]
        }],
        businessAlignment: {
            score: Number,
            byDepartment: [{
                department: String,
                alignment: Number,
                satisfaction: Number
            }]
        },
        itValue: {
            total: Number,
            roi: Number,
            byInitiative: [{
                initiative: String,
                investment: Number,
                return: Number,
                roi: Number
            }]
        }
    },
    
    // IT Compliance Dashboard
    compliance: {
        overall: {
            score: Number,
            status: {
                type: String,
                enum: ['excellent', 'good', 'fair', 'poor', 'critical']
            },
            findings: Number,
            remediated: Number
        },
        frameworks: [{
            name: {
                type: String,
                enum: ['ISO27001', 'SOC2', 'GDPR', 'HIPAA', 'PCI-DSS', 'COBIT', 'ITIL', 'NIST']
            },
            status: {
                type: String,
                enum: ['compliant', 'partially_compliant', 'non_compliant', 'not_applicable', 'in_progress']
            },
            score: Number,
            lastAudit: Date,
            nextAudit: Date,
            findings: [{
                description: String,
                severity: {
                    type: String,
                    enum: ['critical', 'high', 'medium', 'low']
                },
                status: {
                    type: String,
                    enum: ['open', 'in_progress', 'closed']
                },
                remediationPlan: String,
                dueDate: Date
            }],
            evidence: [{
                name: String,
                url: String,
                uploadedAt: Date,
                validUntil: Date
            }]
        }],
        complianceCosts: {
            total: Number,
            byFramework: [{
                framework: String,
                cost: Number
            }],
            forecast: Number
        }
    },
    
    // Digital Transformation Progress
    digitalTransformation: {
        overall: {
            progress: Number,
            score: Number,
            maturity: {
                type: String,
                enum: ['initial', 'developing', 'defined', 'managed', 'optimizing']
            }
        },
        initiatives: [{
            name: String,
            description: String,
            category: {
                type: String,
                enum: ['process_automation', 'cloud_migration', 'data_analytics', 'customer_experience', 'workplace_digitalization']
            },
            objectives: [String],
            budget: {
                allocated: Number,
                spent: Number,
                remaining: Number
            },
            timeline: {
                startDate: Date,
                plannedEndDate: Date,
                actualEndDate: Date
            },
            progress: Number,
            milestones: [{
                name: String,
                dueDate: Date,
                completedDate: Date,
                status: {
                    type: String,
                    enum: ['pending', 'in_progress', 'completed', 'delayed']
                }
            }],
            metrics: [{
                name: String,
                baseline: Number,
                target: Number,
                current: Number,
                unit: String
            }],
            risks: [{
                description: String,
                impact: String,
                probability: String,
                mitigation: String
            }],
            status: {
                type: String,
                enum: ['planned', 'in_progress', 'completed', 'on_hold', 'cancelled']
            },
            roi: Number,
            businessImpact: String
        }],
        technologyAdoption: {
            cloud: {
                adoption: Number,
                migrationProgress: Number,
                applications: Number
            },
            ai: {
                adoption: Number,
                useCases: Number,
                roi: Number
            },
            automation: {
                processesAutomated: Number,
                efficiencyGain: Number,
                costSavings: Number
            },
            analytics: {
                maturity: String,
                adoption: Number,
                insights: Number
            }
        },
        digitalCapabilities: [{
            capability: String,
            currentLevel: Number,
            targetLevel: Number,
            gap: Number,
            initiatives: [String]
        }]
    },
    
    // Systems Performance Metrics
    systemPerformance: {
        overall: {
            availability: Number,
            performance: Number,
            reliability: Number,
            satisfaction: Number
        },
        criticalSystems: [{
            name: String,
            type: {
                type: String,
                enum: ['erp', 'crm', 'hris', 'bi', 'core_business']
            },
            metrics: {
                uptime: {
                    value: Number,
                    target: Number,
                    trend: String
                },
                responseTime: {
                    value: Number,
                    target: Number,
                    trend: String
                },
                throughput: {
                    value: Number,
                    target: Number,
                    trend: String
                },
                errorRate: {
                    value: Number,
                    target: Number,
                    trend: String
                },
                userSatisfaction: {
                    value: Number,
                    target: Number,
                    trend: String
                }
            },
            incidents: {
                total: Number,
                critical: Number,
                mttr: Number, // Mean Time To Resolve
                mtbf: Number // Mean Time Between Failures
            },
            maintenance: {
                lastMaintenance: Date,
                nextMaintenance: Date,
                type: String
            },
            status: {
                type: String,
                enum: ['operational', 'degraded', 'down', 'maintenance']
            }
        }],
        serviceLevels: {
            agreements: [{
                name: String,
                provider: String,
                metrics: [{
                    name: String,
                    target: Number,
                    actual: Number,
                    compliance: Number,
                    trend: String
                }],
                overall: {
                    compliance: Number,
                    status: {
                        type: String,
                        enum: ['met', 'partially_met', 'breached']
                    }
                }
            }],
            achievements: {
                ytd: Number,
                qtd: Number,
                mtd: Number
            }
        },
        capacity: {
            current: {
                compute: Number,
                storage: Number,
                network: Number
            },
            utilization: {
                compute: Number,
                storage: Number,
                network: Number
            },
            forecast: {
                compute: Number,
                storage: Number,
                network: Number,
                timeline: String
            },
            constraints: [{
                resource: String,
                threshold: Number,
                current: Number,
                action: String
            }]
        }
    },
    
    // Cybersecurity Metrics
    cybersecurity: {
        posture: {
            overall: {
                score: Number,
                level: {
                    type: String,
                    enum: ['excellent', 'good', 'fair', 'poor', 'critical']
                },
                trend: String
            },
            byDomain: [{
                domain: {
                    type: String,
                    enum: ['identity', 'endpoint', 'network', 'data', 'application', 'infrastructure']
                },
                score: Number,
                controls: Number,
                compliance: Number
            }]
        },
        vulnerabilities: {
            total: Number,
            bySeverity: {
                critical: Number,
                high: Number,
                medium: Number,
                low: Number
            },
            byAge: {
                '0-30': Number,
                '31-60': Number,
                '61-90': Number,
                '90+': Number
            },
            remediation: {
                meanTimeToRemediate: Number,
                remediationRate: Number,
                overdue: Number
            },
            topVulnerabilities: [{
                name: String,
                severity: String,
                affectedSystems: [String],
                cvss: Number,
                publishedDate: Date,
                remediation: String
            }]
        },
        incidents: {
            total: Number,
            bySeverity: {
                critical: Number,
                high: Number,
                medium: Number,
                low: Number
            },
            byType: [{
                type: String,
                count: Number
            }],
            metrics: {
                meanTimeToDetect: Number,
                meanTimeToRespond: Number,
                meanTimeToResolve: Number,
                incidentsPrevented: Number
            },
            recentIncidents: [{
                title: String,
                severity: String,
                detectedAt: Date,
                resolvedAt: Date,
                impact: String,
                status: String
            }]
        },
        securityControls: {
            total: Number,
            implemented: Number,
            effective: Number,
            byCategory: [{
                category: String,
                implemented: Number,
                total: Number,
                effectiveness: Number
            }]
        },
        compliance: {
            standards: [{
                name: String,
                compliance: Number,
                lastAssessment: Date,
                nextAssessment: Date
            }],
            audits: [{
                name: String,
                date: Date,
                findings: Number,
                status: String
            }]
        },
        training: {
            completion: Number,
            score: Number,
            byDepartment: [{
                department: String,
                completion: Number,
                score: Number
            }]
        },
        budget: {
            total: Number,
            spent: Number,
            forecast: Number,
            roi: Number
        }
    },
    
    // IT Service Delivery
    serviceDelivery: {
        serviceDesk: {
            tickets: {
                total: Number,
                open: Number,
                resolved: Number,
                backlog: Number
            },
            byCategory: [{
                category: String,
                count: Number,
                percentage: Number
            }],
            byPriority: {
                critical: Number,
                high: Number,
                medium: Number,
                low: Number
            },
            metrics: {
                firstResponseTime: Number,
                resolutionTime: Number,
                firstContactResolution: Number,
                customerSatisfaction: Number,
                ticketVolume: {
                    daily: Number,
                    weekly: Number,
                    monthly: Number
                }
            },
            satisfaction: {
                overall: Number,
                byAgent: [{
                    agent: String,
                    score: Number,
                    reviews: Number
                }],
                trends: [{
                    month: String,
                    score: Number
                }]
            }
        },
        incidentManagement: {
            incidents: {
                total: Number,
                major: Number,
                recurring: Number
            },
            metrics: {
                mttd: Number, // Mean Time To Detect
                mttr: Number, // Mean Time To Resolve
                mtbf: Number, // Mean Time Between Failures
                availability: Number
            },
            rootCauses: [{
                cause: String,
                count: Number,
                percentage: Number
            }]
        },
        problemManagement: {
            problems: {
                total: Number,
                known: Number,
                resolved: Number
            },
            workarounds: Number,
            knownErrors: [{
                error: String,
                workaround: String,
                status: String
            }]
        },
        changeManagement: {
            changes: {
                total: Number,
                successful: Number,
                failed: Number,
                rolledBack: Number
            },
            successRate: Number,
            byType: [{
                type: String,
                count: Number,
                success: Number
            }],
            cab: {
                meetings: Number,
                approvals: Number,
                rejections: Number
            }
        },
        requestFulfillment: {
            requests: {
                total: Number,
                completed: Number,
                inProgress: Number
            },
            fulfillmentTime: Number,
            byType: [{
                type: String,
                count: Number,
                averageTime: Number
            }]
        },
        assetManagement: {
            assets: {
                total: Number,
                hardware: Number,
                software: Number,
                licenses: Number
            },
            compliance: {
                licensed: Number,
                unlicensed: Number,
                compliance: Number
            },
            lifecycle: {
                active: Number,
                retired: Number,
                endOfLife: Number
            },
            costs: {
                total: Number,
                hardware: Number,
                software: Number,
                maintenance: Number
            }
        }
    },
    
    // Data Governance Metrics
    dataGovernance: {
        framework: {
            maturity: {
                type: String,
                enum: ['initial', 'developing', 'defined', 'managed', 'optimizing']
            },
            policies: {
                total: Number,
                implemented: Number,
                compliance: Number
            },
            standards: [{
                name: String,
                version: String,
                compliance: Number
            }]
        },
        dataQuality: {
            overall: {
                score: Number,
                completeness: Number,
                accuracy: Number,
                consistency: Number,
                timeliness: Number
            },
            byDomain: [{
                domain: String,
                score: Number,
                issues: Number
            }],
            issues: {
                total: Number,
                critical: Number,
                resolved: Number,
                meanTimeToResolve: Number
            }
        },
        dataPrivacy: {
            compliance: {
                gdpr: Number,
                ccpa: Number,
                other: [{
                    regulation: String,
                    compliance: Number
                }]
            },
            dsar: {
                received: Number,
                completed: Number,
                averageTime: Number
            },
            consent: {
                records: Number,
                valid: Number,
                withdrawn: Number
            },
            breaches: {
                total: Number,
                reported: Number,
                resolved: Number
            }
        },
        dataSecurity: {
            classification: {
                public: Number,
                internal: Number,
                confidential: Number,
                restricted: Number
            },
            encryption: {
                atRest: Number,
                inTransit: Number,
                keyManagement: String
            },
            access: {
                reviews: Number,
                violations: Number,
                certifications: Number
            }
        },
        dataCatalog: {
            assets: {
                total: Number,
                documented: Number,
                certified: Number
            },
            byType: [{
                type: String,
                count: Number
            }],
            lineage: {
                tracked: Number,
                verified: Number
            },
            usage: {
                queries: Number,
                users: Number,
                popular: [String]
            }
        },
        masterData: {
            domains: [{
                name: String,
                quality: Number,
                completeness: Number
            }],
            stewardship: {
                stewards: Number,
                coverage: Number
            }
        }
    },
    
    // IT Audit Management
    itAudit: {
        audits: [{
            name: String,
            scope: String,
            auditor: String,
            type: {
                type: String,
                enum: ['internal', 'external', 'regulatory']
            },
            startDate: Date,
            endDate: Date,
            status: {
                type: String,
                enum: ['planned', 'in_progress', 'completed', 'overdue']
            },
            findings: {
                total: Number,
                critical: Number,
                high: Number,
                medium: Number,
                low: Number
            },
            recommendations: [{
                description: String,
                priority: String,
                owner: String,
                dueDate: Date,
                status: {
                    type: String,
                    enum: ['open', 'in_progress', 'closed']
                }
            }],
            report: {
                url: String,
                issuedAt: Date
            },
            compliance: Number
        }],
        schedule: {
            planned: Number,
            completed: Number,
            upcoming: [{
                name: String,
                date: Date,
                scope: String
            }]
        },
        remediation: {
            open: Number,
            inProgress: Number,
            closed: Number,
            overdue: Number,
            meanTimeToClose: Number
        },
        auditFindings: {
            bySeverity: {
                critical: Number,
                high: Number,
                medium: Number,
                low: Number
            },
            byCategory: [{
                category: String,
                count: Number
            }],
            trends: [{
                quarter: String,
                findings: Number,
                closed: Number
            }]
        }
    },
    
    // Vendor Risk Management
    vendorRisk: {
        vendors: {
            total: Number,
            critical: Number,
            highRisk: Number,
            mediumRisk: Number,
            lowRisk: Number
        },
        byCategory: [{
            category: String,
            count: Number,
            risk: Number
        }],
        assessments: [{
            vendor: String,
            type: String,
            lastAssessment: Date,
            nextAssessment: Date,
            score: Number,
            risk: {
                type: String,
                enum: ['low', 'medium', 'high', 'critical']
            },
            findings: [String],
            status: {
                type: String,
                enum: ['compliant', 'non_compliant', 'under_review']
            }
        }],
        contracts: {
            total: Number,
            expiring: Number,
            underReview: Number,
            compliance: Number
        },
        performance: {
            overall: Number,
            byVendor: [{
                name: String,
                score: Number,
                sla: Number,
                incidents: Number
            }]
        },
        security: {
            assessments: Number,
            breaches: Number,
            certifications: [String]
        },
        financial: {
            spend: {
                total: Number,
                byVendor: [{
                    name: String,
                    amount: Number
                }]
            },
            risk: {
                concentration: Number,
                critical: Number
            }
        }
    },
    
    // Technology Portfolio Management
    technologyPortfolio: {
        applications: {
            total: Number,
            byStatus: {
                active: Number,
                development: Number,
                retired: Number,
                planned: Number
            },
            byCriticality: {
                critical: Number,
                high: Number,
                medium: Number,
                low: Number
            },
            byType: [{
                type: String,
                count: Number
            }],
            lifecycle: {
                averageAge: Number,
                endOfLife: Number,
                technicalDebt: Number
            },
            rationalization: {
                candidatesForRetirement: Number,
                candidatesForConsolidation: Number,
                candidatesForUpgrade: Number,
                savings: Number
            }
        },
        infrastructure: {
            servers: {
                physical: Number,
                virtual: Number,
                cloud: Number
            },
            storage: {
                total: Number,
                used: Number,
                growth: Number
            },
            network: {
                devices: Number,
                bandwidth: Number,
                utilization: Number
            },
            endOfLife: {
                servers: Number,
                storage: Number,
                network: Number
            }
        },
        software: {
            licenses: {
                total: Number,
                used: Number,
                available: Number,
                compliance: Number
            },
            subscriptions: {
                total: Number,
                cost: Number,
                renewalDate: Date
            },
            byVendor: [{
                vendor: String,
                applications: Number,
                cost: Number
            }]
        },
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
                    cost: Number
                }],
                byEnvironment: [{
                    environment: String,
                    cost: Number
                }]
            }
        },
        portfolioMetrics: {
            totalCost: Number,
            costByCategory: [{
                category: String,
                amount: Number
            }],
            roi: Number,
            tco: Number,
            utilization: Number,
            satisfaction: Number
        },
        roadmap: [{
            initiative: String,
            category: String,
            priority: String,
            timeline: String,
            investment: Number,
            benefits: String,
            status: String
        }]
    },
    
    // IT Financial Management
    itFinancial: {
        budget: {
            total: Number,
            byCategory: [{
                category: String,
                allocated: Number,
                spent: Number,
                variance: Number
            }],
            byDepartment: [{
                department: String,
                allocated: Number,
                spent: Number,
                variance: Number
            }],
            forecast: Number
        },
        costs: {
            operational: {
                total: Number,
                breakdown: [{
                    item: String,
                    amount: Number
                }]
            },
            capital: {
                total: Number,
                breakdown: [{
                    item: String,
                    amount: Number
                }]
            },
            byProject: [{
                project: String,
                cost: Number,
                budget: Number,
                variance: Number
            }]
        },
        optimization: {
            savings: {
                total: Number,
                byInitiative: [{
                    initiative: String,
                    savings: Number
                }]
            },
            opportunities: [{
                area: String,
                potential: Number,
                effort: String,
                timeline: String
            }]
        },
        chargeback: {
            model: String,
            byDepartment: [{
                department: String,
                allocated: Number,
                actual: Number,
                variance: Number
            }]
        }
    },
    
    // Alerts
    alerts: [{
        type: {
            type: String,
            enum: ['compliance', 'security', 'performance', 'vendor', 'audit', 'budget']
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
itGovernanceDashboardSchema.index({ organization: 1, 'period.start': -1, 'period.end': -1 });
itGovernanceDashboardSchema.index({ organization: 1, 'compliance.overall.status': 1 });
itGovernanceDashboardSchema.index({ organization: 1, 'cybersecurity.posture.overall.level': 1 });

module.exports = mongoose.model('ITGovernanceDashboard', itGovernanceDashboardSchema);