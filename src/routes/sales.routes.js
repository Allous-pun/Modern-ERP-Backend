// src/routes/sales.routes.js
const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { requireModule } = require('../middleware/module.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const salesController = require('../controllers/sales');

const router = express.Router();

// All sales routes require:
// 1. Authentication (protect)
// 2. Sales module installed (requireModule)
router.use(protect);
router.use(requireModule('sales'));

// ============================================================================
// LEAD ROUTES
// ============================================================================

// @route   GET /api/sales/leads
// @desc    Get all leads
// @access  Private (requires sales.leads_view)
router.get('/leads',
    requirePermission('sales.leads_view'),
    salesController.getLeads
);

// @route   GET /api/sales/leads/:id
// @desc    Get single lead
// @access  Private (requires sales.leads_view)
router.get('/leads/:id',
    requirePermission('sales.leads_view'),
    salesController.getLead
);

// @route   POST /api/sales/leads
// @desc    Create lead
// @access  Private (requires sales.leads_create)
router.post('/leads',
    requirePermission('sales.leads_create'),
    salesController.createLead
);

// @route   PUT /api/sales/leads/:id
// @desc    Update lead
// @access  Private (requires sales.leads_update)
router.put('/leads/:id',
    requirePermission('sales.leads_update'),
    salesController.updateLead
);

// @route   DELETE /api/sales/leads/:id
// @desc    Delete lead
// @access  Private (requires sales.leads_delete)
router.delete('/leads/:id',
    requirePermission('sales.leads_delete'),
    salesController.deleteLead
);

// @route   POST /api/sales/leads/:id/convert
// @desc    Convert lead to customer/contact
// @access  Private (requires sales.leads_convert)
router.post('/leads/:id/convert',
    requirePermission('sales.leads_convert'),
    salesController.convertLead
);

// ============================================================================
// OPPORTUNITY ROUTES
// ============================================================================

// @route   GET /api/sales/opportunities
// @desc    Get all opportunities
// @access  Private (requires sales.opportunities_view)
router.get('/opportunities',
    requirePermission('sales.opportunities_view'),
    salesController.getOpportunities
);

// @route   GET /api/sales/opportunities/:id
// @desc    Get single opportunity
// @access  Private (requires sales.opportunities_view)
router.get('/opportunities/:id',
    requirePermission('sales.opportunities_view'),
    salesController.getOpportunity
);

// @route   POST /api/sales/opportunities
// @desc    Create opportunity
// @access  Private (requires sales.opportunities_create)
router.post('/opportunities',
    requirePermission('sales.opportunities_create'),
    salesController.createOpportunity
);

// @route   PUT /api/sales/opportunities/:id
// @desc    Update opportunity
// @access  Private (requires sales.opportunities_update)
router.put('/opportunities/:id',
    requirePermission('sales.opportunities_update'),
    salesController.updateOpportunity
);

// @route   DELETE /api/sales/opportunities/:id
// @desc    Delete opportunity
// @access  Private (requires sales.opportunities_delete)
router.delete('/opportunities/:id',
    requirePermission('sales.opportunities_delete'),
    salesController.deleteOpportunity
);

// @route   PUT /api/sales/opportunities/:id/stage
// @desc    Update opportunity stage
// @access  Private (requires sales.opportunities_update)
router.put('/opportunities/:id/stage',
    requirePermission('sales.opportunities_update'),
    salesController.updateOpportunityStage
);

// ============================================================================
// QUOTE ROUTES
// ============================================================================

// @route   GET /api/sales/quotes
// @desc    Get all quotes
// @access  Private (requires sales.quotes_view)
router.get('/quotes',
    requirePermission('sales.quotes_view'),
    salesController.getQuotes
);

// @route   GET /api/sales/quotes/:id
// @desc    Get single quote
// @access  Private (requires sales.quotes_view)
router.get('/quotes/:id',
    requirePermission('sales.quotes_view'),
    salesController.getQuote
);

// @route   POST /api/sales/quotes
// @desc    Create quote
// @access  Private (requires sales.quotes_create)
router.post('/quotes',
    requirePermission('sales.quotes_create'),
    salesController.createQuote
);

// @route   PUT /api/sales/quotes/:id
// @desc    Update quote
// @access  Private (requires sales.quotes_update)
router.put('/quotes/:id',
    requirePermission('sales.quotes_update'),
    salesController.updateQuote
);

// @route   DELETE /api/sales/quotes/:id
// @desc    Delete quote
// @access  Private (requires sales.quotes_delete)
router.delete('/quotes/:id',
    requirePermission('sales.quotes_delete'),
    salesController.deleteQuote
);

// @route   POST /api/sales/quotes/:id/approve
// @desc    Approve quote
// @access  Private (requires sales.quotes_approve)
router.post('/quotes/:id/approve',
    requirePermission('sales.quotes_approve'),
    salesController.approveQuote
);

// @route   POST /api/sales/quotes/:id/reject
// @desc    Reject quote
// @access  Private (requires sales.quotes_approve)
router.post('/quotes/:id/reject',
    requirePermission('sales.quotes_approve'),
    salesController.rejectQuote
);

// @route   POST /api/sales/quotes/:id/convert-to-order
// @desc    Convert quote to order
// @access  Private (requires sales.quotes_convert)
router.post('/quotes/:id/convert-to-order',
    requirePermission('sales.quotes_convert'),
    salesController.convertQuoteToOrder
);

// ============================================================================
// ORDER ROUTES
// ============================================================================

// @route   GET /api/sales/orders
// @desc    Get all orders
// @access  Private (requires sales.orders_view)
router.get('/orders',
    requirePermission('sales.orders_view'),
    salesController.getOrders
);

// @route   GET /api/sales/orders/:id
// @desc    Get single order
// @access  Private (requires sales.orders_view)
router.get('/orders/:id',
    requirePermission('sales.orders_view'),
    salesController.getOrder
);

// @route   POST /api/sales/orders
// @desc    Create order
// @access  Private (requires sales.orders_create)
router.post('/orders',
    requirePermission('sales.orders_create'),
    salesController.createOrder
);

// @route   PUT /api/sales/orders/:id
// @desc    Update order
// @access  Private (requires sales.orders_update)
router.put('/orders/:id',
    requirePermission('sales.orders_update'),
    salesController.updateOrder
);

// @route   DELETE /api/sales/orders/:id
// @desc    Delete order
// @access  Private (requires sales.orders_delete)
router.delete('/orders/:id',
    requirePermission('sales.orders_delete'),
    salesController.deleteOrder
);

// @route   POST /api/sales/orders/:id/fulfill
// @desc    Fulfill order
// @access  Private (requires sales.orders_fulfill)
router.post('/orders/:id/fulfill',
    requirePermission('sales.orders_fulfill'),
    salesController.fulfillOrder
);

// @route   POST /api/sales/orders/:id/cancel
// @desc    Cancel order
// @access  Private (requires sales.orders_cancel)
router.post('/orders/:id/cancel',
    requirePermission('sales.orders_cancel'),
    salesController.cancelOrder
);

// @route   POST /api/sales/orders/:id/invoice
// @desc    Invoice order
// @access  Private (requires sales.orders_invoice)
router.post('/orders/:id/invoice',
    requirePermission('sales.orders_invoice'),
    salesController.invoiceOrder
);

// ============================================================================
// CUSTOMER ROUTES
// ============================================================================

// @route   GET /api/sales/customers
// @desc    Get all customers
// @access  Private (requires sales.customers_view)
router.get('/customers',
    requirePermission('sales.customers_view'),
    salesController.getCustomers
);

// @route   GET /api/sales/customers/:id
// @desc    Get single customer
// @access  Private (requires sales.customers_view)
router.get('/customers/:id',
    requirePermission('sales.customers_view'),
    salesController.getCustomer
);

// @route   POST /api/sales/customers
// @desc    Create customer
// @access  Private (requires sales.customers_create)
router.post('/customers',
    requirePermission('sales.customers_create'),
    salesController.createCustomer
);

// @route   PUT /api/sales/customers/:id
// @desc    Update customer
// @access  Private (requires sales.customers_update)
router.put('/customers/:id',
    requirePermission('sales.customers_update'),
    salesController.updateCustomer
);

// @route   DELETE /api/sales/customers/:id
// @desc    Delete customer
// @access  Private (requires sales.customers_delete)
router.delete('/customers/:id',
    requirePermission('sales.customers_delete'),
    salesController.deleteCustomer
);

// ============================================================================
// CONTACT ROUTES
// ============================================================================

// @route   GET /api/sales/contacts
// @desc    Get all contacts
// @access  Private (requires sales.contacts_view)
router.get('/contacts',
    requirePermission('sales.contacts_view'),
    salesController.getContacts
);

// @route   GET /api/sales/contacts/:id
// @desc    Get single contact
// @access  Private (requires sales.contacts_view)
router.get('/contacts/:id',
    requirePermission('sales.contacts_view'),
    salesController.getContact
);

// @route   POST /api/sales/contacts
// @desc    Create contact
// @access  Private (requires sales.contacts_create)
router.post('/contacts',
    requirePermission('sales.contacts_create'),
    salesController.createContact
);

// @route   PUT /api/sales/contacts/:id
// @desc    Update contact
// @access  Private (requires sales.contacts_update)
router.put('/contacts/:id',
    requirePermission('sales.contacts_update'),
    salesController.updateContact
);

// @route   DELETE /api/sales/contacts/:id
// @desc    Delete contact
// @access  Private (requires sales.contacts_delete)
router.delete('/contacts/:id',
    requirePermission('sales.contacts_delete'),
    salesController.deleteContact
);

// ============================================================================
// INTERACTION ROUTES
// ============================================================================

// @route   GET /api/sales/interactions
// @desc    Get all interactions
// @access  Private (requires sales.interactions_view)
router.get('/interactions',
    requirePermission('sales.interactions_view'),
    salesController.getInteractions
);

// @route   GET /api/sales/interactions/:id
// @desc    Get single interaction
// @access  Private (requires sales.interactions_view)
router.get('/interactions/:id',
    requirePermission('sales.interactions_view'),
    salesController.getInteraction
);

// @route   POST /api/sales/interactions
// @desc    Create interaction
// @access  Private (requires sales.interactions_create)
router.post('/interactions',
    requirePermission('sales.interactions_create'),
    salesController.createInteraction
);

// @route   PUT /api/sales/interactions/:id
// @desc    Update interaction
// @access  Private (requires sales.interactions_update)
router.put('/interactions/:id',
    requirePermission('sales.interactions_update'),
    salesController.updateInteraction
);

// @route   DELETE /api/sales/interactions/:id
// @desc    Delete interaction
// @access  Private (requires sales.interactions_delete)
router.delete('/interactions/:id',
    requirePermission('sales.interactions_delete'),
    salesController.deleteInteraction
);

// ============================================================================
// CAMPAIGN ROUTES
// ============================================================================

// @route   GET /api/sales/campaigns
// @desc    Get all campaigns
// @access  Private (requires sales.campaigns_view)
router.get('/campaigns',
    requirePermission('sales.campaigns_view'),
    salesController.getCampaigns
);

// @route   GET /api/sales/campaigns/:id
// @desc    Get single campaign
// @access  Private (requires sales.campaigns_view)
router.get('/campaigns/:id',
    requirePermission('sales.campaigns_view'),
    salesController.getCampaign
);

// @route   POST /api/sales/campaigns
// @desc    Create campaign
// @access  Private (requires sales.campaigns_create)
router.post('/campaigns',
    requirePermission('sales.campaigns_create'),
    salesController.createCampaign
);

// @route   PUT /api/sales/campaigns/:id
// @desc    Update campaign
// @access  Private (requires sales.campaigns_update)
router.put('/campaigns/:id',
    requirePermission('sales.campaigns_update'),
    salesController.updateCampaign
);

// @route   DELETE /api/sales/campaigns/:id
// @desc    Delete campaign
// @access  Private (requires sales.campaigns_delete)
router.delete('/campaigns/:id',
    requirePermission('sales.campaigns_delete'),
    salesController.deleteCampaign
);

// ============================================================================
// TICKET ROUTES
// ============================================================================

// @route   GET /api/sales/tickets
// @desc    Get all tickets
// @access  Private (requires sales.tickets_view)
router.get('/tickets',
    requirePermission('sales.tickets_view'),
    salesController.getTickets
);

// @route   GET /api/sales/tickets/:id
// @desc    Get single ticket
// @access  Private (requires sales.tickets_view)
router.get('/tickets/:id',
    requirePermission('sales.tickets_view'),
    salesController.getTicket
);

// @route   POST /api/sales/tickets
// @desc    Create ticket
// @access  Private (requires sales.tickets_create)
router.post('/tickets',
    requirePermission('sales.tickets_create'),
    salesController.createTicket
);

// @route   PUT /api/sales/tickets/:id
// @desc    Update ticket
// @access  Private (requires sales.tickets_update)
router.put('/tickets/:id',
    requirePermission('sales.tickets_update'),
    salesController.updateTicket
);

// @route   DELETE /api/sales/tickets/:id
// @desc    Delete ticket
// @access  Private (requires sales.tickets_delete)
router.delete('/tickets/:id',
    requirePermission('sales.tickets_delete'),
    salesController.deleteTicket
);

// @route   POST /api/sales/tickets/:id/assign
// @desc    Assign ticket
// @access  Private (requires sales.tickets_assign)
router.post('/tickets/:id/assign',
    requirePermission('sales.tickets_assign'),
    salesController.assignTicket
);

// @route   POST /api/sales/tickets/:id/resolve
// @desc    Resolve ticket
// @access  Private (requires sales.tickets_resolve)
router.post('/tickets/:id/resolve',
    requirePermission('sales.tickets_resolve'),
    salesController.resolveTicket
);

// ============================================================================
// REPORT ROUTES
// ============================================================================

// @route   GET /api/sales/reports/sales
// @desc    Get sales report
// @access  Private (requires sales.reports_view)
router.get('/reports/sales',
    requirePermission('sales.reports_view'),
    salesController.getSalesReport
);

// @route   GET /api/sales/reports/pipeline
// @desc    Get pipeline report
// @access  Private (requires sales.reports_view)
router.get('/reports/pipeline',
    requirePermission('sales.reports_view'),
    salesController.getPipelineReport
);

// @route   GET /api/sales/reports/forecast
// @desc    Get forecast report
// @access  Private (requires sales.reports_view)
router.get('/reports/forecast',
    requirePermission('sales.reports_view'),
    salesController.getForecastReport
);

// @route   GET /api/sales/reports/commission
// @desc    Get commission report
// @access  Private (requires sales.reports_view)
router.get('/reports/commission',
    requirePermission('sales.reports_view'),
    salesController.getCommissionReport
);

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

// @route   GET /api/sales/dashboard
// @desc    Get sales dashboard
// @access  Private (requires sales.dashboard_view)
router.get('/dashboard',
    requirePermission('sales.dashboard_view'),
    salesController.getDashboard
);

module.exports = router;