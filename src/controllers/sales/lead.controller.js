// src/controllers/sales/lead.controller.js
const { Lead, Customer, Contact } = require('../../models/sales');
const AuditLog = require('../../models/auditLog.model');
const mongoose = require('mongoose');

// @desc    Get all leads
// @route   GET /api/sales/leads
// @access  Private (requires sales.leads_view)
const getLeads = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            status,
            source,
            assignedTo,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = -1
        } = req.query;

        const filter = { organization: organizationId };
        
        if (status) filter.status = status;
        if (source) filter.source = source;
        if (assignedTo) filter.assignedTo = assignedTo;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const leads = await Lead.find(filter)
            .sort({ [sortBy]: parseInt(sortOrder) })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('assignedTo', 'firstName lastName email')
            .populate('convertedTo', 'name email');

        const total = await Lead.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: leads,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leads'
        });
    }
};

// @desc    Get single lead
// @route   GET /api/sales/leads/:id
// @access  Private (requires sales.leads_view)
const getLead = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const lead = await Lead.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('assignedTo', 'firstName lastName email')
        .populate('convertedTo', 'name email');

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        res.status(200).json({
            success: true,
            data: lead
        });
    } catch (error) {
        console.error('Get lead error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch lead'
        });
    }
};

// @desc    Create lead
// @route   POST /api/sales/leads
// @access  Private (requires sales.leads_create)
const createLead = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const leadData = {
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId
        };

        const lead = await Lead.create(leadData);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'lead_created',
            target: lead._id,
            details: {
                name: `${lead.firstName} ${lead.lastName}`,
                company: lead.company,
                email: lead.email
            }
        });

        res.status(201).json({
            success: true,
            message: 'Lead created successfully',
            data: lead
        });
    } catch (error) {
        console.error('Create lead error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create lead'
        });
    }
};

// @desc    Update lead
// @route   PUT /api/sales/leads/:id
// @access  Private (requires sales.leads_update)
const updateLead = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const lead = await Lead.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'lead_updated',
            target: lead._id,
            details: {
                name: `${lead.firstName} ${lead.lastName}`,
                company: lead.company
            }
        });

        res.status(200).json({
            success: true,
            message: 'Lead updated successfully',
            data: lead
        });
    } catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update lead'
        });
    }
};

// @desc    Delete lead
// @route   DELETE /api/sales/leads/:id
// @access  Private (requires sales.leads_delete)
const deleteLead = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const lead = await Lead.findOneAndDelete({
            _id: req.params.id,
            organization: organizationId
        });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'lead_deleted',
            target: lead._id,
            details: {
                name: `${lead.firstName} ${lead.lastName}`,
                email: lead.email
            }
        });

        res.status(200).json({
            success: true,
            message: 'Lead deleted successfully'
        });
    } catch (error) {
        console.error('Delete lead error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete lead'
        });
    }
};

// @desc    Convert lead to customer/contact
// @route   POST /api/sales/leads/:id/convert
// @access  Private (requires sales.leads_convert)
const convertLead = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const lead = await Lead.findOne({ 
            _id: req.params.id,
            organization: organizationId
        }).session(session);

        if (!lead) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        if (lead.status === 'converted') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Lead already converted'
            });
        }

        // Create customer
        const customer = await Customer.create([{
            organization: organizationId,
            name: lead.company || `${lead.firstName} ${lead.lastName}`,
            email: lead.email,
            phone: lead.phone,
            website: lead.website,
            industry: lead.industry,
            address: lead.address,
            source: 'lead_conversion',
            createdBy: req.user.userId
        }], { session });

        // Create contact
        const contact = await Contact.create([{
            organization: organizationId,
            customer: customer[0]._id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            position: lead.position,
            isPrimary: true,
            createdBy: req.user.userId
        }], { session });

        // Update lead
        lead.status = 'converted';
        lead.convertedTo = customer[0]._id;
        lead.convertedAt = new Date();
        lead.convertedBy = req.user.userId;
        await lead.save({ session });

        await session.commitTransaction();
        session.endSession();

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'lead_converted',
            target: lead._id,
            details: {
                leadName: `${lead.firstName} ${lead.lastName}`,
                customerId: customer[0]._id,
                contactId: contact[0]._id
            }
        });

        res.status(200).json({
            success: true,
            message: 'Lead converted successfully',
            data: {
                lead,
                customer: customer[0],
                contact: contact[0]
            }
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Convert lead error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to convert lead'
        });
    }
};

module.exports = {
    getLeads,
    getLead,
    createLead,
    updateLead,
    deleteLead,
    convertLead
};