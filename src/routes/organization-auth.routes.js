// src/routes/organization-auth.routes.js
const express = require('express');
const { login, registerWithInvite } = require('../controllers/organization-auth.controller');

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/register-invite', registerWithInvite);

module.exports = router;