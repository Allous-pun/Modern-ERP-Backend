// src/controllers/finance/tax.controller.js
const { Tax, Invoice } = require('../../models/finance');
const AuditLog = require('../../models/auditLog.model');
const mongoose = require('mongoose');

// @desc    Get all tax rates
// @route   GET /api/finance/tax/rates
// @access  Private (requires finance.tax_view)
const getTaxRates = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            type,
            isActive = true,
            page = 1,
            limit = 50
        } = req.query;

        const filter = { 
            organization: organizationId,
            isActive: isActive === 'true'
        };
        
        if (type) filter.type = type;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const taxRates = await Tax.find(filter)
            .sort({ name: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Tax.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: taxRates,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get tax rates error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tax rates'
        });
    }
};

// @desc    Create tax rate
// @route   POST /api/finance/tax/rates
// @access  Private (requires finance.tax_manage)
const createTaxRate = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        // Check if code already exists
        const existingTax = await Tax.findOne({
            organization: organizationId,
            code: req.body.code
        });

        if (existingTax) {
            return res.status(400).json({
                success: false,
                message: 'Tax code already exists'
            });
        }

        const taxData = {
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId
        };

        const tax = await Tax.create(taxData);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'tax_rate_created',
            target: tax._id,
            details: {
                code: tax.code,
                name: tax.name,
                rate: tax.rate
            }
        });

        res.status(201).json({
            success: true,
            message: 'Tax rate created successfully',
            data: tax
        });
    } catch (error) {
        console.error('Create tax rate error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create tax rate'
        });
    }
};

// @desc    Update tax rate
// @route   PUT /api/finance/tax/rates/:id
// @access  Private (requires finance.tax_manage)
const updateTaxRate = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const tax = await Tax.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!tax) {
            return res.status(404).json({
                success: false,
                message: 'Tax rate not found'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'tax_rate_updated',
            target: tax._id,
            details: {
                code: tax.code,
                name: tax.name,
                rate: tax.rate
            }
        });

        res.status(200).json({
            success: true,
            message: 'Tax rate updated successfully',
            data: tax
        });
    } catch (error) {
        console.error('Update tax rate error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update tax rate'
        });
    }
};

// @desc    Delete tax rate
// @route   DELETE /api/finance/tax/rates/:id
// @access  Private (requires finance.tax_manage)
const deleteTaxRate = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        // Check if tax rate is used in any invoices
        const usedInInvoices = await Invoice.exists({
            organization: organizationId,
            'items.taxRate': req.params.id
        });

        if (usedInInvoices) {
            // Soft delete - just deactivate
            const tax = await Tax.findOneAndUpdate(
                { 
                    _id: req.params.id,
                    organization: organizationId
                },
                { isActive: false },
                { new: true }
            );

            if (!tax) {
                return res.status(404).json({
                    success: false,
                    message: 'Tax rate not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Tax rate deactivated successfully'
            });
        } else {
            // Hard delete - not used
            const tax = await Tax.findOneAndDelete({
                _id: req.params.id,
                organization: organizationId
            });

            if (!tax) {
                return res.status(404).json({
                    success: false,
                    message: 'Tax rate not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Tax rate deleted successfully'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'tax_rate_deleted',
            target: req.params.id
        });
    } catch (error) {
        console.error('Delete tax rate error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete tax rate'
        });
    }
};

// @desc    Get tax returns
// @route   GET /api/finance/tax/returns
// @access  Private (requires finance.tax_view)
const getTaxReturns = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            type,
            period,
            year,
            page = 1,
            limit = 20
        } = req.query;

        // This would typically query a TaxReturn model
        // For now, generate mock tax return data
        const taxReturns = [];
        
        // Generate mock tax returns for the last 4 quarters
        const quarters = [1, 2, 3, 4];
        const currentYear = year ? parseInt(year) : new Date().getFullYear();
        
        for (const quarter of quarters) {
            if (type && type !== 'vat') continue;
            
            const startDate = new Date(currentYear, (quarter - 1) * 3, 1);
            const endDate = new Date(currentYear, quarter * 3, 0);
            
            // Calculate tax from invoices
            const invoices = await Invoice.find({
                organization: organizationId,
                issueDate: { $gte: startDate, $lte: endDate },
                status: { $in: ['approved', 'paid'] }
            });

            const totalSales = invoices
                .filter(i => i.invoiceType === 'sales')
                .reduce((sum, i) => sum + i.totalAmount, 0);
                
            const totalPurchases = invoices
                .filter(i => i.invoiceType === 'purchase')
                .reduce((sum, i) => sum + i.totalAmount, 0);

            const taxCollected = totalSales * 0.2; // Assuming 20% VAT
            const taxPaid = totalPurchases * 0.2;
            const netTaxDue = taxCollected - taxPaid;

            taxReturns.push({
                id: `tax-${currentYear}-Q${quarter}`,
                type: 'vat',
                period: `Q${quarter} ${currentYear}`,
                startDate,
                endDate,
                status: ['filed', 'pending', 'draft'][Math.floor(Math.random() * 3)],
                dueDate: new Date(currentYear, quarter * 3, 15),
                filedDate: Math.random() > 0.3 ? new Date(currentYear, quarter * 3, 10) : null,
                totalSales,
                totalPurchases,
                taxCollected,
                taxPaid,
                netTaxDue,
                currency: 'USD'
            });
        }

        // Apply filters
        let filtered = taxReturns;
        if (period) {
            filtered = filtered.filter(t => t.period.includes(period));
        }
        if (type) {
            filtered = filtered.filter(t => t.type === type);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginated = filtered.slice(skip, skip + parseInt(limit));

        res.status(200).json({
            success: true,
            data: paginated,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: filtered.length,
                pages: Math.ceil(filtered.length / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get tax returns error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tax returns'
        });
    }
};

// @desc    File tax return
// @route   POST /api/finance/tax/returns/file
// @access  Private (requires finance.tax_file)
const fileTaxReturn = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            type, 
            period, 
            year,
            taxPeriod,
            taxData
        } = req.body;

        // Validate required fields
        if (!type || !period || !year) {
            return res.status(400).json({
                success: false,
                message: 'Type, period, and year are required'
            });
        }

        // Here you would typically:
        // 1. Validate the tax data
        // 2. Generate tax return document
        // 3. Submit to tax authority API (if integrated)
        // 4. Save to TaxReturn model

        // Mock successful filing
        const filing = {
            id: `tax-${year}-${period}-${Date.now()}`,
            type,
            period,
            year,
            filedAt: new Date(),
            filedBy: req.user.userId,
            status: 'filed',
            confirmationNumber: `TAX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            taxData
        };

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'tax_return_filed',
            details: {
                type,
                period,
                year
            }
        });

        res.status(200).json({
            success: true,
            message: 'Tax return filed successfully',
            data: filing
        });
    } catch (error) {
        console.error('File tax return error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to file tax return'
        });
    }
};

// @desc    Get tax summary
// @route   GET /api/finance/tax/summary
// @access  Private (requires finance.tax_view)
const getTaxSummary = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { year = new Date().getFullYear() } = req.query;

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);

        // Get all invoices for the year
        const invoices = await Invoice.find({
            organization: organizationId,
            issueDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['approved', 'paid'] }
        }).populate('items.account');

        const summary = {
            year: parseInt(year),
            byTaxRate: {},
            byType: {
                sales: {
                    taxable: 0,
                    tax: 0
                },
                purchases: {
                    taxable: 0,
                    tax: 0
                }
            },
            total: {
                taxable: 0,
                tax: 0
            }
        };

        for (const invoice of invoices) {
            const type = invoice.invoiceType === 'sales' ? 'sales' : 'purchases';
            
            for (const item of invoice.items) {
                const taxRate = item.taxRate || 0;
                const key = `${taxRate}%`;
                
                if (!summary.byTaxRate[key]) {
                    summary.byTaxRate[key] = {
                        rate: taxRate,
                        taxable: 0,
                        tax: 0
                    };
                }

                summary.byTaxRate[key].taxable += item.amount;
                summary.byTaxRate[key].tax += item.taxAmount;
                
                summary.byType[type].taxable += item.amount;
                summary.byType[type].tax += item.taxAmount;
                
                summary.total.taxable += item.amount;
                summary.total.tax += item.taxAmount;
            }
        }

        // Convert to array for easier consumption
        summary.byTaxRate = Object.values(summary.byTaxRate);

        res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Get tax summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tax summary'
        });
    }
};

module.exports = {
    getTaxRates,
    createTaxRate,
    updateTaxRate,
    deleteTaxRate,
    getTaxReturns,
    fileTaxReturn,
    getTaxSummary
};