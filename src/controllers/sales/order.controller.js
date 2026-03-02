// src/controllers/sales/order.controller.js
const { Order, Quote } = require('../../models/sales');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all orders
// @route   GET /api/sales/orders
// @access  Private (requires sales.orders_view)
const getOrders = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            status,
            customerId,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { organization: organizationId };
        
        if (status) filter.status = status;
        if (customerId) filter.customer = customerId;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('customer', 'name email')
            .populate('quote', 'quoteNumber')
            .populate('createdBy', 'firstName lastName');

        const total = await Order.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
};

// @desc    Get single order
// @route   GET /api/sales/orders/:id
// @access  Private (requires sales.orders_view)
const getOrder = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const order = await Order.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('customer', 'name email phone address')
        .populate('quote', 'quoteNumber')
        .populate('createdBy', 'firstName lastName')
        .populate('fulfilledBy', 'firstName lastName')
        .populate('invoicedBy', 'firstName lastName')
        .populate('items.product', 'name code');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order'
        });
    }
};

// @desc    Create order
// @route   POST /api/sales/orders
// @access  Private (requires sales.orders_create)
const createOrder = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        // Generate order number
        const orderCount = await Order.countDocuments({ organization: organizationId });
        const orderNumber = `O-${new Date().getFullYear()}-${String(orderCount + 1).padStart(5, '0')}`;

        // If order is from a quote, update quote status
        if (req.body.quote) {
            await Quote.findByIdAndUpdate(req.body.quote, {
                status: 'ordered',
                orderId: null // Will be updated after order creation
            });
        }

        const orderData = {
            ...req.body,
            orderNumber,
            organization: organizationId,
            createdBy: req.user.userId,
            status: 'pending'
        };

        const order = await Order.create(orderData);

        // Update quote with order ID if from quote
        if (req.body.quote) {
            await Quote.findByIdAndUpdate(req.body.quote, {
                orderId: order._id
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'order_created',
            target: order._id,
            details: {
                orderNumber: order.orderNumber,
                customer: order.customer,
                total: order.total
            }
        });

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: order
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create order'
        });
    }
};

// @desc    Update order
// @route   PUT /api/sales/orders/:id
// @access  Private (requires sales.orders_update)
const updateOrder = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const order = await Order.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: { $in: ['pending', 'processing'] }
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or cannot be updated'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order updated successfully',
            data: order
        });
    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order'
        });
    }
};

// @desc    Delete order
// @route   DELETE /api/sales/orders/:id
// @access  Private (requires sales.orders_delete)
const deleteOrder = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const order = await Order.findOneAndDelete({
            _id: req.params.id,
            organization: organizationId,
            status: 'cancelled'
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or cannot be deleted'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete order'
        });
    }
};

// @desc    Fulfill order
// @route   POST /api/sales/orders/:id/fulfill
// @access  Private (requires sales.orders_fulfill)
const fulfillOrder = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { trackingNumber, carrier, fulfillmentDate } = req.body;

        const order = await Order.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: 'processing'
            },
            {
                status: 'shipped',
                fulfillmentDate: fulfillmentDate || new Date(),
                trackingNumber,
                carrier,
                fulfilledBy: req.user.userId
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or cannot be fulfilled'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order fulfilled successfully',
            data: order
        });
    } catch (error) {
        console.error('Fulfill order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fulfill order'
        });
    }
};

// @desc    Cancel order
// @route   POST /api/sales/orders/:id/cancel
// @access  Private (requires sales.orders_cancel)
const cancelOrder = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Cancellation reason is required'
            });
        }

        const order = await Order.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: { $in: ['pending', 'processing'] }
            },
            {
                status: 'cancelled',
                cancellationReason: reason,
                cancelledAt: new Date(),
                cancelledBy: req.user.userId
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or cannot be cancelled'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            data: order
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order'
        });
    }
};

// @desc    Invoice order
// @route   POST /api/sales/orders/:id/invoice
// @access  Private (requires sales.orders_invoice)
const invoiceOrder = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { invoiceNumber, invoiceDate } = req.body;

        const order = await Order.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: 'shipped'
            },
            {
                status: 'invoiced',
                invoiceNumber,
                invoiceDate: invoiceDate || new Date(),
                invoicedBy: req.user.userId
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or cannot be invoiced'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order invoiced successfully',
            data: order
        });
    } catch (error) {
        console.error('Invoice order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to invoice order'
        });
    }
};

module.exports = {
    getOrders,
    getOrder,
    createOrder,
    updateOrder,
    deleteOrder,
    fulfillOrder,
    cancelOrder,
    invoiceOrder
};