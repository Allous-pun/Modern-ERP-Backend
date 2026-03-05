// src/routes/system/index.js
const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const { requireModule } = require('../../middleware/module.middleware');
const { setOrganizationContext } = require('../../middleware/organization.middleware');

// Import sub-routes
const userRoutes = require('./user.routes');
// const roleRoutes = require('./role.routes');
const auditRoutes = require('./audit.routes');
const backupRoutes = require('./backup.routes');
// const configRoutes = require('./config.routes');
const securityRoutes = require('./security.routes');
const complianceRoutes = require('./compliance.routes');
const riskRoutes = require('./risk.routes');
const privacyRoutes = require('./privacy.routes');

const router = express.Router();

// All system routes require:
// 1. Authentication (protect)
// 2. System module installed (requireModule)
// 3. Organization context (setOrganizationContext)
router.use(protect);
router.use(requireModule('system'));
router.use(setOrganizationContext);

// Mount sub-routes
router.use('/users', userRoutes);
// router.use('/roles', roleRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/backups', backupRoutes);
// router.use('/config', configRoutes);
router.use('/security', securityRoutes);
router.use('/compliance', complianceRoutes);
router.use('/risks', riskRoutes);
router.use('/privacy', privacyRoutes);

module.exports = router;