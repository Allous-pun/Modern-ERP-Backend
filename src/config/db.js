// src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Prevent multiple connections during hot reload / nodemon restarts
        if (mongoose.connection.readyState === 1) {
            console.log('MongoDB already connected');
            return;
        }

        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10, // limit pool size to avoid Atlas free-tier exhaustion
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Database: ${conn.connection.name}`);

    } catch (error) {
        console.error('Database connection error:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;