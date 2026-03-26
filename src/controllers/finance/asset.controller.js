// src/controllers/finance/asset.controller.js
const AssetService = require('../../services/finance/asset.service');

/**
 * @desc    Create asset
 * @route   POST /api/finance/assets
 * @access  Private (requires finance.asset_create)
 */
const createAsset = async (req, res) => {
    try {
        const {
            name, description, category, acquisitionDate, purchasePrice,
            residualValue, usefulLife, depreciationMethod, supplierId,
            supplierName, invoiceNumber, warrantyExpiry, location,
            assignedTo, department, costCenter, assetAccountId,
            depreciationAccountId, accumulatedDepreciationAccountId
        } = req.body;
        
        if (!name || !category || !acquisitionDate || !purchasePrice || !usefulLife ||
            !assetAccountId || !depreciationAccountId || !accumulatedDepreciationAccountId) {
            return res.status(400).json({
                success: false,
                message: 'name, category, acquisitionDate, purchasePrice, usefulLife, and account IDs are required'
            });
        }
        
        const asset = await AssetService.createAsset({
            name,
            description,
            category,
            acquisitionDate,
            purchasePrice,
            residualValue,
            usefulLife,
            depreciationMethod,
            supplierId,
            supplierName,
            invoiceNumber,
            warrantyExpiry,
            location,
            assignedTo,
            department,
            costCenter,
            assetAccountId,
            depreciationAccountId,
            accumulatedDepreciationAccountId
        }, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(201).json({
            success: true,
            message: 'Asset created successfully',
            data: asset
        });
        
    } catch (error) {
        console.error('Create asset error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create asset'
        });
    }
};

/**
 * @desc    Get assets
 * @route   GET /api/finance/assets
 * @access  Private (requires finance.asset_view)
 */
const getAssets = async (req, res) => {
    try {
        const { category, status, assignedTo, search, page = 1, limit = 50 } = req.query;
        
        const result = await AssetService.getAssets({
            category,
            status,
            assignedTo,
            search
        }, req.user.organizationId, page, limit);
        
        res.status(200).json({
            success: true,
            count: result.assets.length,
            total: result.total,
            page: result.page,
            pages: result.pages,
            data: result.assets
        });
        
    } catch (error) {
        console.error('Get assets error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assets'
        });
    }
};

/**
 * @desc    Get asset by ID
 * @route   GET /api/finance/assets/:id
 * @access  Private (requires finance.asset_view)
 */
const getAssetById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const asset = await AssetService.getAssetById(id, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            data: asset
        });
        
    } catch (error) {
        console.error('Get asset error:', error);
        res.status(404).json({
            success: false,
            message: error.message || 'Asset not found'
        });
    }
};

/**
 * @desc    Update asset
 * @route   PUT /api/finance/assets/:id
 * @access  Private (requires finance.asset_update)
 */
const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const asset = await AssetService.updateAsset(id, updateData, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Asset updated successfully',
            data: asset
        });
        
    } catch (error) {
        console.error('Update asset error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update asset'
        });
    }
};

/**
 * @desc    Dispose asset
 * @route   POST /api/finance/assets/:id/dispose
 * @access  Private (requires finance.asset_update)
 */
const disposeAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { disposalDate, disposalAmount, disposalReason } = req.body;
        
        const asset = await AssetService.disposeAsset(id, {
            disposalDate,
            disposalAmount,
            disposalReason
        }, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Asset disposed successfully',
            data: asset
        });
        
    } catch (error) {
        console.error('Dispose asset error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to dispose asset'
        });
    }
};

/**
 * @desc    Get depreciation schedules
 * @route   GET /api/finance/assets/depreciation/schedules
 * @access  Private (requires finance.asset_view)
 */
const getDepreciationSchedules = async (req, res) => {
    try {
        const { assetId, status, year, month, page = 1, limit = 50 } = req.query;
        
        const result = await AssetService.getDepreciationSchedules({
            assetId,
            status,
            year,
            month
        }, req.user.organizationId, page, limit);
        
        res.status(200).json({
            success: true,
            count: result.schedules.length,
            total: result.total,
            page: result.page,
            pages: result.pages,
            data: result.schedules
        });
        
    } catch (error) {
        console.error('Get depreciation schedules error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch depreciation schedules'
        });
    }
};


/**
 * @desc    Generate depreciation schedule for an asset
 * @route   POST /api/finance/assets/:id/generate-depreciation
 * @access  Private (requires finance.asset_update)
 */
const generateDepreciationSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        
        const schedules = await AssetService.generateDepreciationSchedule(id, req.user.organizationId, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        });
        
        res.status(200).json({
            success: true,
            message: `Generated ${schedules.length} depreciation schedules`,
            data: schedules
        });
        
    } catch (error) {
        console.error('Generate depreciation schedule error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to generate depreciation schedule'
        });
    }
};

/**
 * @desc    Generate and post depreciation for a specific period
 * @route   POST /api/finance/assets/:id/post-depreciation
 * @access  Private (requires finance.asset_update)
 */
const postPeriodDepreciation = async (req, res) => {
    try {
        const { id } = req.params;
        const { year, month } = req.body;
        
        if (!year || !month) {
            return res.status(400).json({
                success: false,
                message: 'year and month are required'
            });
        }
        
        const result = await AssetService.generateAndPostDepreciation(id, parseInt(year), parseInt(month), {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: `Depreciation posted for ${month}/${year}`,
            data: result
        });
        
    } catch (error) {
        console.error('Post period depreciation error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to post depreciation'
        });
    }
};

/**
 * @desc    Post depreciation
 * @route   POST /api/finance/assets/depreciation/:scheduleId/post
 * @access  Private (requires finance.asset_update)
 */
const postDepreciation = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        
        const result = await AssetService.postDepreciation(scheduleId, {
            id: req.user.id,
            email: req.user.email,
            name: req.user.displayName
        }, req.user.organizationId);
        
        res.status(200).json({
            success: true,
            message: 'Depreciation posted successfully',
            data: result
        });
        
    } catch (error) {
        console.error('Post depreciation error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to post depreciation'
        });
    }
};

/**
 * @desc    Get asset summary
 * @route   GET /api/finance/assets/summary
 * @access  Private (requires finance.asset_view)
 */
const getAssetSummary = async (req, res) => {
    try {
        const summary = await AssetService.getAssetSummary(req.user.organizationId);
        
        res.status(200).json({
            success: true,
            data: summary
        });
        
    } catch (error) {
        console.error('Get asset summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch asset summary'
        });
    }
};

module.exports = {
    createAsset,
    getAssets,
    getAssetById,
    updateAsset,
    disposeAsset,
    getDepreciationSchedules,
    postDepreciation,
    getAssetSummary,
    generateDepreciationSchedule,
    postPeriodDepreciation
};
