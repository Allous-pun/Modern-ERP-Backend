// src/routes/executive/index.js
const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const { requireModule } = require('../../middleware/module.middleware');
const { setOrganizationContext } = require('../../middleware/organization.middleware');
const attachSettings = require('../../middleware/settings.middleware'); // ADD THIS

// Import sub-routes
const strategicRoutes = require('./strategic.routes');
const governanceRoutes = require('./governance.routes');
const analyticsRoutes = require('./analytics.routes');
const operationsRoutes = require('./operations.routes');
const financialRoutes = require('./financial.routes');
const technologyRoutes = require('./technology.routes');
const itGovernanceRoutes = require('./itGovernance.routes');
const planningRoutes = require('./planning.routes');
const reportsRoutes = require('./reports.routes');

const router = express.Router();

// All executive routes require:
// 1. Authentication (protect)
// 2. Executive module installed (requireModule)
// 3. Organization context (setOrganizationContext)
// 4. Settings attached (attachSettings)
router.use(protect);
router.use(requireModule('executive'));
router.use(setOrganizationContext);
router.use(attachSettings); // ADD THIS

// Mount sub-routes
router.use('/strategic', strategicRoutes);
router.use('/governance', governanceRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/operations', operationsRoutes);
router.use('/financial', financialRoutes);
router.use('/technology', technologyRoutes);
router.use('/it-governance', itGovernanceRoutes);
router.use('/planning', planningRoutes);
router.use('/reports', reportsRoutes);

module.exports = router;