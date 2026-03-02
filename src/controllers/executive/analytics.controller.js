// src/controllers/executive/analytics.controller.js
const Metric = require('../../models/executive/metric.model');
const KPI = require('../../models/executive/kpi.model');
const Report = require('../../models/executive/report.model');

// ========== FINANCIAL OVERSIGHT (CFO) ==========

// @desc    Get financial analytics
// @route   GET /api/executive/analytics/financial
// @access  Private (requires executive.financial_oversight)
const getFinancialAnalytics = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { period = 'quarter', year = new Date().getFullYear() } = req.query;

        const analytics = {
            summary: {
                revenue: {
                    current: 15200000,
                    previous: 13800000,
                    growth: 10.1,
                    forecast: 16500000
                },
                expenses: {
                    current: 10950000,
                    previous: 9910000,
                    growth: 10.5,
                    breakdown: {
                        payroll: 5200000,
                        operations: 2850000,
                        marketing: 1450000,
                        rnd: 950000,
                        other: 500000
                    }
                },
                profit: {
                    gross: 4250000,
                    net: 3120000,
                    margin: 20.5,
                    ebitda: 4780000
                },
                cashflow: {
                    operating: 3850000,
                    investing: -1250000,
                    financing: -800000,
                    net: 1800000
                },
                balance: {
                    assets: 28400000,
                    liabilities: 12300000,
                    equity: 16100000,
                    ratio: 2.3
                }
            },
            trends: {
                revenue: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    values: [2100, 2250, 2400, 2550, 2700, 2850]
                },
                profit: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    values: [580, 620, 670, 710, 750, 800]
                },
                cash: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    values: [3200, 3350, 3500, 3650, 3800, 3950]
                }
            },
            kpis: [
                {
                    name: 'Revenue Growth',
                    value: 10.1,
                    target: 12,
                    status: 'warning'
                },
                {
                    name: 'Profit Margin',
                    value: 20.5,
                    target: 22,
                    status: 'warning'
                },
                {
                    name: 'ROI',
                    value: 15.3,
                    target: 15,
                    status: 'success'
                },
                {
                    name: 'Debt/Equity',
                    value: 0.76,
                    target: 0.8,
                    status: 'success'
                }
            ]
        };

        res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Get financial analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch financial analytics'
        });
    }
};

// ========== TECHNOLOGY OVERSIGHT (CTO) ==========

// @desc    Get technology analytics
// @route   GET /api/executive/analytics/technology
// @access  Private (requires executive.technology_view)
const getTechnologyAnalytics = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const analytics = {
            infrastructure: {
                uptime: '99.95%',
                incidents: 3,
                mtbf: 720,
                mttr: 1.5,
                resources: {
                    cpu: 65,
                    memory: 72,
                    storage: 58,
                    network: 43
                }
            },
            security: {
                threats: 1245,
                blocked: 1238,
                breaches: 0,
                patching: '97%',
                compliance: 'A'
            },
            development: {
                velocity: 45,
                quality: 92,
                coverage: 78,
                debt: 125,
                deployments: 24
            },
            projects: {
                active: 18,
                completed: 7,
                onTrack: 14,
                atRisk: 3,
                delayed: 1
            },
            costs: {
                cloud: 245000,
                licenses: 89000,
                hardware: 125000,
                personnel: 1850000,
                total: 2309000
            }
        };

        res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Get technology analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch technology analytics'
        });
    }
};

// ========== IT GOVERNANCE (CIO) ==========

// @desc    Get IT governance analytics
// @route   GET /api/executive/analytics/it-governance
// @access  Private (requires executive.it_governance)
const getITGovernanceAnalytics = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const analytics = {
            strategy: {
                alignment: 85,
                maturity: 3.5,
                roadmap: {
                    current: 68,
                    nextQuarter: 15,
                    nextYear: 17
                }
            },
            policies: {
                total: 42,
                compliant: 38,
                exceptions: 4,
                lastReview: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
            },
            audit: {
                lastAudit: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
                score: 94,
                findings: 8,
                critical: 0,
                high: 2,
                medium: 4,
                low: 2
            },
            portfolio: {
                applications: 87,
                supported: 82,
                endOfLife: 5,
                satisfaction: 82
            },
            budget: {
                allocated: 4500000,
                spent: 4120000,
                variance: 8.4,
                projects: 1850000,
                operations: 2270000
            }
        };

        res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Get IT governance analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch IT governance analytics'
        });
    }
};

// ========== RISK MANAGEMENT (CRO) ==========

// @desc    Get risk analytics
// @route   GET /api/executive/analytics/risk
// @access  Private (requires executive.risk_view)
const getRiskAnalytics = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const analytics = {
            overview: {
                totalRisks: 87,
                critical: 8,
                high: 15,
                medium: 32,
                low: 32,
                mitigated: 42,
                accepted: 18,
                transferred: 12,
                avoided: 15
            },
            byCategory: {
                operational: 35,
                financial: 22,
                strategic: 15,
                compliance: 10,
                reputational: 5
            },
            trends: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                identified: [12, 15, 10, 18, 14, 18],
                mitigated: [8, 10, 7, 12, 9, 13]
            },
            topRisks: [
                {
                    id: '1',
                    title: 'Data Breach',
                    severity: 'critical',
                    likelihood: 'medium',
                    impact: 'high',
                    owner: 'CISO'
                },
                {
                    id: '2',
                    title: 'Market Volatility',
                    severity: 'high',
                    likelihood: 'high',
                    impact: 'high',
                    owner: 'CFO'
                },
                {
                    id: '3',
                    title: 'Regulatory Change',
                    severity: 'high',
                    likelihood: 'medium',
                    impact: 'medium',
                    owner: 'Legal'
                }
            ]
        };

        res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Get risk analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch risk analytics'
        });
    }
};

// ========== HR OVERSIGHT (CHRO) ==========

// @desc    Get HR analytics
// @route   GET /api/executive/analytics/hr
// @access  Private (requires executive.hr_oversight)
const getHRAnalytics = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const analytics = {
            workforce: {
                total: 450,
                fullTime: 385,
                partTime: 45,
                contractors: 20,
                growth: 8.5
            },
            demographics: {
                byDepartment: {
                    engineering: 120,
                    sales: 85,
                    marketing: 45,
                    hr: 15,
                    finance: 25,
                    operations: 160
                },
                byTenure: {
                    '<1 year': 95,
                    '1-3 years': 180,
                    '3-5 years': 105,
                    '5+ years': 70
                },
                byAge: {
                    '20-30': 150,
                    '30-40': 185,
                    '40-50': 85,
                    '50+': 30
                }
            },
            turnover: {
                rate: 12.5,
                voluntary: 8.2,
                involuntary: 4.3,
                byDepartment: {
                    engineering: 8,
                    sales: 15,
                    operations: 12
                }
            },
            engagement: {
                score: 78,
                participation: 92,
                trends: [75, 76, 77, 78, 78, 78]
            },
            talent: {
                openPositions: 24,
                applicants: 580,
                timeToHire: 32,
                offerAcceptance: 86,
                internalHires: 18
            },
            diversity: {
                gender: {
                    male: 58,
                    female: 41,
                    other: 1
                },
                ethnicity: {
                    asian: 22,
                    black: 15,
                    hispanic: 12,
                    white: 45,
                    other: 6
                },
                leadership: {
                    gender: '45/55',
                    diversity: 32
                }
            }
        };

        res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Get HR analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch HR analytics'
        });
    }
};

module.exports = {
    getFinancialAnalytics,
    getTechnologyAnalytics,
    getITGovernanceAnalytics,
    getRiskAnalytics,
    getHRAnalytics
};