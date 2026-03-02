// src/models/hr/index.js
/**
 * HR Module Models Index
 * This file exports all models for the Human Resources module
 */

const Employee = require('./employee.model');
const Attendance = require('./attendance.model');
const Leave = require('./leave.model');
const Performance = require('./performance.model');
const Compensation = require('./compensation.model');
const Training = require('./training.model');

module.exports = {
    Employee,
    Attendance,
    Leave,
    Performance,
    Compensation,
    Training,
    
    // Helper function to initialize all models
    initialize: async () => {
        try {
            // Create indexes for all models
            await Employee.createIndexes();
            await Attendance.createIndexes();
            await Leave.createIndexes();
            await Performance.createIndexes();
            await Compensation.createIndexes();
            await Training.createIndexes();
            
            console.log('✅ HR module models initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing HR module models:', error);
            throw error;
        }
    },
    
    // Helper function to get model by name
    getModel: (modelName) => {
        const models = {
            Employee,
            Attendance,
            Leave,
            Performance,
            Compensation,
            Training
        };
        return models[modelName];
    },
    
    // Export all model names for reference
    modelNames: [
        'Employee', 'Attendance', 'Leave', 
        'Performance', 'Compensation', 'Training'
    ]
};