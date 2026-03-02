// src/controllers/sales/ticket.controller.js
const { Ticket } = require('../../models/sales');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all tickets
// @route   GET /api/sales/tickets
// @access  Private (requires sales.tickets_view)
const getTickets = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            status,
            priority,
            assignedTo,
            customerId,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { organization: organizationId };
        
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (assignedTo) filter.assignedTo = assignedTo;
        if (customerId) filter.customer = customerId;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const tickets = await Ticket.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('customer', 'name')
            .populate('contact', 'firstName lastName')
            .populate('assignedTo', 'firstName lastName')
            .populate('createdBy', 'firstName lastName');

        const total = await Ticket.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: tickets,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tickets'
        });
    }
};

// @desc    Get single ticket
// @route   GET /api/sales/tickets/:id
// @access  Private (requires sales.tickets_view)
const getTicket = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const ticket = await Ticket.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('customer', 'name email phone')
        .populate('contact', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .populate('resolvedBy', 'firstName lastName');

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.status(200).json({
            success: true,
            data: ticket
        });
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ticket'
        });
    }
};

// @desc    Create ticket
// @route   POST /api/sales/tickets
// @access  Private (requires sales.tickets_create)
const createTicket = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        // Generate ticket number
        const ticketCount = await Ticket.countDocuments({ organization: organizationId });
        const ticketNumber = `TKT-${new Date().getFullYear()}-${String(ticketCount + 1).padStart(5, '0')}`;

        const ticketData = {
            ...req.body,
            ticketNumber,
            organization: organizationId,
            createdBy: req.user.userId,
            status: 'open'
        };

        const ticket = await Ticket.create(ticketData);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'ticket_created',
            target: ticket._id,
            details: {
                ticketNumber: ticket.ticketNumber,
                subject: ticket.subject,
                priority: ticket.priority
            }
        });

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            data: ticket
        });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create ticket'
        });
    }
};

// @desc    Update ticket
// @route   PUT /api/sales/tickets/:id
// @access  Private (requires sales.tickets_update)
const updateTicket = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const ticket = await Ticket.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Ticket updated successfully',
            data: ticket
        });
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update ticket'
        });
    }
};

// @desc    Delete ticket
// @route   DELETE /api/sales/tickets/:id
// @access  Private (requires sales.tickets_delete)
const deleteTicket = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const ticket = await Ticket.findOneAndDelete({
            _id: req.params.id,
            organization: organizationId
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Ticket deleted successfully'
        });
    } catch (error) {
        console.error('Delete ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete ticket'
        });
    }
};

// @desc    Assign ticket
// @route   POST /api/sales/tickets/:id/assign
// @access  Private (requires sales.tickets_assign)
const assignTicket = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { assignedTo } = req.body;

        if (!assignedTo) {
            return res.status(400).json({
                success: false,
                message: 'Assignee is required'
            });
        }

        const ticket = await Ticket.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId
            },
            {
                assignedTo,
                assignedAt: new Date(),
                status: 'assigned'
            },
            { new: true }
        );

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Ticket assigned successfully',
            data: ticket
        });
    } catch (error) {
        console.error('Assign ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign ticket'
        });
    }
};

// @desc    Resolve ticket
// @route   POST /api/sales/tickets/:id/resolve
// @access  Private (requires sales.tickets_resolve)
const resolveTicket = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { resolution, resolutionNotes } = req.body;

        const ticket = await Ticket.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId,
                status: { $in: ['open', 'assigned', 'in-progress'] }
            },
            {
                status: 'resolved',
                resolution,
                resolutionNotes,
                resolvedAt: new Date(),
                resolvedBy: req.user.userId
            },
            { new: true }
        );

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found or cannot be resolved'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Ticket resolved successfully',
            data: ticket
        });
    } catch (error) {
        console.error('Resolve ticket error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resolve ticket'
        });
    }
};

module.exports = {
    getTickets,
    getTicket,
    createTicket,
    updateTicket,
    deleteTicket,
    assignTicket,
    resolveTicket
};