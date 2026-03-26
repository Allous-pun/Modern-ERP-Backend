// src/routes/finance/index.js
const express = require('express');
const router = express.Router();

// Import sub-module routes
const accountRoutes = require('./account.routes');
const journalEntryRoutes = require('./journalEntry.routes');
const budgetRoutes = require('./budget.routes');
const reportsRoutes = require('./reports.routes');
const treasuryRoutes = require('./treasury.routes');
const apRoutes = require('./ap.routes');
const arRoutes = require('./ar.routes');
const taxRoutes = require('./tax.routes');
const costRoutes = require('./cost.routes');
const assetRoutes = require('./asset.routes');
const forecastRoutes = require('./forecast.routes');
const analysisRoutes = require('./analysis.routes');

// Mount sub-modules
router.use('/accounts', accountRoutes);
router.use('/journal-entries', journalEntryRoutes);
router.use('/budgets', budgetRoutes);
router.use('/reports', reportsRoutes);
router.use('/treasury', treasuryRoutes);
router.use('/ap', apRoutes);
router.use('/ar', arRoutes);
router.use('/tax', taxRoutes);
router.use('/cost', costRoutes);
router.use('/assets', assetRoutes);
router.use('/forecast', forecastRoutes);
router.use('/analysis', analysisRoutes);

module.exports = router;