// src/routes/finance/index.js
const express = require('express');
const router = express.Router();

// Import sub-module routes
const accountRoutes = require('./account.routes');
const journalEntryRoutes = require('./journalEntry.routes');
const budgetRoutes = require('./budget.routes');
const reportsRoutes = require('./reports.routes');

// Mount sub-modules
router.use('/accounts', accountRoutes);
router.use('/journal-entries', journalEntryRoutes);
router.use('/budgets', budgetRoutes);
router.use('/reports', reportsRoutes);

module.exports = router;
