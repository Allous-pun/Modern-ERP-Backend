// src/controllers/finance/cost.controller.js
const CostService = require('../../services/finance/cost.service');

/**
 * @desc    Create cost center
 * @route   POST /api/finance/cost/centers
 * @access  Private (requires finance.cost_create)
 */
const createCostCenter = async (req, res) => {
    try {
        const { code, name, type, description, parentCostCenter, manager, annualBudget } = req.body;
        
        if (!code || !name || !type) {
            return res.status(400).json({
                success: false,
                message: 'code, name, and type are required'
            });
        }
        
        const costCenter = await CostService.createCostCenter({
            code: code.toUpperCase(),
            name,
            type,
            description,
            parentCostCenter,
            manager,
            annualBudget
        }, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(201).json({
            success: true,
            message: 'Cost center created successfully',
            data: costCenter
        });
        
    } catch (error) {
        console.error('Create cost center error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create cost center'
        });
    }
};

/**
 * @desc    Get cost centers
 * @route   GET /api/finance/cost/centers
 * @access  Private (requires finance.cost_view)
 */
const getCostCenters = async (req, res) => {
    try {
        const { type, isActive, search, page = 1, limit = 50 } = req.query;
        
        const result = await CostService.getCostCenters({
            type,
            isActive,
            search
        }, req.user.organizationId, page, limit);
        
        res.status(200).json({
            success: true,
            count: result.costCenters.length,
            total: result.total,
            page: result.page,
            pages: result.pages,
            data: result.costCenters
        });
        
    } catch (error) {
        console.error('Get cost centers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cost centers'
        });
    }
};

/**
 * @desc    Get cost center by ID
 * @route   GET /api/finance/cost/centers/:id
 * @access  Private (requires finance.cost_view)
 */
const getCostCenterById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const costCenter = await CostService.getCostCenterById(id, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            data: costCenter
        });
        
    } catch (error) {
        console.error('Get cost center error:', error);
        res.status(404).json({
            success: false,
            message: error.message || 'Cost center not found'
        });
    }
};

/**
 * @desc    Update cost center
 * @route   PUT /api/finance/cost/centers/:id
 * @access  Private (requires finance.cost_update)
 */
const updateCostCenter = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const costCenter = await CostService.updateCostCenter(id, updateData, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Cost center updated successfully',
            data: costCenter
        });
        
    } catch (error) {
        console.error('Update cost center error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update cost center'
        });
    }
};

/**
 * @desc    Delete cost center
 * @route   DELETE /api/finance/cost/centers/:id
 * @access  Private (requires finance.cost_update)
 */
const deleteCostCenter = async (req, res) => {
    try {
        const { id } = req.params;
        
        const costCenter = await CostService.deleteCostCenter(id, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Cost center deactivated successfully',
            data: costCenter
        });
        
    } catch (error) {
        console.error('Delete cost center error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to deactivate cost center'
        });
    }
};

/**
 * @desc    Create cost allocation
 * @route   POST /api/finance/cost/allocations
 * @access  Private (requires finance.cost_create)
 */
const createCostAllocation = async (req, res) => {
    try {
        const {
            date, sourceType, sourceId, sourceModel, costCenter,
            amount, description, allocationMethod, percentage, notes
        } = req.body;
        
        if (!date || !costCenter || !amount || !description) {
            return res.status(400).json({
                success: false,
                message: 'date, costCenter, amount, and description are required'
            });
        }
        
        const allocation = await CostService.createCostAllocation({
            date,
            sourceType,
            sourceId,
            sourceModel,
            costCenter,
            amount,
            description,
            allocationMethod,
            percentage,
            notes
        }, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(201).json({
            success: true,
            message: 'Cost allocation created successfully',
            data: allocation
        });
        
    } catch (error) {
        console.error('Create cost allocation error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create cost allocation'
        });
    }
};

/**
 * @desc    Get cost allocations
 * @route   GET /api/finance/cost/allocations
 * @access  Private (requires finance.cost_view)
 */
const getCostAllocations = async (req, res) => {
    try {
        const { costCenter, startDate, endDate, sourceType, page = 1, limit = 50 } = req.query;
        
        const result = await CostService.getCostAllocations({
            costCenter,
            startDate,
            endDate,
            sourceType
        }, req.user.organizationId, page, limit);
        
        res.status(200).json({
            success: true,
            count: result.allocations.length,
            total: result.total,
            page: result.page,
            pages: result.pages,
            data: result.allocations
        });
        
    } catch (error) {
        console.error('Get cost allocations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cost allocations'
        });
    }
};

/**
 * @desc    Get cost center summary
 * @route   GET /api/finance/cost/centers/:id/summary
 * @access  Private (requires finance.cost_view)
 */
const getCostCenterSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required'
            });
        }
        
        const summary = await CostService.getCostCenterSummary(
            req.user.organizationId,
            id,
            startDate,
            endDate
        );
        
        res.status(200).json({
            success: true,
            data: summary
        });
        
    } catch (error) {
        console.error('Get cost center summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cost center summary'
        });
    }
};

/**
 * @desc    Get organization cost summary
 * @route   GET /api/finance/cost/summary
 * @access  Private (requires finance.cost_view)
 */
const getOrganizationCostSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate and endDate are required'
            });
        }
        
        const summary = await CostService.getOrganizationCostSummary(
            req.user.organizationId,
            startDate,
            endDate
        );
        
        res.status(200).json({
            success: true,
            data: summary
        });
        
    } catch (error) {
        console.error('Get organization cost summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch organization cost summary'
        });
    }
};

module.exports = {
    createCostCenter,
    getCostCenters,
    getCostCenterById,
    updateCostCenter,
    deleteCostCenter,
    createCostAllocation,
    getCostAllocations,
    getCostCenterSummary,
    getOrganizationCostSummary
};
