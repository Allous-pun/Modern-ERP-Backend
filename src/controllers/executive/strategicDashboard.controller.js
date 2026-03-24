// src/controllers/executive/strategicDashboard.controller.js
const mongoose = require('mongoose');
const StrategicDashboard = require('../../models/executive/strategicDashboard.model');
const StrategicPlan = require('../../models/executive/strategicPlan.model');
const StrategicObjective = require('../../models/executive/strategicObjective.model');
const StrategicInitiative = require('../../models/executive/strategicInitiative.model');
const OrganizationSettings = require('../../models/organizationSettings.model');
const { logExecutiveAction } = require('../../services/executive/auditHelper.service');

// ============================================
// HELPER FUNCTIONS (ALL LOGIC HERE)
// ============================================

/**
 * Parse composite KPI ID
 * Format: dashboardId:categoryName:kpiKey
 * The dashboardId is a 24-character MongoDB ObjectId
 * Using colon as separator to avoid conflicts with underscores in names
 */
function parseKPIId(id) {
    // Split by colon
    const parts = id.split(':');
    
    if (parts.length !== 3) {
        throw new Error('Invalid KPI ID format: expected dashboardId:categoryName:kpiKey');
    }
    
    const dashboardId = parts[0];
    const categoryName = parts[1];
    const kpiKey = parts[2];
    
    // Validate dashboardId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(dashboardId)) {
        throw new Error('Invalid dashboard ID format');
    }
    
    return { dashboardId, categoryName, kpiKey };
}

/**
 * Fetch fresh planning data
 */
async function fetchPlanningData(organizationId) {
    const currentPlan = await StrategicPlan.findOne({
        organization: organizationId,
        'period.isCurrent': true,
        isActive: true
    }).lean();
    
    if (!currentPlan) {
        return { plan: null, objectives: [], initiatives: [] };
    }
    
    const [objectives, initiatives] = await Promise.all([
        StrategicObjective.find({
            organization: organizationId,
            strategicPlan: currentPlan._id,
            isActive: true
        }).lean(),
        StrategicInitiative.find({
            organization: organizationId,
            strategicPlan: currentPlan._id,
            isActive: true
        }).lean()
    ]);
    
    return { plan: currentPlan, objectives, initiatives };
}

/**
 * Calculate KPI value from planning data
 */
function calculateKPIValue(kpiConfig, planningData) {
    const { type, sourceId, field, aggregation } = kpiConfig.dataSource || {};
    
    if (!type || type === 'manual') {
        return kpiConfig.value || 0;
    }
    
    switch (type) {
        case 'financial':
            if (planningData.plan?.financialPlan) {
                return getNestedValue(planningData.plan.financialPlan, field) || 0;
            }
            break;
            
        case 'strategic_objective':
            if (sourceId) {
                const objective = planningData.objectives.find(o => o._id.toString() === sourceId);
                return getNestedValue(objective, field) || 0;
            } else if (aggregation === 'avg') {
                const values = planningData.objectives.map(o => getNestedValue(o, field) || 0);
                return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            }
            break;
            
        case 'strategic_initiative':
            if (sourceId) {
                const initiative = planningData.initiatives.find(i => i._id.toString() === sourceId);
                return getNestedValue(initiative, field) || 0;
            } else if (aggregation === 'avg') {
                const values = planningData.initiatives.map(i => getNestedValue(i, field) || 0);
                return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            }
            break;
            
        case 'okr':
            if (planningData.plan?.okrs) {
                const okrs = planningData.plan.okrs;
                const progress = okrs.reduce((sum, okr) => sum + (okr.progress || 0), 0);
                return okrs.length ? progress / okrs.length : 0;
            }
            break;
    }
    
    return kpiConfig.value || 0;
}

/**
 * Calculate KPI target
 */
function calculateKPITarget(kpiConfig, planningData) {
    if (kpiConfig.target) return kpiConfig.target;
    
    const { type, sourceId, field } = kpiConfig.dataSource || {};
    const targetField = field?.replace('current', 'target') || `${field}_target`;
    
    switch (type) {
        case 'strategic_objective':
            if (sourceId) {
                const objective = planningData.objectives.find(o => o._id.toString() === sourceId);
                return getNestedValue(objective, targetField) || 100;
            }
            break;
        case 'strategic_initiative':
            if (sourceId) {
                const initiative = planningData.initiatives.find(i => i._id.toString() === sourceId);
                return getNestedValue(initiative, targetField) || 100;
            }
            break;
    }
    
    return 100;
}

/**
 * Calculate status based on value and target
 */
function calculateStatus(value, target) {
    if (!target || target === 0) return 'on_track';
    const percentage = (value / target) * 100;
    if (percentage >= 100) return 'completed';
    if (percentage >= 75) return 'on_track';
    if (percentage >= 50) return 'at_risk';
    return 'behind';
}

/**
 * Calculate trend
 */
function calculateTrend(newValue, history) {
    if (!history || history.length === 0) return null;
    const oldValue = history[history.length - 1]?.value;
    if (!oldValue) return null;
    const change = ((newValue - oldValue) / oldValue) * 100;
    return {
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        percentage: Math.abs(change)
    };
}

/**
 * Get nested value from object
 */
function getNestedValue(obj, path) {
    if (!obj || !path) return null;
    return path.split('.').reduce((current, key) => {
        const arrayMatch = key.match(/(\w+)\[(\d+)\]/);
        if (arrayMatch) {
            const [, arrayKey, index] = arrayMatch;
            return current?.[arrayKey]?.[parseInt(index)];
        }
        return current?.[key];
    }, obj);
}

/**
 * Update dashboard with fresh planning data
 */
async function updateDashboardWithPlanningData(dashboard, planningData, settings) {
    const updatedCategories = [];
    
    for (const category of dashboard.categories) {
        const updatedKPIs = [];
        
        for (const kpi of category.kpis) {
            const newValue = calculateKPIValue(kpi, planningData);
            const newTarget = calculateKPITarget(kpi, planningData);
            const newStatus = calculateStatus(newValue, newTarget);
            
            const history = [...(kpi.history || [])];
            if (kpi.value !== undefined && kpi.value !== newValue) {
                history.push({
                    date: new Date(),
                    value: kpi.value
                });
                if (history.length > 12) history.shift();
            }
            
            const trend = calculateTrend(newValue, history);
            
            updatedKPIs.push({
                ...kpi.toObject(),
                value: newValue,
                target: newTarget,
                status: newStatus,
                trend,
                lastUpdated: new Date(),
                history
            });
        }
        
        updatedCategories.push({
            ...category.toObject(),
            kpis: updatedKPIs
        });
    }
    
    return updatedCategories;
}

/**
 * Create default dashboard categories
 */
function getDefaultCategories(settings) {
    const currency = settings?.baseCurrency || 'USD';
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    
    return [
        {
            name: 'Financial Performance',
            order: 1,
            kpis: [
                {
                    name: 'Revenue',
                    key: 'revenue',
                    dataSource: { type: 'financial', field: 'revenue.target[0].amount' },
                    unit: symbol,
                    value: 0,
                    target: 0,
                    history: []
                },
                {
                    name: 'Profit Margin',
                    key: 'profit_margin',
                    dataSource: { type: 'financial', field: 'profit.target[0].margin' },
                    unit: '%',
                    value: 0,
                    target: 0,
                    history: []
                }
            ]
        },
        {
            name: 'Strategic Progress',
            order: 2,
            kpis: [
                {
                    name: 'Strategic Objectives Progress',
                    key: 'objectives_progress',
                    dataSource: {
                        type: 'strategic_objective',
                        aggregation: 'avg',
                        field: 'progress.overall'
                    },
                    unit: '%',
                    value: 0,
                    target: 100,
                    history: []
                },
                {
                    name: 'Initiatives On Track',
                    key: 'initiatives_on_track',
                    dataSource: {
                        type: 'strategic_initiative',
                        aggregation: 'count',
                        field: '_id',
                        filters: { status: { $in: ['in_progress', 'completed'] }, 'health.overall': 'green' }
                    },
                    unit: 'count',
                    value: 0,
                    target: 0,
                    history: []
                }
            ]
        },
        {
            name: 'Market Position',
            order: 3,
            kpis: [
                {
                    name: 'Market Share',
                    key: 'market_share',
                    dataSource: { type: 'financial', field: 'marketAnalysis.marketShare.current' },
                    unit: '%',
                    value: 0,
                    target: 0,
                    history: []
                }
            ]
        }
    ];
}

/**
 * Create default dashboard
 */
async function createDefaultDashboard(req, settings) {
    const userId = req.member?._id || req.user?.memberId || req.user?._id;
    
    const dashboard = new StrategicDashboard({
        organization: req.organization.id,
        name: 'Strategic Dashboard',
        description: 'Board-level strategic dashboard',
        type: 'board',
        categories: getDefaultCategories(settings),
        createdBy: userId,
        settings: {
            theme: 'light',
            defaultView: 'grid',
            favorite: true
        }
    });
    
    await dashboard.save();
    return dashboard;
}

// ============================================
// DASHBOARD ENDPOINTS
// ============================================

/**
 * GET /api/executive/strategic/dashboard
 */
const getStrategicDashboard = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const settings = req.settings;
        
        let dashboard = await StrategicDashboard.findOne({
            organization: req.organization.id,
            type: 'board',
            isActive: true
        });
        
        if (!dashboard) {
            dashboard = await createDefaultDashboard(req, settings);
        }
        
        const planningData = await fetchPlanningData(req.organization.id);
        const updatedCategories = await updateDashboardWithPlanningData(dashboard, planningData, settings);
        
        dashboard.categories = updatedCategories;
        await dashboard.save();
        
        await StrategicDashboard.findByIdAndUpdate(dashboard._id, {
            $inc: { viewCount: 1 },
            $set: { lastViewed: new Date() }
        });
        
        const response = {
            id: dashboard._id,
            name: dashboard.name,
            description: dashboard.description,
            type: dashboard.type,
            categories: dashboard.categories.map(cat => ({
                name: cat.name,
                order: cat.order,
                kpis: cat.kpis.map(kpi => ({
                    name: kpi.name,
                    key: kpi.key,
                    value: kpi.value,
                    target: kpi.target,
                    unit: kpi.unit,
                    status: kpi.status,
                    trend: kpi.trend,
                    lastUpdated: kpi.lastUpdated,
                    history: kpi.history.slice(-6)
                }))
            })),
            settings: dashboard.settings,
            lastUpdated: new Date()
        };
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'strategic_dashboard',
            targetId: dashboard._id,
            targetName: dashboard.name,
            description: 'Viewed strategic dashboard',
            metadata: { responseTime: Date.now() - startTime }
        });
        
        res.json({ success: true, data: response });
        
    } catch (error) {
        console.error('Get strategic dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch strategic dashboard'
        });
    }
};

/**
 * GET /api/executive/strategic/scorecard
 */
const getBoardScorecard = async (req, res) => {
    try {
        const currentPlan = await StrategicPlan.findOne({
            organization: req.organization.id,
            'period.isCurrent': true,
            isActive: true
        });
        
        if (!currentPlan) {
            return res.status(404).json({
                success: false,
                message: 'No active strategic plan found'
            });
        }
        
        const objectives = await StrategicObjective.find({
            organization: req.organization.id,
            strategicPlan: currentPlan._id,
            isActive: true
        }).lean();
        
        const initiatives = await StrategicInitiative.find({
            organization: req.organization.id,
            strategicPlan: currentPlan._id,
            isActive: true
        }).lean();
        
        const financialPlan = currentPlan.financialPlan || {};
        const objectiveProgress = objectives.length > 0
            ? objectives.reduce((sum, obj) => sum + (obj.progress?.overall || 0), 0) / objectives.length
            : 0;
        
        const completedInitiatives = initiatives.filter(i => i.status === 'completed').length;
        
        const scorecard = {
            financial: {
                revenue: {
                    current: financialPlan.revenue?.target?.[0]?.amount || 0,
                    previous: financialPlan.revenue?.target?.[1]?.amount || 0,
                    growth: 0
                },
                profit: {
                    current: financialPlan.profit?.target?.[0]?.amount || 0,
                    previous: financialPlan.profit?.target?.[1]?.amount || 0,
                    margin: financialPlan.profit?.target?.[0]?.margin || 0
                }
            },
            operational: {
                efficiency: objectiveProgress,
                quality: 0,
                productivity: 0
            },
            market: {
                share: currentPlan.marketAnalysis?.marketShare?.current || 0,
                satisfaction: 0,
                acquisition: 0
            },
            strategic: {
                objectivesProgress: objectiveProgress,
                objectivesCompleted: objectives.filter(o => o.status === 'completed').length,
                totalObjectives: objectives.length,
                initiativesProgress: initiatives.length > 0 ? (completedInitiatives / initiatives.length) * 100 : 0,
                initiativesAtRisk: initiatives.filter(i => i.health?.overall === 'red').length
            },
            esg: {
                environmental: { score: 78 },
                social: { score: 82 },
                governance: { score: 91 }
            }
        };
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'board_scorecard',
            targetId: currentPlan._id,
            targetName: currentPlan.name,
            description: 'Viewed board scorecard',
            metadata: { planId: currentPlan._id }
        });
        
        res.json({ success: true, data: scorecard, planName: currentPlan.name });
        
    } catch (error) {
        console.error('Get board scorecard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch board scorecard'
        });
    }
};

/**
 * GET /api/executive/strategic/metrics
 */
const getStrategicMetrics = async (req, res) => {
    try {
        const currentPlan = await StrategicPlan.findOne({
            organization: req.organization.id,
            'period.isCurrent': true,
            isActive: true
        });
        
        if (!currentPlan) {
            return res.status(404).json({
                success: false,
                message: 'No active strategic plan found'
            });
        }
        
        const objectives = await StrategicObjective.find({
            organization: req.organization.id,
            strategicPlan: currentPlan._id,
            isActive: true
        }).lean();
        
        const initiatives = await StrategicInitiative.find({
            organization: req.organization.id,
            strategicPlan: currentPlan._id,
            isActive: true
        }).lean();
        
        const metrics = {
            strategic: {
                objectives: {
                    total: objectives.length,
                    completed: objectives.filter(o => o.status === 'completed').length,
                    averageProgress: objectives.length > 0
                        ? objectives.reduce((sum, o) => sum + (o.progress?.overall || 0), 0) / objectives.length
                        : 0
                },
                initiatives: {
                    total: initiatives.length,
                    completed: initiatives.filter(i => i.status === 'completed').length,
                    atRisk: initiatives.filter(i => i.health?.overall === 'red').length
                }
            },
            financial: [
                {
                    name: 'Revenue',
                    key: 'revenue',
                    value: currentPlan.financialPlan?.revenue?.target?.[0]?.amount || 0,
                    target: currentPlan.financialPlan?.revenue?.target?.[0]?.amount || 0,
                    unit: '$',
                    status: 'on_track'
                },
                {
                    name: 'Profit Margin',
                    key: 'profit_margin',
                    value: currentPlan.financialPlan?.profit?.target?.[0]?.margin || 0,
                    target: currentPlan.financialPlan?.profit?.target?.[0]?.margin || 0,
                    unit: '%',
                    status: 'on_track'
                }
            ]
        };
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'strategic_metrics',
            targetId: currentPlan._id,
            targetName: currentPlan.name,
            description: 'Viewed strategic metrics',
            metadata: { planId: currentPlan._id }
        });
        
        res.json({ success: true, data: metrics });
        
    } catch (error) {
        console.error('Get strategic metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch strategic metrics'
        });
    }
};

/**
 * GET /api/executive/strategic/esg
 */
const getESGMetrics = async (req, res) => {
    res.json({
        success: true,
        data: {
            environmental: { carbonFootprint: 2450, energyEfficiency: 85, score: 78 },
            social: { employeeSatisfaction: 4.2, diversity: 38, score: 82 },
            governance: { boardDiversity: 45, complianceScore: 94, score: 91 }
        }
    });
};

/**
 * POST /api/executive/strategic/kpis
 */
const createKPI = async (req, res) => {
    try {
        const { name, key, category, target, unit } = req.body;
        
        // Validate required fields
        if (!name || !key || !category) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, key, and category are required'
            });
        }
        
        let dashboard = await StrategicDashboard.findOne({
            organization: req.organization.id,
            type: 'board',
            isActive: true
        });
        
        if (!dashboard) {
            const userId = req.member?._id || req.user?.memberId || req.user?._id;
            dashboard = new StrategicDashboard({
                organization: req.organization.id,
                name: 'Strategic Dashboard',
                type: 'board',
                categories: [],
                createdBy: userId
            });
            await dashboard.save();
        }
        
        let targetCategory = dashboard.categories.find(c => c.name === category);
        if (!targetCategory) {
            targetCategory = { 
                name: category, 
                order: dashboard.categories.length + 1, 
                kpis: [] 
            };
            dashboard.categories.push(targetCategory);
        }
        
        // Check if KPI with same key already exists in this category
        const existingKPI = targetCategory.kpis.find(k => k.key === key);
        if (existingKPI) {
            return res.status(400).json({
                success: false,
                message: `KPI with key '${key}' already exists in category '${category}'`
            });
        }
        
        // Create new KPI with valid status
        const newKPI = {
            name,
            key,
            value: 0,
            target: target || 100,
            unit: unit || (target ? (target > 1000 ? '$' : '%') : '%'),
            status: 'on_track',  // Valid enum value
            lastUpdated: new Date(),
            history: []
        };
        
        targetCategory.kpis.push(newKPI);
        await dashboard.save();
        
        await logExecutiveAction({
            req,
            action: 'create',
            targetType: 'kpi',
            targetId: dashboard._id,
            targetName: name,
            description: `Created new KPI: ${name}`,
            metadata: { key, category, target, unit }
        });
        
        res.status(201).json({
            success: true,
            data: newKPI,
            message: 'KPI created successfully'
        });
        
    } catch (error) {
        console.error('Create KPI error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create KPI',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * PUT /api/executive/strategic/kpis/:id/value
 */
const updateKPIValue = async (req, res) => {
    try {
        const { id } = req.params;
        const { value } = req.body;
        
        const { dashboardId, categoryName, kpiKey } = parseKPIId(id);
        
        // Validate dashboardId
        if (!mongoose.Types.ObjectId.isValid(dashboardId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid dashboard ID format' 
            });
        }
        
        const dashboard = await StrategicDashboard.findOne({
            _id: dashboardId,
            organization: req.organization.id
        });
        
        if (!dashboard) {
            return res.status(404).json({ success: false, message: 'Dashboard not found' });
        }
        
        let foundKPI = null;
        
        for (const category of dashboard.categories) {
            if (category.name === categoryName) {
                foundKPI = category.kpis.find(k => k.key === kpiKey);
                break;
            }
        }
        
        if (!foundKPI) {
            return res.status(404).json({ success: false, message: 'KPI not found' });
        }
        
        // Save to history
        foundKPI.history.push({ date: new Date(), value: foundKPI.value });
        if (foundKPI.history.length > 12) foundKPI.history.shift();
        
        foundKPI.value = value;
        foundKPI.lastUpdated = new Date();
        foundKPI.status = calculateStatus(value, foundKPI.target);
        foundKPI.trend = calculateTrend(value, foundKPI.history);
        
        await dashboard.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'kpi',
            targetId: dashboardId,
            targetName: foundKPI.name,
            description: `Updated KPI ${foundKPI.name} value from ${foundKPI.history[foundKPI.history.length - 1]?.value || 0} to ${value}`,
            metadata: { 
                kpiKey, 
                categoryName, 
                value,
                oldValue: foundKPI.history[foundKPI.history.length - 1]?.value || 0
            }
        });
        
        res.json({
            success: true,
            data: { value, status: foundKPI.status, trend: foundKPI.trend },
            message: 'KPI value updated successfully'
        });
        
    } catch (error) {
        console.error('Update KPI value error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update KPI value',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * PUT /api/executive/strategic/kpis/:id/target
 */
const updateKPITarget = async (req, res) => {
    try {
        const { id } = req.params;
        const { target } = req.body;
        
        const { dashboardId, categoryName, kpiKey } = parseKPIId(id);
        
        // Validate dashboardId
        if (!mongoose.Types.ObjectId.isValid(dashboardId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid dashboard ID format' 
            });
        }
        
        const dashboard = await StrategicDashboard.findOne({
            _id: dashboardId,
            organization: req.organization.id
        });
        
        if (!dashboard) {
            return res.status(404).json({ success: false, message: 'Dashboard not found' });
        }
        
        let foundKPI = null;
        
        for (const category of dashboard.categories) {
            if (category.name === categoryName) {
                foundKPI = category.kpis.find(k => k.key === kpiKey);
                break;
            }
        }
        
        if (!foundKPI) {
            return res.status(404).json({ success: false, message: 'KPI not found' });
        }
        
        const oldTarget = foundKPI.target;
        foundKPI.target = target;
        foundKPI.lastUpdated = new Date();
        foundKPI.status = calculateStatus(foundKPI.value, target);
        
        await dashboard.save();
        
        await logExecutiveAction({
            req,
            action: 'update',
            targetType: 'kpi',
            targetId: dashboardId,
            targetName: foundKPI.name,
            description: `Updated KPI ${foundKPI.name} target from ${oldTarget} to ${target}`,
            metadata: { 
                kpiKey, 
                categoryName, 
                target,
                oldTarget
            }
        });
        
        res.json({
            success: true,
            data: { target, status: foundKPI.status },
            message: 'KPI target updated successfully'
        });
        
    } catch (error) {
        console.error('Update KPI target error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update KPI target',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * GET /api/executive/strategic/kpis
 */
const getAllKPIs = async (req, res) => {
    try {
        const dashboards = await StrategicDashboard.find({
            organization: req.organization.id,
            isActive: true
        }).lean();
        
        const allKPIs = [];
        
        for (const dashboard of dashboards) {
            for (const category of dashboard.categories) {
                for (const kpi of category.kpis) {
                    const simpleId = `${dashboard._id}:${category.name}:${kpi.key}`;
                    allKPIs.push({
                        _id: simpleId,
                        name: kpi.name,
                        key: kpi.key,
                        category: category.name,
                        value: kpi.value,
                        target: kpi.target,
                        unit: kpi.unit,
                        status: kpi.status,
                        trend: kpi.trend,
                        lastUpdated: kpi.lastUpdated
                    });
                }
            }
        }
        
        await logExecutiveAction({
            req,
            action: 'view',
            targetType: 'kpi_list',
            description: 'Viewed KPIs list',
            metadata: { count: allKPIs.length }
        });
        
        res.json({ success: true, data: allKPIs });
        
    } catch (error) {
        console.error('Get all KPIs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch KPIs' });
    }
};

/**
 * DELETE /api/executive/strategic/kpis/:id
 */
const deleteKPI = async (req, res) => {
    try {
        const { id } = req.params;
        const { dashboardId, categoryName, kpiKey } = parseKPIId(id);
        
        const dashboard = await StrategicDashboard.findOne({
            _id: dashboardId,
            organization: req.organization.id
        });
        
        if (!dashboard) {
            return res.status(404).json({ success: false, message: 'KPI not found' });
        }
        
        let deletedKPI = null;
        
        for (let i = 0; i < dashboard.categories.length; i++) {
            const category = dashboard.categories[i];
            if (category.name === categoryName) {
                const kpiIndex = category.kpis.findIndex(k => k.key === kpiKey);
                if (kpiIndex !== -1) {
                    deletedKPI = category.kpis[kpiIndex];
                    category.kpis.splice(kpiIndex, 1);
                    if (category.kpis.length === 0) {
                        dashboard.categories.splice(i, 1);
                    }
                    await dashboard.save();
                    break;
                }
            }
        }
        
        if (!deletedKPI) {
            return res.status(404).json({ success: false, message: 'KPI not found' });
        }
        
        await logExecutiveAction({
            req,
            action: 'delete',
            targetType: 'kpi',
            targetId: dashboardId,
            targetName: deletedKPI.name,
            description: `Deleted KPI: ${deletedKPI.name}`,
            metadata: { kpiKey, categoryName }
        });
        
        res.json({ success: true, message: 'KPI deleted successfully' });
        
    } catch (error) {
        console.error('Delete KPI error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete KPI' });
    }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
    getStrategicDashboard,
    getBoardScorecard,
    getStrategicMetrics,
    getESGMetrics,
    createKPI,
    updateKPIValue,
    updateKPITarget,
    getAllKPIs,
    deleteKPI
};