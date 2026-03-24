// src/services/sales/reporting.service.js
const { Lead, Opportunity, Quote, Order, Customer, Product } = require('../../models/sales');
const mongoose = require('mongoose');
const PipelineService = require('./pipeline.service');
const CommissionService = require('./commission.service');
const ForecastService = require('./forecast.service');

class ReportingService {
    
    /**
     * Generate sales performance report
     */
    static async generateSalesReport(organizationId, startDate, endDate) {
        const [salesData, pipelineData, conversionData] = await Promise.all([
            this.getSalesData(organizationId, startDate, endDate),
            PipelineService.getPipelineSummary(organizationId),
            this.getConversionData(organizationId, startDate, endDate)
        ]);

        return {
            period: { startDate, endDate },
            sales: salesData,
            pipeline: pipelineData,
            conversions: conversionData,
            summary: this.calculateSummary(salesData, pipelineData)
        };
    }

    /**
     * Get sales data for period
     */
    static async getSalesData(organizationId, startDate, endDate) {
        const orders = await Order.find({
            organization: organizationId,
            status: 'completed',
            orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }).populate('customer');

        // Daily breakdown
        const daily = {};
        orders.forEach(order => {
            const date = order.orderDate.toISOString().split('T')[0];
            if (!daily[date]) {
                daily[date] = {
                    date,
                    orders: [],
                    count: 0,
                    amount: 0
                };
            }
            daily[date].orders.push(order._id);
            daily[date].count++;
            daily[date].amount += order.total;
        });

        // Customer breakdown
        const byCustomer = {};
        orders.forEach(order => {
            const customerId = order.customer?._id?.toString() || 'unknown';
            if (!byCustomer[customerId]) {
                byCustomer[customerId] = {
                    customerId,
                    customerName: order.customer?.name || 'Unknown',
                    orders: [],
                    count: 0,
                    amount: 0
                };
            }
            byCustomer[customerId].orders.push(order._id);
            byCustomer[customerId].count++;
            byCustomer[customerId].amount += order.total;
        });

        // Product breakdown
        const byProduct = {};
        for (const order of orders) {
            for (const item of order.items) {
                const productId = item.product?.toString() || 'unknown';
                if (!byProduct[productId]) {
                    byProduct[productId] = {
                        productId,
                        productName: item.description,
                        quantity: 0,
                        amount: 0
                    };
                }
                byProduct[productId].quantity += item.quantity;
                byProduct[productId].amount += item.total;
            }
        }

        return {
            summary: {
                totalOrders: orders.length,
                totalAmount: orders.reduce((sum, o) => sum + o.total, 0),
                averageOrderValue: orders.length > 0
                    ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length
                    : 0,
                uniqueCustomers: Object.keys(byCustomer).length
            },
            daily: Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)),
            byCustomer: Object.values(byCustomer).sort((a, b) => b.amount - a.amount),
            byProduct: Object.values(byProduct).sort((a, b) => b.amount - a.amount)
        };
    }

    /**
     * Get conversion data
     */
    static async getConversionData(organizationId, startDate, endDate) {
        const [leads, opportunities, quotes, orders] = await Promise.all([
            Lead.countDocuments({
                organization: organizationId,
                createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
            }),
            Opportunity.countDocuments({
                organization: organizationId,
                createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
            }),
            Quote.countDocuments({
                organization: organizationId,
                createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
            }),
            Order.countDocuments({
                organization: organizationId,
                createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
            })
        ]);

        return {
            leads,
            opportunities,
            quotes,
            orders,
            leadToOpportunity: leads > 0 ? (opportunities / leads) * 100 : 0,
            opportunityToQuote: opportunities > 0 ? (quotes / opportunities) * 100 : 0,
            quoteToOrder: quotes > 0 ? (orders / quotes) * 100 : 0,
            overallConversion: leads > 0 ? (orders / leads) * 100 : 0
        };
    }

    /**
     * Calculate summary metrics
     */
    static calculateSummary(salesData, pipelineData) {
        return {
            totalRevenue: salesData.summary.totalAmount,
            averageOrderValue: salesData.summary.averageOrderValue,
            pipelineValue: pipelineData.totals.amount,
            pipelineWeighted: pipelineData.totals.weightedAmount,
            pipelineCoverage: salesData.summary.totalAmount > 0
                ? pipelineData.totals.amount / salesData.summary.totalAmount
                : 0
        };
    }

    /**
     * Generate product performance report
     */
    static async generateProductReport(organizationId, startDate, endDate) {
        const products = await Product.find({
            organization: organizationId,
            status: 'active'
        });

        const orders = await Order.find({
            organization: organizationId,
            status: 'completed',
            orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }).populate('items.product');

        const productPerformance = {};

        // Initialize product data
        products.forEach(product => {
            productPerformance[product._id] = {
                productId: product._id,
                name: product.name,
                sku: product.sku,
                category: product.category,
                price: product.price,
                cost: product.cost,
                quantity: 0,
                revenue: 0,
                profit: 0,
                orders: []
            };
        });

        // Aggregate order data
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.product && productPerformance[item.product._id]) {
                    const perf = productPerformance[item.product._id];
                    perf.quantity += item.quantity;
                    perf.revenue += item.total;
                    perf.profit += item.total - (item.quantity * (item.product.cost || 0));
                    perf.orders.push(order._id);
                }
            });
        });

        // Calculate metrics
        const performance = Object.values(productPerformance).map(p => ({
            ...p,
            averagePrice: p.quantity > 0 ? p.revenue / p.quantity : 0,
            profitMargin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0,
            orderCount: p.orders.length
        }));

        return {
            period: { startDate, endDate },
            summary: {
                totalProducts: products.length,
                productsSold: performance.filter(p => p.quantity > 0).length,
                totalRevenue: performance.reduce((sum, p) => sum + p.revenue, 0),
                totalProfit: performance.reduce((sum, p) => sum + p.profit, 0)
            },
            topByRevenue: performance.sort((a, b) => b.revenue - a.revenue).slice(0, 10),
            topByQuantity: performance.sort((a, b) => b.quantity - a.quantity).slice(0, 10),
            byCategory: await this.groupByCategory(performance)
        };
    }

    /**
     * Group product performance by category
     */
    static async groupByCategory(productPerformance) {
        const byCategory = {};

        productPerformance.forEach(p => {
            const category = p.category || 'uncategorized';
            if (!byCategory[category]) {
                byCategory[category] = {
                    category,
                    products: [],
                    quantity: 0,
                    revenue: 0,
                    profit: 0
                };
            }
            byCategory[category].products.push(p.productId);
            byCategory[category].quantity += p.quantity;
            byCategory[category].revenue += p.revenue;
            byCategory[category].profit += p.profit;
        });

        return byCategory;
    }

    /**
     * Generate customer report
     */
    static async generateCustomerReport(organizationId, startDate, endDate) {
        const customers = await Customer.find({
            organization: organizationId,
            status: 'active'
        });

        const orders = await Order.find({
            organization: organizationId,
            status: 'completed',
            orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }).populate('customer');

        const customerPerformance = {};

        // Initialize customer data
        customers.forEach(customer => {
            customerPerformance[customer._id] = {
                customerId: customer._id,
                name: customer.name,
                email: customer.email,
                category: customer.category,
                totalOrders: 0,
                totalRevenue: 0,
                averageOrderValue: 0,
                firstOrder: null,
                lastOrder: null,
                orders: []
            };
        });

        // Aggregate order data
        orders.forEach(order => {
            if (order.customer && customerPerformance[order.customer._id]) {
                const perf = customerPerformance[order.customer._id];
                perf.totalOrders++;
                perf.totalRevenue += order.total;
                perf.orders.push(order._id);
                
                if (!perf.firstOrder || order.orderDate < perf.firstOrder) {
                    perf.firstOrder = order.orderDate;
                }
                if (!perf.lastOrder || order.orderDate > perf.lastOrder) {
                    perf.lastOrder = order.orderDate;
                }
            }
        });

        // Calculate metrics
        const performance = Object.values(customerPerformance).map(c => ({
            ...c,
            averageOrderValue: c.totalOrders > 0 ? c.totalRevenue / c.totalOrders : 0,
            customerLifetime: c.firstOrder && c.lastOrder
                ? Math.ceil((c.lastOrder - c.firstOrder) / (1000 * 60 * 60 * 24))
                : 0
        }));

        return {
            period: { startDate, endDate },
            summary: {
                totalCustomers: customers.length,
                activeCustomers: performance.filter(c => c.totalOrders > 0).length,
                totalRevenue: performance.reduce((sum, c) => sum + c.totalRevenue, 0),
                averageRevenuePerCustomer: performance.length > 0
                    ? performance.reduce((sum, c) => sum + c.totalRevenue, 0) / performance.length
                    : 0
            },
            topByRevenue: performance.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10),
            topByOrders: performance.sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 10),
            byCategory: await this.groupCustomersByCategory(performance)
        };
    }

    /**
     * Group customers by category
     */
    static async groupCustomersByCategory(customerPerformance) {
        const byCategory = {};

        customerPerformance.forEach(c => {
            const category = c.category || 'uncategorized';
            if (!byCategory[category]) {
                byCategory[category] = {
                    category,
                    customers: [],
                    count: 0,
                    revenue: 0,
                    orders: 0
                };
            }
            byCategory[category].customers.push(c.customerId);
            byCategory[category].count++;
            byCategory[category].revenue += c.totalRevenue;
            byCategory[category].orders += c.totalOrders;
        });

        return byCategory;
    }

    /**
     * Generate sales rep report
     */
    static async generateSalesRepReport(organizationId, startDate, endDate) {
        const repPerformance = await PipelineService.getSalesRepPerformance(
            organizationId,
            startDate,
            endDate
        );

        const commissionReport = await CommissionService.generateCommissionReport(
            organizationId,
            startDate,
            endDate
        );

        return {
            period: { startDate, endDate },
            performance: repPerformance,
            commissions: commissionReport,
            summary: {
                totalReps: repPerformance.length,
                topPerformer: repPerformance[0] || null,
                averageWinRate: repPerformance.length > 0
                    ? repPerformance.reduce((sum, r) => sum + r.winRate, 0) / repPerformance.length
                    : 0,
                averageDealSize: repPerformance.length > 0
                    ? repPerformance.reduce((sum, r) => sum + r.averageDealSize, 0) / repPerformance.length
                    : 0
            }
        };
    }

    /**
     * Generate executive dashboard report
     */
    static async generateExecutiveReport(organizationId) {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31);

        const [
            salesMTD,
            salesYTD,
            pipeline,
            forecast,
            topProducts,
            topCustomers,
            repPerformance
        ] = await Promise.all([
            this.getSalesData(organizationId, startOfMonth, endOfMonth),
            this.getSalesData(organizationId, startOfYear, endOfYear),
            PipelineService.getPipelineSummary(organizationId),
            ForecastService.generateForecast(organizationId, 3),
            this.generateProductReport(organizationId, startOfYear, endOfYear),
            this.generateCustomerReport(organizationId, startOfYear, endOfYear),
            this.generateSalesRepReport(organizationId, startOfYear, endOfYear)
        ]);

        return {
            asOfDate: today,
            sales: {
                monthToDate: {
                    revenue: salesMTD.summary.totalAmount,
                    orders: salesMTD.summary.totalOrders,
                    averageOrderValue: salesMTD.summary.averageOrderValue
                },
                yearToDate: {
                    revenue: salesYTD.summary.totalAmount,
                    orders: salesYTD.summary.totalOrders,
                    averageOrderValue: salesYTD.summary.averageOrderValue
                }
            },
            pipeline: {
                total: pipeline.totals.amount,
                weighted: pipeline.totals.weightedAmount,
                byStage: pipeline.stages
            },
            forecast: {
                next3Months: forecast.summary,
                byMonth: forecast.byMonth
            },
            topProducts: topProducts.topByRevenue.slice(0, 5),
            topCustomers: topCustomers.topByRevenue.slice(0, 5),
            salesReps: {
                topPerformers: repPerformance.performance.slice(0, 5),
                summary: repPerformance.summary
            },
            kpis: {
                revenueGrowth: this.calculateGrowth(salesYTD.summary.totalRevenue, 0),
                pipelineCoverage: salesYTD.summary.totalRevenue > 0
                    ? pipeline.totals.amount / salesYTD.summary.totalRevenue
                    : 0,
                winRate: repPerformance.summary.averageWinRate,
                customerRetention: await this.calculateCustomerRetention(organizationId, startOfYear, endOfYear)
            }
        };
    }

    /**
     * Calculate growth percentage
     */
    static calculateGrowth(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }

    /**
     * Calculate customer retention rate
     */
    static async calculateCustomerRetention(organizationId, startDate, endDate) {
        const customers = await Customer.find({
            organization: organizationId,
            createdAt: { $lte: startDate }
        });

        const activeCustomers = await Order.aggregate([
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    orderDate: { $gte: startDate, $lte: endDate },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: '$customer',
                    count: { $sum: 1 }
                }
            }
        ]);

        const retentionRate = customers.length > 0
            ? (activeCustomers.length / customers.length) * 100
            : 0;

        return retentionRate;
    }
}

module.exports = ReportingService;