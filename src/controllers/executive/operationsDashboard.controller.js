// src/controllers/executive/operationsDashboard.controller.js
const OperationsDashboard = require('../../models/executive/operationsDashboard.model');
const ProcessEfficiency = require('../../models/executive/processEfficiency.model');
const SupplyChainMetrics = require('../../models/executive/supplyChainMetrics.model');
const { logExecutiveAction } = require('../../services/executive/auditHelper.service');
const mongoose = require('mongoose');

// Helper function to get user ID from req.user
const getUserId = (req) => {
    return req.user?.memberId || req.user?.id || req.user?._id;
};

/**
 * @desc    Get operations dashboard
 * @route   GET /api/executive/operations/dashboard
 * @access  Private (COO, CEO)
 */
const getOperationsDashboard = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { type = 'daily', date } = req.query;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        // Calculate date range
        const dateRange = calculateDateRange(type, date);
        
        // Get or generate dashboard
        let dashboard = await OperationsDashboard.findOne({
            organization: req.organization.id,
            type,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        }).populate('createdBy', 'personalInfo firstName personalInfo lastName email');
        
        // If not found, generate new dashboard
        if (!dashboard) {
            dashboard = await generateOperationsDashboard(
                req.organization.id, 
                type, 
                dateRange, 
                userId
            );
        }
        
        // Apply settings to dashboard (currency formatting, etc.)
        const enhancedDashboard = applySettingsToDashboard(dashboard, req.settings);
        
        // Check for alerts
        const alerts = await checkOperationalAlerts(req.organization.id, dashboard);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'operations_dashboard',
            targetId: dashboard._id,
            description: `Viewed operations dashboard for ${type}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: {
                dashboard: enhancedDashboard,
                alerts
            }
        });
        
    } catch (error) {
        console.error('Get operations dashboard error:', error);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'operations_dashboard',
            description: 'Failed to view operations dashboard',
            success: false,
            error
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to fetch operations dashboard'
        });
    }
};

/**
 * @desc    Get operational KPIs
 * @route   GET /api/executive/operations/kpis
 * @access  Private (COO)
 */
const getOperationalKPIs = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { department, period = 'daily' } = req.query;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const dateRange = calculateDateRange(period);
        
        const dashboard = await OperationsDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        let kpis = dashboard ? dashboard.kpis : {};
        
        // Apply settings to KPIs
        kpis = applySettingsToKPIs(kpis, req.settings);
        
        // Filter by department if specified
        if (department && kpis.departments) {
            kpis = kpis.departments.find(d => d.name === department) || {};
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'operational_kpis',
            description: `Viewed operational KPIs${department ? ` for ${department}` : ''}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: kpis
        });
        
    } catch (error) {
        console.error('Get operational KPIs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch operational KPIs'
        });
    }
};

/**
 * @desc    Get process efficiency metrics
 * @route   GET /api/executive/operations/process-efficiency
 * @access  Private (COO)
 */
const getProcessEfficiency = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { processId, category } = req.query;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        let query = { organization: req.organization.id, isActive: true };
        
        if (processId) {
            query._id = processId;
        }
        if (category) {
            query.category = category;
        }
        
        const processes = await ProcessEfficiency.find(query)
            .populate('owner', 'personalInfo firstName personalInfo lastName email')
            .sort({ processName: 1 });
        
        // Apply settings to processes (currency formatting for costs)
        const enhancedProcesses = processes.map(process => 
            applySettingsToProcess(process, req.settings)
        );
        
        // Identify bottlenecks
        const bottlenecks = enhancedProcesses.flatMap(p => 
            p.bottlenecks?.filter(b => b.severity === 'critical' || b.severity === 'high') || []
        );
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'process_efficiency',
            description: 'Viewed process efficiency metrics',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            count: enhancedProcesses.length,
            data: enhancedProcesses,
            bottlenecks
        });
        
    } catch (error) {
        console.error('Get process efficiency error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch process efficiency metrics'
        });
    }
};

/**
 * @desc    Get supply chain metrics
 * @route   GET /api/executive/operations/supply-chain
 * @access  Private (COO)
 */
const getSupplyChainMetrics = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { period = 'monthly' } = req.query;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const dateRange = calculateDateRange(period);
        
        let metrics = await SupplyChainMetrics.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        if (!metrics) {
            metrics = await generateSupplyChainMetrics(
                req.organization.id,
                dateRange,
                userId
            );
        }
        
        // Apply settings to metrics (currency formatting)
        const enhancedMetrics = applySettingsToSupplyChain(metrics, req.settings);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'supply_chain_metrics',
            description: 'Viewed supply chain metrics',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: enhancedMetrics
        });
        
    } catch (error) {
        console.error('Get supply chain metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch supply chain metrics'
        });
    }
};

/**
 * @desc    Get production metrics
 * @route   GET /api/executive/operations/production
 * @access  Private (COO)
 */
const getProductionMetrics = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { line, period = 'daily' } = req.query;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const dateRange = calculateDateRange(period);
        
        const dashboard = await OperationsDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        let production = dashboard ? dashboard.production : {};
        
        // Filter by line if specified
        if (line && production.lines) {
            production = production.lines.find(l => l.name === line) || production;
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'production_metrics',
            description: 'Viewed production metrics',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: production
        });
        
    } catch (error) {
        console.error('Get production metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch production metrics'
        });
    }
};

/**
 * @desc    Get quality metrics
 * @route   GET /api/executive/operations/quality
 * @access  Private (COO)
 */
const getQualityMetrics = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { product, period = 'monthly' } = req.query;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const dateRange = calculateDateRange(period);
        
        const dashboard = await OperationsDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        let quality = dashboard ? dashboard.quality : {};
        
        // Filter by product if specified
        if (product && quality.byProduct) {
            quality = quality.byProduct.find(p => p.product === product) || quality;
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'quality_metrics',
            description: 'Viewed quality metrics',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: quality
        });
        
    } catch (error) {
        console.error('Get quality metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quality metrics'
        });
    }
};

/**
 * @desc    Get resource utilization
 * @route   GET /api/executive/operations/resources
 * @access  Private (COO)
 */
const getResourceUtilization = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { type } = req.query; // equipment, labor, facilities
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const dateRange = calculateDateRange('daily');
        
        const dashboard = await OperationsDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        let resources = dashboard ? dashboard.resources : {};
        
        if (type && resources[type]) {
            resources = resources[type];
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'resource_utilization',
            description: 'Viewed resource utilization',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: resources
        });
        
    } catch (error) {
        console.error('Get resource utilization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch resource utilization'
        });
    }
};

/**
 * @desc    Get operational costs
 * @route   GET /api/executive/operations/costs
 * @access  Private (COO, CFO)
 */
const getOperationalCosts = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { period = 'monthly' } = req.query;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const dateRange = calculateDateRange(period);
        
        const dashboard = await OperationsDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        let costs = dashboard ? dashboard.operationalCosts : {
            total: 0,
            byCategory: [],
            perUnit: 0,
            trends: { daily: [], monthly: [] }
        };
        
        // Apply currency formatting
        costs = applySettingsToCosts(costs, req.settings);
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'operational_costs',
            description: 'Viewed operational costs',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: costs
        });
        
    } catch (error) {
        console.error('Get operational costs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch operational costs'
        });
    }
};

/**
 * @desc    Get operational alerts
 * @route   GET /api/executive/operations/alerts
 * @access  Private (COO)
 */
const getOperationalAlerts = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { severity, resolved } = req.query;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const dateRange = calculateDateRange('daily');
        
        const dashboard = await OperationsDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        let alerts = dashboard ? dashboard.alerts || [] : [];
        
        // Apply filters
        if (severity) {
            alerts = alerts.filter(a => a.severity === severity);
        }
        if (resolved !== undefined) {
            alerts = alerts.filter(a => a.resolved === (resolved === 'true'));
        }
        
        // Sort by severity and timestamp
        alerts.sort((a, b) => {
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity] || 
                   new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        res.status(200).json({
            success: true,
            count: alerts.length,
            data: alerts
        });
        
    } catch (error) {
        console.error('Get operational alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch operational alerts'
        });
    }
};

/**
 * @desc    Acknowledge alert
 * @route   PUT /api/executive/operations/alerts/:alertId/acknowledge
 * @access  Private (COO)
 */
const acknowledgeAlert = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { alertId } = req.params;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const dateRange = calculateDateRange('daily');
        
        const dashboard = await OperationsDashboard.findOne({
            organization: req.organization.id,
            'period.start': dateRange.start,
            'period.end': dateRange.end
        });
        
        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard not found'
            });
        }
        
        const alert = dashboard.alerts.id(alertId);
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }
        
        alert.acknowledged = {
            by: userId,
            at: new Date()
        };
        
        await dashboard.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'operational_alert',
            targetId: alertId,
            description: `Acknowledged alert: ${alert.message}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            message: 'Alert acknowledged successfully'
        });
        
    } catch (error) {
        console.error('Acknowledge alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to acknowledge alert'
        });
    }
};

/**
 * @desc    Create process efficiency record
 * @route   POST /api/executive/operations/process-efficiency
 * @access  Private (COO)
 */
const createProcessEfficiency = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const processData = req.body;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const process = new ProcessEfficiency({
            organization: req.organization.id,
            ...processData,
            createdBy: userId,
            lastAnalyzed: new Date()
        });
        
        await process.save();
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'process_efficiency',
            targetId: process._id,
            targetName: process.processName,
            changes: processData,
            description: `Created process efficiency record: ${process.processName}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(201).json({
            success: true,
            data: process,
            message: 'Process efficiency record created successfully'
        });
        
    } catch (error) {
        console.error('Create process efficiency error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create process efficiency record'
        });
    }
};

/**
 * @desc    Update process efficiency
 * @route   PUT /api/executive/operations/process-efficiency/:id
 * @access  Private (COO)
 */
const updateProcessEfficiency = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { id } = req.params;
        
        // Get user ID safely
        const userId = getUserId(req);
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        
        const process = await ProcessEfficiency.findOne({
            _id: id,
            organization: req.organization.id
        });
        
        if (!process) {
            return res.status(404).json({
                success: false,
                message: 'Process not found'
            });
        }
        
        // Store old values for audit
        const oldValues = {
            cycleTime: process.cycleTime,
            efficiency: process.efficiency,
            quality: process.quality
        };
        
        // Update
        Object.assign(process, req.body);
        process.updatedBy = userId;
        process.lastAnalyzed = new Date();
        
        await process.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'process_efficiency',
            targetId: process._id,
            targetName: process.processName,
            changes: {
                before: oldValues,
                after: {
                    cycleTime: process.cycleTime,
                    efficiency: process.efficiency,
                    quality: process.quality
                }
            },
            description: `Updated process efficiency: ${process.processName}`,
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.status(200).json({
            success: true,
            data: process,
            message: 'Process efficiency updated successfully'
        });
        
    } catch (error) {
        console.error('Update process efficiency error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update process efficiency'
        });
    }
};

// ==================== HELPER FUNCTIONS ====================

function calculateDateRange(type, referenceDate = new Date()) {
    const date = new Date(referenceDate);
    const start = new Date(date);
    const end = new Date(date);
    
    switch(type) {
        case 'daily':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'weekly':
            start.setDate(date.getDate() - date.getDay());
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        case 'monthly':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'quarterly':
            const quarter = Math.floor(date.getMonth() / 3);
            start.setMonth(quarter * 3, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(quarter * 3 + 3, 0);
            end.setHours(23, 59, 59, 999);
            break;
    }
    
    return { start, end };
}

async function generateOperationsDashboard(organizationId, type, dateRange, memberId) {
    // This would aggregate data from various operational systems
    // For now, return a template structure
    
    const dashboard = new OperationsDashboard({
        organization: organizationId,
        name: `Operations Dashboard - ${type}`,
        type,
        period: dateRange,
        kpis: {
            overall: {
                efficiency: { value: 85, target: 90, trend: { direction: 'up', percentage: 2 }, status: 'good' },
                productivity: { value: 92, target: 95, trend: 'up', status: 'excellent' },
                quality: { value: 98, target: 99, trend: 'stable', status: 'good' },
                utilization: { value: 78, target: 85, trend: 'down', status: 'average' }
            },
            departments: [
                {
                    name: 'Production',
                    metrics: {
                        efficiency: 88,
                        productivity: 94,
                        quality: 97,
                        utilization: 82,
                        costPerUnit: 12.50,
                        cycleTime: 45
                    }
                },
                {
                    name: 'Warehouse',
                    metrics: {
                        efficiency: 82,
                        productivity: 89,
                        quality: 99,
                        utilization: 75,
                        costPerUnit: 3.20,
                        cycleTime: 15
                    }
                }
            ]
        },
        processEfficiency: {
            overall: {
                cycleTime: 60,
                throughput: 1000,
                defectRate: 2.5,
                firstPassYield: 95,
                oee: 82
            },
            processes: []
        },
        supplyChain: {
            inventory: {
                turnover: 6.5,
                daysOnHand: 45,
                accuracy: 98,
                value: 2500000,
                slowMoving: 5,
                deadStock: 2
            },
            suppliers: {
                total: 50,
                active: 45,
                performance: {
                    onTimeDelivery: 94,
                    quality: 97,
                    cost: 85,
                    leadTime: 12
                }
            },
            logistics: {
                shipping: {
                    onTime: 96,
                    cost: 15000,
                    damageRate: 0.5
                },
                warehouse: {
                    utilization: 82,
                    accuracy: 99,
                    productivity: 95
                }
            }
        },
        production: {
            output: {
                total: 25000,
                planned: 26000,
                achieved: 25000,
                variance: -3.8
            },
            efficiency: {
                oee: 82,
                availability: 90,
                performance: 92,
                quality: 98
            },
            downtime: {
                total: 120,
                planned: 80,
                unplanned: 40,
                mttr: 2.5,
                mtbf: 120
            },
            lines: [
                {
                    name: 'Line A',
                    output: 10000,
                    efficiency: 85,
                    status: 'running',
                    nextMaintenance: new Date(Date.now() + 7*24*60*60*1000)
                },
                {
                    name: 'Line B',
                    output: 8000,
                    efficiency: 78,
                    status: 'running',
                    nextMaintenance: new Date(Date.now() + 14*24*60*60*1000)
                }
            ]
        },
        quality: {
            overall: {
                defectRate: 2.5,
                customerComplaints: 5,
                returns: 1.2,
                warranty: 0.8
            },
            byProduct: [],
            byProcess: [],
            inspections: {
                total: 500,
                passed: 485,
                failed: 15,
                rate: 97
            }
        },
        resources: {
            equipment: {
                total: 50,
                available: 45,
                inUse: 40,
                maintenance: 3,
                utilization: 82
            },
            labor: {
                total: 200,
                scheduled: 180,
                actual: 175,
                overtime: 15,
                productivity: 92
            },
            facilities: {
                utilization: 85,
                capacity: 100000,
                maintenance: []
            }
        },
        operationalCosts: {
            total: 150000,
            byCategory: [
                { category: 'Labor', amount: 80000, budget: 75000, variance: 6.7 },
                { category: 'Materials', amount: 50000, budget: 52000, variance: -3.8 },
                { category: 'Overhead', amount: 20000, budget: 18000, variance: 11.1 }
            ],
            perUnit: 6.00,
            trends: {
                daily: [],
                monthly: []
            }
        },
        alerts: [],
        createdBy: memberId
    });
    
    // Generate some sample alerts
    dashboard.alerts.push({
        type: 'performance',
        severity: 'warning',
        message: 'Production Line B efficiency below target',
        metric: 'efficiency',
        value: 78,
        threshold: 85,
        timestamp: new Date()
    });
    
    dashboard.alerts.push({
        type: 'inventory',
        severity: 'info',
        message: 'Slow-moving inventory increased by 2%',
        metric: 'slowMoving',
        value: 5,
        threshold: 4,
        timestamp: new Date()
    });
    
    await dashboard.save();
    return dashboard;
}

async function generateSupplyChainMetrics(organizationId, dateRange, memberId) {
    // Create the metrics object step by step
    const metricsData = {
        organization: organizationId,
        period: dateRange,
        inventory: {
            total: { value: 2500000, units: 50000 },
            metrics: {
                turnover: 6.5,
                daysOnHand: 45,
                accuracy: 98,
                obsolescence: 3,
                slowMoving: 5,
                deadStock: 2,
                stockouts: 3
            }
        },
        suppliers: {
            total: 50,
            active: 45,
            performance: {
                overall: 92,
                bySupplier: []
            },
            compliance: {
                certified: 40,
                audited: 35,
                nonCompliant: 5
            }
        },
        procurement: {
            spend: {
                total: 1500000,
                byCategory: [
                    { category: 'Raw Materials', amount: 800000, percentage: 53.3 },
                    { category: 'Components', amount: 500000, percentage: 33.3 },
                    { category: 'Services', amount: 200000, percentage: 13.4 }
                ]
            }
        },
        demand: {
            forecast: {
                accuracy: 88,
                bias: 2,
                mape: 12
            },
            planning: {
                coverage: 95,
                serviceLevel: 97,
                fillRate: 96,
                backlog: 500
            }
        },
        generatedBy: memberId
    };

    // Add logistics separately
    metricsData.logistics = {
        transportation: {
            modes: [
                { type: 'Truck', volume: 40000, cost: 200000, transitTime: 3 },
                { type: 'Air', volume: 5000, cost: 150000, transitTime: 1 },
                { type: 'Ocean', volume: 5000, cost: 50000, transitTime: 14 }
            ],
            metrics: {
                costPerUnit: 12.5,
                costPerMile: 2.8,
                fuelEfficiency: 6.5,
                utilization: 82
            }
        },
        warehousing: {
            facilities: [
                {
                    name: 'Main Warehouse',
                    capacity: 50000,
                    utilization: 82,
                    accuracy: 99,
                    productivity: 95
                }
            ],
            operations: {
                receiving: { volume: 1250, cycleTime: 4.5 },
                putaway: { volume: 1220, cycleTime: 3.2 },
                picking: { volume: 3850, accuracy: 99.1, cycleTime: 5.8 },
                packing: { volume: 3820, cycleTime: 4.2 },
                shipping: { volume: 3800, accuracy: 99.3, cycleTime: 3.5 }
            },
            costs: { 
                perUnit: 4.25, 
                labor: 45000, 
                space: 18500, 
                equipment: 12200 
            }
        }
    };

    const metrics = new SupplyChainMetrics(metricsData);
    await metrics.save();
    return metrics;
}

async function checkOperationalAlerts(organizationId, dashboard) {
    const alerts = [];
    
    // Check efficiency
    if (dashboard.kpis?.overall?.efficiency?.value < dashboard.kpis?.overall?.efficiency?.target * 0.9) {
        alerts.push({
            type: 'performance',
            severity: 'critical',
            message: 'Overall efficiency critically low',
            metric: 'efficiency',
            value: dashboard.kpis.overall.efficiency.value,
            threshold: dashboard.kpis.overall.efficiency.target
        });
    }
    
    // Check production lines
    if (dashboard.production?.lines) {
        dashboard.production.lines.forEach(line => {
            if (line.status === 'down') {
                alerts.push({
                    type: 'downtime',
                    severity: 'critical',
                    message: `Production line ${line.name} is down`,
                    metric: 'status',
                    value: line.status
                });
            } else if (line.efficiency < 75) {
                alerts.push({
                    type: 'performance',
                    severity: 'warning',
                    message: `Line ${line.name} efficiency low`,
                    metric: 'efficiency',
                    value: line.efficiency,
                    threshold: 75
                });
            }
        });
    }
    
    // Check inventory
    if (dashboard.supplyChain?.inventory?.slowMoving > 10) {
        alerts.push({
            type: 'inventory',
            severity: 'warning',
            message: 'High slow-moving inventory',
            metric: 'slowMoving',
            value: dashboard.supplyChain.inventory.slowMoving,
            threshold: 10
        });
    }
    
    // Check quality
    if (dashboard.quality?.overall?.defectRate > 5) {
        alerts.push({
            type: 'quality',
            severity: 'critical',
            message: 'Defect rate exceeds threshold',
            metric: 'defectRate',
            value: dashboard.quality.overall.defectRate,
            threshold: 5
        });
    }
    
    // Update dashboard with new alerts
    if (alerts.length > 0) {
        dashboard.alerts = [...alerts, ...(dashboard.alerts || [])].slice(0, 50);
        await dashboard.save();
    }
    
    return alerts;
}

// Settings helper functions
function applySettingsToDashboard(dashboard, settings) {
    if (!dashboard || !settings) return dashboard;
    
    const dashboardObj = dashboard.toObject ? dashboard.toObject() : dashboard;
    
    // Add currency info
    dashboardObj.currency = settings.baseCurrency || 'USD';
    dashboardObj.dateFormat = settings.dateFormat || 'DD/MM/YYYY';
    
    return dashboardObj;
}

function applySettingsToKPIs(kpis, settings) {
    if (!kpis || !settings) return kpis;
    
    const kpisObj = { ...kpis };
    
    // Add currency info to cost-related KPIs
    if (kpisObj.departments) {
        kpisObj.departments = kpisObj.departments.map(dept => ({
            ...dept,
            currency: settings.baseCurrency || 'USD'
        }));
    }
    
    return kpisObj;
}

function applySettingsToProcess(process, settings) {
    if (!process || !settings) return process;
    
    const processObj = process.toObject ? process.toObject() : process;
    
    // Add currency info to costs
    if (processObj.costs) {
        processObj.costs.currency = settings.baseCurrency || 'USD';
    }
    
    return processObj;
}

function applySettingsToSupplyChain(metrics, settings) {
    if (!metrics || !settings) return metrics;
    
    const metricsObj = metrics.toObject ? metrics.toObject() : metrics;
    
    // Add currency info to financial metrics
    metricsObj.currency = settings.baseCurrency || 'USD';
    
    return metricsObj;
}

function applySettingsToCosts(costs, settings) {
    if (!costs || !settings) return costs;
    
    const costsObj = { ...costs };
    
    // Add currency info
    costsObj.currency = settings.baseCurrency || 'USD';
    
    if (costsObj.byCategory) {
        costsObj.byCategory = costsObj.byCategory.map(cat => ({
            ...cat,
            currency: settings.baseCurrency || 'USD'
        }));
    }
    
    return costsObj;
}

module.exports = {
    getOperationsDashboard,
    getOperationalKPIs,
    getProcessEfficiency,
    getSupplyChainMetrics,
    getProductionMetrics,
    getQualityMetrics,
    getResourceUtilization,
    getOperationalCosts,
    getOperationalAlerts,
    acknowledgeAlert,
    createProcessEfficiency,
    updateProcessEfficiency
};