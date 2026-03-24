// src/controllers/sales/customer.controller.js
const { Customer } = require('../../models/sales');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all customers
// @route   GET /api/sales/customers
// @access  Private (requires sales.customers_view)
const getCustomers = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            type,
            industry,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = -1
        } = req.query;

        const filter = { organization: organizationId };
        
        if (type) filter.type = type;
        if (industry) filter.industry = industry;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const customers = await Customer.find(filter)
            .sort({ [sortBy]: parseInt(sortOrder) })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('primaryContact', 'firstName lastName email phone');

        const total = await Customer.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: customers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customers'
        });
    }
};

// @desc    Get single customer
// @route   GET /api/sales/customers/:id
// @access  Private (requires sales.customers_view)
const getCustomer = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const customer = await Customer.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('primaryContact', 'firstName lastName email phone')
        .populate('contacts', 'firstName lastName email phone')
        .populate('createdBy', 'firstName lastName');

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.status(200).json({
            success: true,
            data: customer
        });
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customer'
        });
    }
};

// @desc    Create customer
// @route   POST /api/sales/customers
// @access  Private (requires sales.customers_create)
const createCustomer = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        // Generate customer code
        const customerCount = await Customer.countDocuments({ organization: organizationId });
        const customerCode = `CUST-${String(customerCount + 1).padStart(5, '0')}`;

        const customerData = {
            ...req.body,
            customerCode,
            organization: organizationId,
            createdBy: req.user.userId
        };

        const customer = await Customer.create(customerData);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'customer_created',
            target: customer._id,
            details: {
                name: customer.name,
                customerCode: customer.customerCode,
                email: customer.email
            }
        });

        res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            data: customer
        });
    } catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create customer'
        });
    }
};

// @desc    Update customer
// @route   PUT /api/sales/customers/:id
// @access  Private (requires sales.customers_update)
const updateCustomer = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const customer = await Customer.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'customer_updated',
            target: customer._id,
            details: {
                name: customer.name,
                customerCode: customer.customerCode
            }
        });

        res.status(200).json({
            success: true,
            message: 'Customer updated successfully',
            data: customer
        });
    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update customer'
        });
    }
};

// @desc    Delete customer
// @route   DELETE /api/sales/customers/:id
// @access  Private (requires sales.customers_delete)
const deleteCustomer = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const customer = await Customer.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId
            },
            { isActive: false },
            { new: true }
        );

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'customer_deleted',
            target: customer._id,
            details: {
                name: customer.name,
                customerCode: customer.customerCode
            }
        });

        res.status(200).json({
            success: true,
            message: 'Customer deleted successfully'
        });
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete customer'
        });
    }
};

module.exports = {
    getCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer
};