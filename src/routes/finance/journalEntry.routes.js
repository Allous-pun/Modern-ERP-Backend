// src/routes/finance/journalEntry.routes.js
const express = require('express');
const router = express.Router();
const journalEntryController = require('../../controllers/finance/journalEntry.controller');
const { protect } = require('../../middleware/auth.middleware');
const { hasPermission } = require('../../middleware/auth.middleware');
const { setOrganizationContext } = require('../../middleware/organization.middleware');
const attachSettings = require('../../middleware/settings.middleware');

// Apply authentication and organization context
router.use(protect);
router.use(setOrganizationContext);
router.use(attachSettings);

// Statistics
router.get('/stats',
    hasPermission('finance.journal_view'),
    journalEntryController.getJournalStats
);

// Journal entry CRUD operations
router.route('/')
    .post(
        hasPermission('finance.journal_create'),
        journalEntryController.createJournalEntry
    )
    .get(
        hasPermission('finance.journal_view'),
        journalEntryController.getJournalEntries
    );

router.route('/:id')
    .get(
        hasPermission('finance.journal_view'),
        journalEntryController.getJournalEntryById
    )
    .put(
        hasPermission('finance.journal_update'),
        journalEntryController.updateJournalEntry
    );

// Workflow actions
router.post('/:id/approve',
    hasPermission('finance.journal_approve'),
    journalEntryController.approveJournalEntry
);

router.post('/:id/post',
    hasPermission('finance.journal_post'),
    journalEntryController.postJournalEntry
);

router.post('/:id/reverse',
    hasPermission('finance.journal_update'),
    journalEntryController.reverseJournalEntry
);

module.exports = router;
