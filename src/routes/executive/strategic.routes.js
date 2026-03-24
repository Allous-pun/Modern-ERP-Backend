const express = require('express');
const router = express.Router();
const attachSettings = require('../../middleware/settings.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const {
    getStrategicDashboard,
    getBoardScorecard,
    getStrategicMetrics,
    getESGMetrics,
    createKPI,
    updateKPIValue,
    updateKPITarget,
    getAllKPIs,
    deleteKPI
} = require('../../controllers/executive/strategicDashboard.controller');

router.use(attachSettings);

// Dashboard endpoints
router.get('/dashboard', 
    requirePermission('executive.board_dashboards'),
    getStrategicDashboard
);

router.get('/scorecard', 
    requirePermission('executive.board_dashboards'),
    getBoardScorecard
);

router.get('/metrics', 
    requirePermission('executive.board_dashboards'),
    getStrategicMetrics
);

router.get('/esg', 
    requirePermission('executive.board_dashboards'),
    getESGMetrics
);

// KPI endpoints
router.get('/kpis', 
    requirePermission('executive.board_dashboards'),
    getAllKPIs
);

router.post('/kpis',
    requirePermission('executive.full_analytics'),
    createKPI
);

router.put('/kpis/:id/value',
    requirePermission('executive.full_analytics'),
    updateKPIValue
);

router.put('/kpis/:id/target',
    requirePermission('executive.full_analytics'),
    updateKPITarget
);

router.delete('/kpis/:id',
    requirePermission('executive.full_analytics'),
    deleteKPI
);

module.exports = router;