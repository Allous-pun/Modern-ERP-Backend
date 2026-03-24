// src/controllers/sales/index.js
const leadController = require('./lead.controller');
const opportunityController = require('./opportunity.controller');
const quoteController = require('./quote.controller');
const orderController = require('./order.controller');
const customerController = require('./customer.controller');
const contactController = require('./contact.controller');
const interactionController = require('./interaction.controller');
const campaignController = require('./campaign.controller');
const ticketController = require('./ticket.controller');
const reportController = require('./report.controller');
const dashboardController = require('./dashboard.controller');

module.exports = {
    // Lead controllers
    getLeads: leadController.getLeads,
    getLead: leadController.getLead,
    createLead: leadController.createLead,
    updateLead: leadController.updateLead,
    deleteLead: leadController.deleteLead,
    convertLead: leadController.convertLead,
    
    // Opportunity controllers
    getOpportunities: opportunityController.getOpportunities,
    getOpportunity: opportunityController.getOpportunity,
    createOpportunity: opportunityController.createOpportunity,
    updateOpportunity: opportunityController.updateOpportunity,
    deleteOpportunity: opportunityController.deleteOpportunity,
    updateOpportunityStage: opportunityController.updateOpportunityStage,
    
    // Quote controllers
    getQuotes: quoteController.getQuotes,
    getQuote: quoteController.getQuote,
    createQuote: quoteController.createQuote,
    updateQuote: quoteController.updateQuote,
    deleteQuote: quoteController.deleteQuote,
    approveQuote: quoteController.approveQuote,
    rejectQuote: quoteController.rejectQuote,
    convertQuoteToOrder: quoteController.convertQuoteToOrder,
    
    // Order controllers
    getOrders: orderController.getOrders,
    getOrder: orderController.getOrder,
    createOrder: orderController.createOrder,
    updateOrder: orderController.updateOrder,
    deleteOrder: orderController.deleteOrder,
    fulfillOrder: orderController.fulfillOrder,
    cancelOrder: orderController.cancelOrder,
    invoiceOrder: orderController.invoiceOrder,
    
    // Customer controllers
    getCustomers: customerController.getCustomers,
    getCustomer: customerController.getCustomer,
    createCustomer: customerController.createCustomer,
    updateCustomer: customerController.updateCustomer,
    deleteCustomer: customerController.deleteCustomer,
    
    // Contact controllers
    getContacts: contactController.getContacts,
    getContact: contactController.getContact,
    createContact: contactController.createContact,
    updateContact: contactController.updateContact,
    deleteContact: contactController.deleteContact,
    
    // Interaction controllers
    getInteractions: interactionController.getInteractions,
    getInteraction: interactionController.getInteraction,
    createInteraction: interactionController.createInteraction,
    updateInteraction: interactionController.updateInteraction,
    deleteInteraction: interactionController.deleteInteraction,
    
    // Campaign controllers
    getCampaigns: campaignController.getCampaigns,
    getCampaign: campaignController.getCampaign,
    createCampaign: campaignController.createCampaign,
    updateCampaign: campaignController.updateCampaign,
    deleteCampaign: campaignController.deleteCampaign,
    
    // Ticket controllers
    getTickets: ticketController.getTickets,
    getTicket: ticketController.getTicket,
    createTicket: ticketController.createTicket,
    updateTicket: ticketController.updateTicket,
    deleteTicket: ticketController.deleteTicket,
    assignTicket: ticketController.assignTicket,
    resolveTicket: ticketController.resolveTicket,
    
    // Report controllers
    getSalesReport: reportController.getSalesReport,
    getPipelineReport: reportController.getPipelineReport,
    getForecastReport: reportController.getForecastReport,
    getCommissionReport: reportController.getCommissionReport,
    
    // Dashboard controllers
    getDashboard: dashboardController.getDashboard
};