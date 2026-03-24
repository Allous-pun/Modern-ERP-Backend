// src/utils/token.utils.js
const jwt = require('jsonwebtoken');

const generateToken = (userId, email) => {
    return jwt.sign(
        { 
            userId, 
            email
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET, // Using same secret for simplicity
        { expiresIn: '7d' }
    );
};

module.exports = {
    generateToken,
    verifyToken,
    generateRefreshToken
};