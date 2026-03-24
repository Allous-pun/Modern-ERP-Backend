// src/routes/finance.routes.js
const express = require('express');
const router = express.Router();
const financeModuleRoutes = require('./finance/index');

// Mount all finance sub-modules under /api/finance
router.use('/', financeModuleRoutes);

module.exports = router;