// src/controllers/sales/contact.controller.js
const { Contact } = require('../../models/sales');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all contacts
// @route   GET /api/sales/contacts
// @access  Private (requires sales.contacts_view)
const getContacts = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            customerId,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { organization: organizationId };
        
        if (customerId) filter.customer = customerId;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const contacts = await Contact.find(filter)
            .sort({ lastName: 1, firstName: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('customer', 'name customerCode');

        const total = await Contact.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: contacts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contacts'
        });
    }
};

// @desc    Get single contact
// @route   GET /api/sales/contacts/:id
// @access  Private (requires sales.contacts_view)
const getContact = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const contact = await Contact.findOne({ 
            _id: req.params.id,
            organization: organizationId
        })
        .populate('customer', 'name customerCode email phone')
        .populate('createdBy', 'firstName lastName');

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.status(200).json({
            success: true,
            data: contact
        });
    } catch (error) {
        console.error('Get contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contact'
        });
    }
};

// @desc    Create contact
// @route   POST /api/sales/contacts
// @access  Private (requires sales.contacts_create)
const createContact = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const contactData = {
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId
        };

        const contact = await Contact.create(contactData);

        // If this is set as primary contact, update customer
        if (contact.isPrimary) {
            await Customer.findByIdAndUpdate(contact.customer, {
                primaryContact: contact._id
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'contact_created',
            target: contact._id,
            details: {
                name: `${contact.firstName} ${contact.lastName}`,
                email: contact.email,
                customer: contact.customer
            }
        });

        res.status(201).json({
            success: true,
            message: 'Contact created successfully',
            data: contact
        });
    } catch (error) {
        console.error('Create contact error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create contact'
        });
    }
};

// @desc    Update contact
// @route   PUT /api/sales/contacts/:id
// @access  Private (requires sales.contacts_update)
const updateContact = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const contact = await Contact.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        // If this is set as primary contact, update customer
        if (req.body.isPrimary) {
            await Customer.findByIdAndUpdate(contact.customer, {
                primaryContact: contact._id
            });
        }

        res.status(200).json({
            success: true,
            message: 'Contact updated successfully',
            data: contact
        });
    } catch (error) {
        console.error('Update contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update contact'
        });
    }
};

// @desc    Delete contact
// @route   DELETE /api/sales/contacts/:id
// @access  Private (requires sales.contacts_delete)
const deleteContact = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const contact = await Contact.findOneAndDelete({
            _id: req.params.id,
            organization: organizationId
        });

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        // If this was primary contact, remove from customer
        if (contact.isPrimary) {
            await Customer.findByIdAndUpdate(contact.customer, {
                $unset: { primaryContact: 1 }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Contact deleted successfully'
        });
    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete contact'
        });
    }
};

module.exports = {
    getContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact
};