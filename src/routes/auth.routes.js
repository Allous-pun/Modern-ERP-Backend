// src/routes/auth.routes.js
const express = require('express');
const {
    register,
    registerWithInvite,
    login,
    getProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    logout,
    refreshToken
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { 
    validateRegistration, 
    validateLogin,
    validateProfileUpdate 
} = require('../middleware/validation.middleware');
const { upload } = require('../config/cloudinary');

const router = express.Router();

// Public routes
router.post('/register', validateRegistration, register);
router.post('/register/invite', validateRegistration, registerWithInvite);
router.post('/login', validateLogin, login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, validateProfileUpdate, updateProfile);

// Avatar routes
router.post('/avatar', 
    protect, 
    upload.single('avatar'), 
    uploadAvatar
);

router.delete('/avatar', 
    protect, 
    deleteAvatar
);

router.post('/logout', protect, logout);

module.exports = router;