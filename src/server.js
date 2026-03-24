// src/server.js
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
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

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const server = app.listen(PORT, async () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`MongoDB URI: ${process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//****:****@')}`);
    
    // Initialize scheduled report runner after server starts
    try {
        const scheduledReportRunner = require('./services/executive/scheduledReportRunner.service');
        scheduledReportRunner.init();
        console.log('Scheduled report runner initialized successfully');
        
        // Optional: Show count of pending scheduled reports
        const ScheduledReport = require('./models/executive/scheduledReport.model');
        const pendingCount = await ScheduledReport.countDocuments({ status: 'pending' });
        if (pendingCount > 0) {
            console.log(`📅 ${pendingCount} scheduled report(s) pending`);
        }
        
    } catch (error) {
        console.error('Failed to initialize scheduled report runner:', error.message);
    }
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
