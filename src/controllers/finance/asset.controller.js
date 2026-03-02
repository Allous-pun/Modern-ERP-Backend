// src/controllers/finance/asset.controller.js
const { Asset, Account } = require('../../models/finance');
const AuditLog = require('../../models/auditLog.model');
const { calculateDepreciation } = require('../../utils/finance/calculators');

// @desc    Get all assets
// @route   GET /api/finance/assets
// @access  Private (requires finance.asset_view)
const getAssets = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            type,
            status,
            category,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { organization: organizationId };
        
        if (type) filter.type = type;
        if (status) filter.status = status;
        if (category) filter.category = category;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const assets = await Asset.find(filter)
            .sort({ purchaseDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('account', 'code name')
            .populate('createdBy', 'firstName lastName');

        const total = await Asset.countDocuments(filter);

        // Calculate current book value for each asset
        const assetsWithValue = await Promise.all(
            assets.map(async (asset) => {
                const bookValue = await asset.calculateBookValue();
                const depreciation = await asset.calculateDepreciation();
                return {
                    ...asset.toObject(),
                    bookValue,
                    monthlyDepreciation: depreciation.monthly,
                    yearToDateDepreciation: depreciation.ytd
                };
            })
        );

        res.status(200).json({
            success: true,
            data: assetsWithValue,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get assets error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assets'
        });
    }
};

// @desc    Get single asset
// @route   GET /api/finance/assets/:id
// @access  Private (requires finance.asset_view)
const getAsset = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const asset = await Asset.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('account', 'code name')
        .populate('createdBy', 'firstName lastName');

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        // Calculate asset values
        const bookValue = await asset.calculateBookValue();
        const depreciation = await asset.calculateDepreciation();
        const projection = await asset.getDepreciationProjection();

        res.status(200).json({
            success: true,
            data: {
                ...asset.toObject(),
                bookValue,
                depreciation,
                projection
            }
        });
    } catch (error) {
        console.error('Get asset error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch asset'
        });
    }
};

// @desc    Create asset
// @route   POST /api/finance/assets
// @access  Private (requires finance.asset_create)
const createAsset = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        // Validate account exists
        if (req.body.account) {
            const account = await Account.findOne({
                _id: req.body.account,
                organization: organizationId
            });

            if (!account) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid account ID'
                });
            }
        }

        // Calculate initial depreciation using imported utility
        const depreciationSchedule = calculateDepreciation({
            cost: req.body.purchaseCost,
            salvageValue: req.body.salvageValue || 0,
            usefulLife: req.body.usefulLife,
            method: req.body.depreciationMethod || 'straight-line',
            purchaseDate: new Date(req.body.purchaseDate)
        });

        const assetData = {
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId,
            depreciationSchedule,
            currentValue: req.body.purchaseCost,
            accumulatedDepreciation: 0
        };

        const asset = await Asset.create(assetData);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'asset_created',
            target: asset._id,
            details: {
                name: asset.name,
                assetNumber: asset.assetNumber,
                purchaseCost: asset.purchaseCost
            }
        });

        res.status(201).json({
            success: true,
            message: 'Asset created successfully',
            data: asset
        });
    } catch (error) {
        console.error('Create asset error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create asset'
        });
    }
};

// @desc    Update asset
// @route   PUT /api/finance/assets/:id
// @access  Private (requires finance.asset_update)
const updateAsset = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const asset = await Asset.findOne({ 
            _id: req.params.id,
            organization: organizationId,
            status: { $nin: ['disposed', 'sold'] }
        });

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found or cannot be updated'
            });
        }

        // Recalculate depreciation if relevant fields changed using imported utility
        if (req.body.purchaseCost || req.body.salvageValue || req.body.usefulLife || req.body.depreciationMethod) {
            req.body.depreciationSchedule = calculateDepreciation({
                cost: req.body.purchaseCost || asset.purchaseCost,
                salvageValue: req.body.salvageValue || asset.salvageValue,
                usefulLife: req.body.usefulLife || asset.usefulLife,
                method: req.body.depreciationMethod || asset.depreciationMethod,
                purchaseDate: new Date(req.body.purchaseDate || asset.purchaseDate)
            });
        }

        Object.assign(asset, req.body);
        asset.updatedBy = req.user.userId;
        await asset.save();

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'asset_updated',
            target: asset._id,
            details: {
                name: asset.name,
                assetNumber: asset.assetNumber
            }
        });

        res.status(200).json({
            success: true,
            message: 'Asset updated successfully',
            data: asset
        });
    } catch (error) {
        console.error('Update asset error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update asset'
        });
    }
};

// @desc    Dispose asset
// @route   POST /api/finance/assets/:id/dispose
// @access  Private (requires finance.asset_dispose)
const disposeAsset = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { disposalDate, disposalMethod, disposalProceeds, disposalReason } = req.body;

        if (!disposalDate || !disposalMethod) {
            return res.status(400).json({
                success: false,
                message: 'Disposal date and method are required'
            });
        }

        const asset = await Asset.findOne({ 
            _id: req.params.id,
            organization: organizationId,
            status: { $nin: ['disposed', 'sold'] }
        });

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found or already disposed'
            });
        }

        // Calculate book value at disposal date
        const bookValue = await asset.calculateBookValue(new Date(disposalDate));
        
        // Calculate gain/loss on disposal
        const disposalProceedsAmount = disposalProceeds || 0;
        const gainLoss = disposalProceedsAmount - bookValue;

        // Update asset
        asset.status = disposalMethod === 'sold' ? 'sold' : 'disposed';
        asset.disposalDate = new Date(disposalDate);
        asset.disposalMethod = disposalMethod;
        asset.disposalProceeds = disposalProceedsAmount;
        asset.disposalReason = disposalReason;
        asset.gainLossOnDisposal = gainLoss;
        asset.updatedBy = req.user.userId;
        await asset.save();

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'asset_disposed',
            target: asset._id,
            details: {
                name: asset.name,
                assetNumber: asset.assetNumber,
                disposalMethod,
                gainLoss
            }
        });

        res.status(200).json({
            success: true,
            message: 'Asset disposed successfully',
            data: {
                asset,
                bookValueAtDisposal: bookValue,
                gainLoss
            }
        });
    } catch (error) {
        console.error('Dispose asset error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to dispose asset'
        });
    }
};

// @desc    Calculate depreciation for asset (renamed to avoid conflict)
// @route   POST /api/finance/assets/:id/calculate-depreciation
// @access  Private (requires finance.asset_depreciate)
const calculateAssetDepreciation = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { asOfDate } = req.body;

        const asset = await Asset.findOne({ 
            _id: req.params.id,
            organization: organizationId
        });

        if (!asset) {
            return res.status(404).json({
                success: false,
                message: 'Asset not found'
            });
        }

        const depreciation = await asset.calculateDepreciation(asOfDate ? new Date(asOfDate) : new Date());
        const projection = await asset.getDepreciationProjection();

        res.status(200).json({
            success: true,
            data: {
                depreciation,
                projection
            }
        });
    } catch (error) {
        console.error('Calculate depreciation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate depreciation'
        });
    }
};

// @desc    Get asset summary
// @route   GET /api/finance/assets/summary
// @access  Private (requires finance.asset_view)
const getAssetSummary = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const assets = await Asset.find({ organization: organizationId });

        const summary = {
            total: {
                count: assets.length,
                cost: 0,
                bookValue: 0,
                accumulatedDepreciation: 0
            },
            byType: {},
            byStatus: {
                active: { count: 0, cost: 0, bookValue: 0 },
                disposed: { count: 0, cost: 0, bookValue: 0 },
                sold: { count: 0, cost: 0, bookValue: 0 }
            }
        };

        for (const asset of assets) {
            const bookValue = await asset.calculateBookValue();
            
            // Update totals
            summary.total.cost += asset.purchaseCost;
            summary.total.bookValue += bookValue;
            summary.total.accumulatedDepreciation += asset.accumulatedDepreciation;

            // Update by type
            if (!summary.byType[asset.type]) {
                summary.byType[asset.type] = {
                    count: 0,
                    cost: 0,
                    bookValue: 0
                };
            }
            summary.byType[asset.type].count++;
            summary.byType[asset.type].cost += asset.purchaseCost;
            summary.byType[asset.type].bookValue += bookValue;

            // Update by status
            const status = asset.status === 'active' ? 'active' : 
                          (asset.status === 'disposed' ? 'disposed' : 'sold');
            summary.byStatus[status].count++;
            summary.byStatus[status].cost += asset.purchaseCost;
            summary.byStatus[status].bookValue += bookValue;
        }

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
    getAssets,
    getAsset,
    createAsset,
    updateAsset,
    disposeAsset,
    calculateAssetDepreciation,  // Renamed function
    getAssetSummary
};