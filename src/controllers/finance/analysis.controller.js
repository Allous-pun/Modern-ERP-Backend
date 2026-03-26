// src/controllers/finance/analysis.controller.js (add trend and variance)
const AnalysisService = require('../../services/finance/analysis.service');

const analysisService = new AnalysisService();

// Generate ratio analysis
const generateRatioAnalysis = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required'
            });
        }
        
        const analysis = await analysisService.generateRatioAnalysis(
            req.user.organizationId,
            startDate,
            endDate,
            req.user
        );
        
        res.status(201).json({
            success: true,
            data: analysis
        });
        
    } catch (error) {
        console.error('Generate ratio analysis error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// NEW: Generate trend analysis
const generateTrendAnalysis = async (req, res) => {
    try {
        const { periods = 12 } = req.body;
        
        const analysis = await analysisService.generateTrendAnalysis(
            req.user.organizationId,
            parseInt(periods),
            req.user
        );
        
        res.status(201).json({
            success: true,
            data: analysis
        });
        
    } catch (error) {
        console.error('Generate trend analysis error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// NEW: Generate variance analysis
const generateVarianceAnalysis = async (req, res) => {
    try {
        const { startDate, endDate, budgetYear } = req.body;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required'
            });
        }
        
        const analysis = await analysisService.generateVarianceAnalysis(
            req.user.organizationId,
            startDate,
            endDate,
            budgetYear || new Date().getFullYear(),
            req.user
        );
        
        res.status(201).json({
            success: true,
            data: analysis
        });
        
    } catch (error) {
        console.error('Generate variance analysis error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all analyses
const getAnalyses = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        
        const result = await analysisService.getAnalyses(
            req.user.organizationId,
            parseInt(page),
            parseInt(limit)
        );
        
        res.status(200).json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Get analyses error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get analysis by ID
const getAnalysisById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const analysis = await analysisService.getAnalysisById(
            id,
            req.user.organizationId
        );
        
        res.status(200).json({
            success: true,
            data: analysis
        });
        
    } catch (error) {
        console.error('Get analysis error:', error);
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    generateRatioAnalysis,
    generateTrendAnalysis,
    generateVarianceAnalysis,
    getAnalyses,
    getAnalysisById
};
