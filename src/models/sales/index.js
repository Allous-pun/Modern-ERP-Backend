// src/models/sales/index.js
/**
 * Sales Module Models Index
 * This file exports all models for the Sales, Marketing & CRM module
 */

const Lead = require('./lead.model');
const Opportunity = require('./opportunity.model');
const Quote = require('./quote.model');
const Order = require('./order.model');
const Customer = require('./customer.model');
const Contact = require('./contact.model');
const Interaction = require('./interaction.model');
const Campaign = require('./campaign.model');
const Ticket = require('./ticket.model');
const Product = require('./product.model');
const PriceBook = require('./pricebook.model');

module.exports = {
    Lead,
    Opportunity,
    Quote,
    Order,
    Customer,
    Contact,
    Interaction,
    Campaign,
    Ticket,
    Product,
    PriceBook,
    
    // Helper function to initialize all models
    initialize: async () => {
        try {
            // Create indexes for all models
            await Lead.createIndexes();
            await Opportunity.createIndexes();
            await Quote.createIndexes();
            await Order.createIndexes();
            await Customer.createIndexes();
            await Contact.createIndexes();
            await Interaction.createIndexes();
            await Campaign.createIndexes();
            await Ticket.createIndexes();
            await Product.createIndexes();
            await PriceBook.createIndexes();
            
            console.log('✅ Sales module models initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing sales module models:', error);
            throw error;
        }
    },
    
    // Helper function to get model by name
    getModel: (modelName) => {
        const models = {
            Lead,
            Opportunity,
            Quote,
            Order,
            Customer,
            Contact,
            Interaction,
            Campaign,
            Ticket,
            Product,
            PriceBook
        };
        return models[modelName];
    },
    
    // Export all model names for reference
    modelNames: [
        'Lead', 'Opportunity', 'Quote', 'Order', 'Customer',
        'Contact', 'Interaction', 'Campaign', 'Ticket', 'Product', 'PriceBook'
    ]
};