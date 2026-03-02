// src/server.js
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    console.log(err.stack);
    process.exit(1);
});

// Load environment variables
require('dotenv').config();

// Connect to MongoDB (using your online MongoDB)
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`MongoDB URI: ${process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`); // Hide credentials
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    console.log(err.stack);
    server.close(() => {
        process.exit(1);
    });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        console.log('💥 Process terminated!');
    });
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
    console.log('👋 SIGINT RECEIVED. Shutting down gracefully');
    server.close(() => {
        console.log('💥 Process terminated!');
        process.exit(0);
    });
});