// src/app.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// Import routes
const roleRoutes = require('./routes/role.routes');
const permissionRoutes = require('./routes/permission.routes');
const moduleRoutes = require('./routes/module.routes');
const organizationRoutes = require('./routes/organization.routes');
const inviteRoutes = require('./routes/invite.routes');
const supremeRoutes = require('./routes/supreme.routes');
const organizationAuthRoutes = require('./routes/organization-auth.routes');

// Import module-specific routes
const systemRoutes = require('./routes/system.routes');
const securityRoutes = require('./routes/security.routes');
const executiveRoutes = require('./routes/executive.routes');
const financeRoutes = require('./routes/finance.routes');
const hrRoutes = require('./routes/hr.routes');
const salesRoutes = require('./routes/sales.routes');

// Middleware
const allowedOrigins = [
    'https://bright-erp-rosy.vercel.app',
    'http://localhost:8080'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like Postman or mobile apps)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Routes
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/supreme', supremeRoutes);
app.use('/api/organization-auth', organizationAuthRoutes);

// Register module routes
app.use('/api/system', systemRoutes);
app.use('/api/executive', executiveRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/sales', salesRoutes);

// Health route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Global error handler
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        status: 'error',
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        status: 'error',
        message: `Cannot ${req.method} ${req.url}`
    });
});

module.exports = app;