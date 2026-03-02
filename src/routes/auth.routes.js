// src/routes/auth.routes.js
const express = require('express');
const {
    register,
    registerWithInvite,
    login,
    getProfile,
    updateProfile,
    logout,
    refreshToken
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { 
    validateRegistration, 
    validateLogin,
    validateProfileUpdate 
} = require('../middleware/validation.middleware');

const router = express.Router();

// Public routes
router.post('/register', validateRegistration, register);
router.post('/register/invite', validateRegistration, registerWithInvite);
router.post('/login', validateLogin, login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, validateProfileUpdate, updateProfile);
router.post('/logout', protect, logout);

module.exports = router;