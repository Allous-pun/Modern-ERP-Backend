// src/services/finance/ap.service.js
const mongoose = require('mongoose');
const Invoice = require('../../models/finance/invoice.model');
const Payment = require('../../models/finance/payment.model');
const { Account } = require('../../models/finance/account.model');
const JournalEntry = require('../../models/finance/journalEntry.model');
const Audit = require('../../models/system/audit.model');

class APService {
    /**
     * Create supplier invoice (Purchase Invoice)
     */
    static async createSupplierInvoice(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Validate expense accounts exist
            for (const item of data.lineItems) {
                const account = await Account.findOne({
                    _id: item.account,
                    organization: organizationId,
                    type: 'expense',
                    isActive: true,
                    deletedAt: null
                }).session(session);
                
                if (!account) {
                    throw new Error(`Account ${item.account} not found or not an expense account`);
                }
            }
            
            // Generate invoice number
            const invoiceNumber = await Invoice.generateInvoiceNumber(organizationId, 'purchase');
            
            // Create invoice
            const invoice = new Invoice({
                ...data,
                type: 'purchase',
                invoiceNumber,
                organization: organizationId,
                status: 'draft',
                createdBy: actor.id,
                updatedBy: actor.id
            });
            
            await invoice.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'create',
                targetType: 'invoice',
                targetId: invoice._id,
                targetName: invoice.invoiceNumber,
                description: `Created supplier invoice: ${invoice.invoiceNumber}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return invoice;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get supplier invoices
     */
    static async getSupplierInvoices(filters, organizationId, page = 1, limit = 50) {
        const query = { 
            organization: organizationId,
            type: 'purchase'
        };
        
        if (filters.status) query.status = filters.status;
        if (filters.vendorId) query.partyId = filters.vendorId;
        if (filters.startDate) query.date = { $gte: new Date(filters.startDate) };
        if (filters.endDate) query.date = { ...query.date, $lte: new Date(filters.endDate) };
        if (filters.search) {
            query.$or = [
                { invoiceNumber: { $regex: filters.search, $options: 'i' } },
                { partyName: { $regex: filters.search, $options: 'i' } }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const [invoices, total] = await Promise.all([
            Invoice.find(query)
                .populate('lineItems.account', 'code name')
                .populate('createdBy', 'personalInfo.firstName personalInfo.lastName')
                .populate('approvedBy', 'personalInfo.firstName personalInfo.lastName')
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Invoice.countDocuments(query)
        ]);
        
        return { invoices, total, page: parseInt(page), pages: Math.ceil(total / limit) };
    }
    
    /**
     * Get invoice by ID
     */
    static async getInvoiceById(invoiceId, organizationId) {
        const invoice = await Invoice.findOne({
            _id: invoiceId,
            organization: organizationId
        })
            .populate('lineItems.account', 'code name type')
            .populate('createdBy', 'personalInfo.firstName personalInfo.lastName')
            .populate('approvedBy', 'personalInfo.firstName personalInfo.lastName')
            .lean();
        
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        
        return invoice;
    }
    
    /**
     * Approve supplier invoice
     */
    static async approveInvoice(invoiceId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const invoice = await Invoice.findOne({
                _id: invoiceId,
                organization: organizationId,
                type: 'purchase'
            }).session(session);
            
            if (!invoice) {
                throw new Error('Invoice not found');
            }
            
            if (invoice.status !== 'draft') {
                throw new Error(`Cannot approve invoice with status: ${invoice.status}`);
            }
            
            invoice.status = 'approved';
            invoice.approvedBy = actor.id;
            invoice.approvedAt = new Date();
            await invoice.save({ session });
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'approve',
                targetType: 'invoice',
                targetId: invoice._id,
                targetName: invoice.invoiceNumber,
                description: `Approved supplier invoice: ${invoice.invoiceNumber}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return invoice;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Create payment for supplier invoice
     */
    static async createPayment(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const invoice = await Invoice.findOne({
                _id: data.invoiceId,
                organization: organizationId,
                type: 'purchase'
            }).session(session);
            
            if (!invoice) {
                throw new Error('Invoice not found');
            }
            
            if (invoice.status === 'paid') {
                throw new Error('Invoice already paid');
            }
            
            if (data.amount > invoice.remainingAmount) {
                throw new Error(`Payment amount (${data.amount}) exceeds remaining amount (${invoice.remainingAmount})`);
            }
            
            // Create payment record
            const payment = new Payment({
                ...data,
                type: 'payment',
                organization: organizationId,
                createdBy: actor.id,
                updatedBy: actor.id
            });
            
            await payment.save({ session });
            
            // Update invoice payment status
            await invoice.recordPayment(data.amount, session);
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'create',
                targetType: 'payment',
                targetId: payment._id,
                targetName: payment.paymentNumber,
                description: `Created payment ${payment.paymentNumber} for invoice ${invoice.invoiceNumber}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return { payment, invoice };
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Complete payment
     */
    static async completePayment(paymentId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const payment = await Payment.findOne({
                _id: paymentId,
                organization: organizationId,
                type: 'payment'
            }).session(session);
            
            if (!payment) {
                throw new Error('Payment not found');
            }
            
            if (payment.status !== 'pending') {
                throw new Error(`Cannot complete payment with status: ${payment.status}`);
            }
            
            await payment.complete(actor.id, session);
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'post',
                targetType: 'payment',
                targetId: payment._id,
                targetName: payment.paymentNumber,
                description: `Completed payment: ${payment.paymentNumber}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return payment;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get payments for an invoice
     */
    static async getInvoicePayments(invoiceId, organizationId) {
        const payments = await Payment.find({
            invoiceId,
            organization: organizationId
        })
            .populate('bankAccountId', 'accountName bankName')
            .sort({ date: -1 })
            .lean();
        
        return payments;
    }
    
    /**
     * Get aging summary
     */
    static async getAgingSummary(organizationId) {
        const aging = await Invoice.getAgingSummary(organizationId);
        return aging;
    }
    
    /**
     * Get vendor summary
     */
    static async getVendorSummary(organizationId, vendorId = null) {
        const query = {
            organization: organizationId,
            type: 'purchase',
            status: { $in: ['approved', 'partially_paid', 'paid'] }
        };
        
        if (vendorId) {
            query.partyId = vendorId;
        }
        
        const invoices = await Invoice.find(query)
            .populate('partyId', 'personalInfo.firstName personalInfo.lastName name')
            .lean();
        
        const vendorMap = new Map();
        
        for (const invoice of invoices) {
            const vendorId = invoice.partyId.toString();
            if (!vendorMap.has(vendorId)) {
                vendorMap.set(vendorId, {
                    vendorId,
                    vendorName: invoice.partyName,
                    totalInvoiced: 0,
                    totalPaid: 0,
                    outstanding: 0,
                    invoiceCount: 0
                });
            }
            
            const vendor = vendorMap.get(vendorId);
            vendor.totalInvoiced += invoice.total;
            vendor.totalPaid += invoice.paidAmount || 0;
            vendor.outstanding += invoice.remainingAmount;
            vendor.invoiceCount++;
        }
        
        return Array.from(vendorMap.values());
    }
}

module.exports = APService;
