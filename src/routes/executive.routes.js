// src/routes/executive.routes.js
const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { requireModule } = require('../middleware/module.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const executiveController = require('../controllers/executive');

const router = express.Router();

// All executive routes require:
// 1. Authentication (protect)
// 2. Executive module installed (requireModule)
router.use(protect);
router.use(requireModule('executive'));

// ========== DASHBOARDS ==========

// Board Member - Strategic dashboards
router.get('/dashboards/strategic',
    requirePermission('executive.dashboards_view'),
    executiveController.getStrategicDashboards
);

// Chairman - Governance oversight
router.get('/dashboards/governance',
    requirePermission('executive.governance_view'),
    executiveController.getGovernanceDashboard
);

// CEO - Full analytics
router.get('/dashboards/full-analytics',
    requirePermission('executive.full_analytics'),
    executiveController.getFullAnalyticsDashboard
);

// COO - Operations
router.get('/dashboards/operations',
    requirePermission('executive.operations_view'),
    executiveController.getOperationsDashboard
);

// ========== ANALYTICS ==========

// CFO - Financial oversight
router.get('/analytics/financial',
    requirePermission('executive.financial_oversight'),
    executiveController.getFinancialAnalytics
);

// CTO - Technology & systems
router.get('/analytics/technology',
    requirePermission('executive.technology_view'),
    executiveController.getTechnologyAnalytics
);

// CIO - IT governance
router.get('/analytics/it-governance',
    requirePermission('executive.it_governance'),
    executiveController.getITGovernanceAnalytics
);

// CRO - Risk management
router.get('/analytics/risk',
    requirePermission('executive.risk_view'),
    executiveController.getRiskAnalytics
);

// CHRO - HR oversight
router.get('/analytics/hr',
    requirePermission('executive.hr_oversight'),
    executiveController.getHRAnalytics
);

// ========== GOVERNANCE ==========

// Strategy Director - Strategic planning
router.get('/governance/strategic-plan',
    requirePermission('executive.strategic_planning'),
    executiveController.getStrategicPlan
);

router.put('/governance/strategic-plan',
    requirePermission('executive.strategic_planning'),
    executiveController.updateStrategicPlan
);

router.get('/governance/performance',
    requirePermission('executive.strategic_planning'),
    executiveController.getStrategyPerformance
);

// ========== REPORTS ==========

router.get('/reports',
    requirePermission('executive.reports_view'),
    executiveController.getReports
);

router.get('/reports/:id',
    requirePermission('executive.reports_view'),
    executiveController.getReport
);

router.post('/reports',
    requirePermission('executive.reports_create'),
    executiveController.createReport
);

router.get('/reports/:id/export',
    requirePermission('executive.reports_view'),
    executiveController.exportReport
);

module.exports = router;