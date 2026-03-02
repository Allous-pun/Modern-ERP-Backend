// src/controllers/executive/dashboard.controller.js
const Dashboard = require('../../models/executive/dashboard.model');
const KPI = require('../../models/executive/kpi.model');
const AuditLog = require('../../models/auditLog.model');

// ========== BOARD MEMBER DASHBOARDS ==========

// @desc    Get strategic dashboards (Board Member)
// @route   GET /api/executive/dashboards/strategic
// @access  Private (requires executive.dashboards_view)
const getStrategicDashboards = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const dashboards = await Dashboard.find({ 
            organization: organizationId,
            type: 'strategic',
            isActive: true
        }).sort('-createdAt');

        // If no dashboards exist, return default strategic dashboard
        if (dashboards.length === 0) {
            const defaultDashboard = {
                id: 'default-strategic',
                name: 'Strategic Overview',
                type: 'strategic',
                widgets: [
                    {
                        id: '1',
                        type: 'kpi',
                        title: 'Revenue Growth',
                        metric: 'revenue_growth',
                        period: 'quarter'
                    },
                    {
                        id: '2',
                        type: 'kpi',
                        title: 'Market Share',
                        metric: 'market_share',
                        period: 'quarter'
                    },
                    {
                        id: '3',
                        type: 'kpi',
                        title: 'Customer Satisfaction',
                        metric: 'csat',
                        period: 'month'
                    },
                    {
                        id: '4',
                        type: 'kpi',
                        title: 'Employee Engagement',
                        metric: 'engagement',
                        period: 'quarter'
                    }
                ]
            };
            
            return res.status(200).json({
                success: true,
                data: [defaultDashboard]
            });
        }

        res.status(200).json({
            success: true,
            count: dashboards.length,
            data: dashboards
        });
    } catch (error) {
        console.error('Get strategic dashboards error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch strategic dashboards'
        });
    }
};

// @desc    Get governance oversight dashboard (Chairman)
// @route   GET /api/executive/dashboards/governance
// @access  Private (requires executive.governance_view)
const getGovernanceDashboard = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const dashboard = {
            id: 'governance-dashboard',
            name: 'Governance Oversight',
            type: 'governance',
            lastUpdated: new Date(),
            metrics: {
                boardMeetings: {
                    total: 12,
                    completed: 10,
                    attendance: '92%',
                    nextMeeting: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
                },
                compliance: {
                    gdpr: 'compliant',
                    soc2: 'in_progress',
                    iso27001: 'pending',
                    lastAudit: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
                },
                riskMetrics: {
                    highRisks: 3,
                    mediumRisks: 8,
                    lowRisks: 15,
                    mitigated: 12
                },
                policies: {
                    total: 24,
                    updated: 18,
                    pendingReview: 6
                }
            },
            widgets: [
                {
                    id: '1',
                    type: 'chart',
                    title: 'Board Attendance',
                    data: [98, 95, 92, 88, 94, 92]
                },
                {
                    id: '2',
                    type: 'chart',
                    title: 'Risk Trend',
                    data: [12, 10, 8, 6, 5, 3]
                }
            ]
        };

        res.status(200).json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        console.error('Get governance dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch governance dashboard'
        });
    }
};

// @desc    Get full analytics dashboard (CEO)
// @route   GET /api/executive/dashboards/full-analytics
// @access  Private (requires executive.full_analytics)
const getFullAnalyticsDashboard = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const dashboard = {
            id: 'ceo-dashboard',
            name: 'Executive Overview',
            type: 'full_analytics',
            lastUpdated: new Date(),
            summary: {
                revenue: {
                    current: 15200000,
                    previous: 13800000,
                    growth: 10.1,
                    currency: 'USD'
                },
                profit: {
                    current: 4250000,
                    previous: 3890000,
                    growth: 9.3,
                    margin: 28.0
                },
                customers: {
                    total: 12500,
                    new: 850,
                    churn: 2.3
                },
                employees: {
                    total: 450,
                    newHires: 25,
                    turnover: 5.2
                },
                projects: {
                    active: 38,
                    completed: 12,
                    onTrack: 30,
                    atRisk: 8
                }
            },
            charts: {
                revenue: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    values: [2100, 2250, 2400, 2550, 2700, 2850]
                },
                profit: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    values: [580, 620, 670, 710, 750, 800]
                },
                customers: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    values: [11200, 11500, 11800, 12100, 12400, 12700]
                }
            }
        };

        res.status(200).json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        console.error('Get full analytics dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch full analytics dashboard'
        });
    }
};

// @desc    Get operations dashboard (COO)
// @route   GET /api/executive/dashboards/operations
// @access  Private (requires executive.operations_view)
const getOperationsDashboard = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const dashboard = {
            id: 'coo-dashboard',
            name: 'Operations Overview',
            type: 'operations',
            lastUpdated: new Date(),
            metrics: {
                efficiency: {
                    overall: 87,
                    target: 90
                },
                production: {
                    output: 15200,
                    target: 16000,
                    units: 'hours'
                },
                quality: {
                    defectRate: 2.3,
                    target: 2.0
                },
                delivery: {
                    onTime: 94,
                    target: 95
                },
                inventory: {
                    turnover: 6.5,
                    days: 45
                }
            },
            alerts: [
                {
                    id: '1',
                    severity: 'warning',
                    message: 'Production line 3 maintenance due',
                    date: new Date()
                },
                {
                    id: '2',
                    severity: 'info',
                    message: 'New supplier onboarding in progress',
                    date: new Date()
                }
            ]
        };

        res.status(200).json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        console.error('Get operations dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch operations dashboard'
        });
    }
};

module.exports = {
    getStrategicDashboards,
    getGovernanceDashboard,
    getFullAnalyticsDashboard,
    getOperationsDashboard
};