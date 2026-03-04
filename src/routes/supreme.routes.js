// src/routes/supreme.routes.js
const express = require('express');
const router = express.Router();
const supremeController = require('../controllers/supreme.controller');
const { 
    protect, 
    isSupreme,
    canManageOrganizations,
    canManageSubscriptions,
    canUpdatePrice 
} = require('../middleware/auth.middleware');

// Public routes
router.post('/register', supremeController.register);
router.post('/login', supremeController.login);

// Protected routes - all require authentication and supreme privileges
router.use(protect);
router.use(isSupreme); // Ensures only supreme users can access these routes

// Profile
router.get('/profile', supremeController.getProfile);

router.post('/logout', supremeController.logout);

// Dashboard
router.get('/dashboard', supremeController.getDashboard);

// Organization Management
router.get('/organizations', canManageOrganizations, supremeController.getOrganizations);
router.get('/organizations/expired', canManageOrganizations, supremeController.getExpiredOrganizations);
router.get('/organizations/:id', canManageOrganizations, supremeController.getOrganization);
router.patch('/organizations/:id/activate', canManageOrganizations, supremeController.activateOrganization);
router.patch('/organizations/:id/deactivate', canManageOrganizations, supremeController.deactivateOrganization);

// Subscription Management
router.get('/subscription/settings', canManageSubscriptions, supremeController.getSubscriptionSettings);
router.patch('/subscription/price', canUpdatePrice, supremeController.updateSubscriptionPrice);

// Logs
router.get('/logs', supremeController.getActionLogs);

module.exports = router;