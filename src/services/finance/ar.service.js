// src/services/finance/ar.service.js
const mongoose = require('mongoose');
const Invoice = require('../../models/finance/invoice.model');
const Payment = require('../../models/finance/payment.model');
const { Account } = require('../../models/finance/account.model');
const Audit = require('../../models/system/audit.model');

class ARService {
    /**
     * Create customer invoice (Sales Invoice)
     */
    static async createCustomerInvoice(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Validate revenue accounts exist
            for (const item of data.lineItems) {
                const account = await Account.findOne({
                    _id: item.account,
                    organization: organizationId,
                    type: 'revenue',
                    isActive: true,
                    deletedAt: null
                }).session(session);
                
                if (!account) {
                    throw new Error(`Account ${item.account} not found or not a revenue account`);
                }
            }
            
            // Generate invoice number
            const invoiceNumber = await Invoice.generateInvoiceNumber(organizationId, 'sales');
            
            // Create invoice
            const invoice = new Invoice({
                ...data,
                type: 'sales',
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
                description: `Created customer invoice: ${invoice.invoiceNumber}`,
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
     * Get customer invoices
     */
    static async getCustomerInvoices(filters, organizationId, page = 1, limit = 50) {
        const query = { 
            organization: organizationId,
            type: 'sales'
        };
        
        if (filters.status) query.status = filters.status;
        if (filters.customerId) query.partyId = filters.customerId;
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
     * Approve customer invoice
     */
    static async approveInvoice(invoiceId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const invoice = await Invoice.findOne({
                _id: invoiceId,
                organization: organizationId,
                type: 'sales'
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
                description: `Approved customer invoice: ${invoice.invoiceNumber}`,
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
     * Create receipt for customer invoice
     */
    static async createReceipt(data, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const invoice = await Invoice.findOne({
                _id: data.invoiceId,
                organization: organizationId,
                type: 'sales'
            }).session(session);
            
            if (!invoice) {
                throw new Error('Invoice not found');
            }
            
            if (invoice.status === 'paid') {
                throw new Error('Invoice already paid');
            }
            
            if (data.amount > invoice.remainingAmount) {
                throw new Error(`Receipt amount (${data.amount}) exceeds remaining amount (${invoice.remainingAmount})`);
            }
            
            // Generate receipt number
            const receiptNumber = await Payment.generatePaymentNumber(organizationId, 'receipt');
            
            // Create receipt record
            const receipt = new Payment({
                ...data,
                paymentNumber: receiptNumber,
                type: 'receipt',
                organization: organizationId,
                createdBy: actor.id,
                updatedBy: actor.id
            });
            
            await receipt.save({ session });
            
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
                targetId: receipt._id,
                targetName: receipt.paymentNumber,
                description: `Created receipt ${receipt.paymentNumber} for invoice ${invoice.invoiceNumber}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return { receipt, invoice };
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Complete receipt
     */
    static async completeReceipt(receiptId, actor, organizationId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const receipt = await Payment.findOne({
                _id: receiptId,
                organization: organizationId,
                type: 'receipt'
            }).session(session);
            
            if (!receipt) {
                throw new Error('Receipt not found');
            }
            
            if (receipt.status !== 'pending') {
                throw new Error(`Cannot complete receipt with status: ${receipt.status}`);
            }
            
            await receipt.complete(actor.id, session);
            
            await Audit.create([{
                organization: organizationId,
                actor: actor.id,
                actorModel: 'OrganizationMember',
                actorEmail: actor.email,
                actorName: actor.name,
                action: 'post',
                targetType: 'payment',
                targetId: receipt._id,
                targetName: receipt.paymentNumber,
                description: `Completed receipt: ${receipt.paymentNumber}`,
                context: { module: 'finance' },
                success: true
            }], { session });
            
            await session.commitTransaction();
            return receipt;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Get receipts for an invoice
     */
    static async getInvoiceReceipts(invoiceId, organizationId) {
        const receipts = await Payment.find({
            invoiceId,
            organization: organizationId,
            type: 'receipt'
        })
            .populate('bankAccountId', 'accountName bankName')
            .sort({ date: -1 })
            .lean();
        
        return receipts;
    }
    
    /**
     * Get aging summary for AR (receivables)
     */
    static async getAgingSummary(organizationId) {
        const aging = {
            current: 0,
            days1_30: 0,
            days31_60: 0,
            days61_90: 0,
            days91_plus: 0,
            total: 0
        };
        
        const invoices = await Invoice.find({
            organization: organizationId,
            type: 'sales',
            status: { $in: ['approved', 'partially_paid'] }
        });
        
        for (const invoice of invoices) {
            const daysOverdue = invoice.daysOverdue;
            const amount = invoice.remainingAmount;
            
            aging.total += amount;
            
            if (daysOverdue === 0) {
                aging.current += amount;
            } else if (daysOverdue <= 30) {
                aging.days1_30 += amount;
            } else if (daysOverdue <= 60) {
                aging.days31_60 += amount;
            } else if (daysOverdue <= 90) {
                aging.days61_90 += amount;
            } else {
                aging.days91_plus += amount;
            }
        }
        
        return aging;
    }
    
    /**
     * Get customer summary
     */
    static async getCustomerSummary(organizationId, customerId = null) {
        const query = {
            organization: organizationId,
            type: 'sales',
            status: { $in: ['approved', 'partially_paid', 'paid'] }
        };
        
        if (customerId) {
            query.partyId = customerId;
        }
        
        const invoices = await Invoice.find(query)
            .populate('partyId', 'personalInfo.firstName personalInfo.lastName name')
            .lean();
        
        const customerMap = new Map();
        
        for (const invoice of invoices) {
            const customerId = invoice.partyId.toString();
            if (!customerMap.has(customerId)) {
                customerMap.set(customerId, {
                    customerId,
                    customerName: invoice.partyName,
                    totalInvoiced: 0,
                    totalPaid: 0,
                    outstanding: 0,
                    invoiceCount: 0
                });
            }
            
            const customer = customerMap.get(customerId);
            customer.totalInvoiced += invoice.total;
            customer.totalPaid += invoice.paidAmount || 0;
            customer.outstanding += invoice.remainingAmount;
            customer.invoiceCount++;
        }
        
        return Array.from(customerMap.values());
    }
}

module.exports = ARService;
