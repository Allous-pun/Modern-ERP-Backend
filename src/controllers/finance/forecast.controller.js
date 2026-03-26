// src/controllers/finance/forecast.controller.js
const ForecastService = require('../../services/finance/forecast.service');

const forecastService = new ForecastService();

// Generate forecast
const generateForecast = async (req, res) => {
    try {
        const { months = 12, assumptions = {} } = req.body;
        
        const forecast = await forecastService.generateForecast(
            req.user.organizationId,
            parseInt(months),
            assumptions,
            req.user
        );
        
        res.status(201).json({
            success: true,
            data: forecast
        });
        
    } catch (error) {
        console.error('Generate forecast error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all forecasts
const getForecasts = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        
        const result = await forecastService.getForecasts(
            req.user.organizationId,
            parseInt(page),
            parseInt(limit)
        );
        
        res.status(200).json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Get forecasts error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get forecast by ID
const getForecastById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const forecast = await forecastService.getForecastById(
            id,
            req.user.organizationId
        );
        
        res.status(200).json({
            success: true,
            data: forecast
        });
        
    } catch (error) {
        console.error('Get forecast error:', error);
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    generateForecast,
    getForecasts,
    getForecastById
};
