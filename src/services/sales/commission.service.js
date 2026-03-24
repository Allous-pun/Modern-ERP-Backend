// src/services/sales/commission.service.js
const { Order, Opportunity, Product } = require('../../models/sales');
const User = require('../../models/user.model');
const mongoose = require('mongoose');

class CommissionService {
    
    /**
     * Calculate commission for an order
     */
    static async calculateOrderCommission(orderId) {
        const order = await Order.findById(orderId)
            .populate('items.product')
            .populate('opportunity');

        if (!order) {
            throw new Error('Order not found');
        }

        // Get commission rules (this would typically come from a CommissionRule model)
        const commissionRules = await this.getCommissionRules(order.organization);

        let totalCommission = 0;
        const breakdown = [];

        // Calculate commission per item
        for (const item of order.items) {
            const itemCommission = await this.calculateItemCommission(
                item,
                order.assignedTo,
                commissionRules,
                order
            );

            totalCommission += itemCommission.amount;
            breakdown.push(itemCommission);
        }

        // Add any team commissions
        if (order.team && order.team.length > 0) {
            const teamCommission = await this.calculateTeamCommission(
                order,
                commissionRules,
                totalCommission
            );
            breakdown.push(...teamCommission);
        }

        return {
            orderId: order._id,
            orderNumber: order.orderNumber,
            totalAmount: order.total,
            totalCommission,
            breakdown
        };
    }

    /**
     * Calculate commission for a single item
     */
    static async calculateItemCommission(item, salesRepId, rules, order) {
        let commissionRate = rules.defaultRate || 0;
        let commissionType = 'percentage';

        // Check for product-specific commission
        if (item.product && rules.productRates) {
            const productRule = rules.productRates.find(r => 
                r.product.toString() === item.product._id.toString()
            );
            if (productRule) {
                commissionRate = productRule.rate;
                commissionType = productRule.type || 'percentage';
            }
        }

        // Check for category-specific commission
        if (!productRule && item.product?.category && rules.categoryRates) {
            const categoryRule = rules.categoryRates.find(r => 
                r.category === item.product.category
            );
            if (categoryRule) {
                commissionRate = categoryRule.rate;
                commissionType = categoryRule.type || 'percentage';
            }
        }

        // Calculate commission amount
        let amount = 0;
        if (commissionType === 'percentage') {
            amount = item.total * (commissionRate / 100);
        } else if (commissionType === 'fixed') {
            amount = commissionRate * item.quantity;
        }

        return {
            itemId: item._id,
            productId: item.product?._id,
            productName: item.product?.name,
            quantity: item.quantity,
            itemTotal: item.total,
            commissionRate,
            commissionType,
            amount,
            salesRepId
        };
    }

    /**
     * Calculate team commissions
     */
    static async calculateTeamCommission(order, rules, totalCommission) {
        const teamCommissions = [];
        
        if (!order.team || order.team.length === 0) {
            return teamCommissions;
        }

        // Get team split rules
        const teamSplit = rules.teamSplit || {
            primaryPercentage: 50,
            secondaryPercentage: 30,
            tertiaryPercentage: 20
        };

        // Sort team members by contribution (primary gets highest)
        const sortedTeam = order.team.sort((a, b) => b.contribution - a.contribution);

        sortedTeam.forEach((member, index) => {
            let percentage = 0;
            if (index === 0) percentage = teamSplit.primaryPercentage;
            else if (index === 1) percentage = teamSplit.secondaryPercentage;
            else if (index === 2) percentage = teamSplit.tertiaryPercentage;

            const amount = totalCommission * (percentage / 100);

            teamCommissions.push({
                type: 'team',
                userId: member.user,
                contribution: member.contribution,
                percentage,
                amount
            });
        });

        return teamCommissions;
    }

    /**
     * Get commission rules (mock - should come from database)
     */
    static async getCommissionRules(organizationId) {
        // This would typically come from a CommissionRule model
        return {
            defaultRate: 5, // 5% default commission
            productRates: [
                // { product: ObjectId, rate: 10, type: 'percentage' }
            ],
            categoryRates: [
                // { category: 'electronics', rate: 8, type: 'percentage' }
            ],
            tierRates: [
                { minAmount: 0, maxAmount: 10000, rate: 5 },
                { minAmount: 10001, maxAmount: 50000, rate: 7 },
                { minAmount: 50001, maxAmount: null, rate: 10 }
            ],
            teamSplit: {
                primaryPercentage: 50,
                secondaryPercentage: 30,
                tertiaryPercentage: 20
            }
        };
    }

    /**
     * Calculate commission for a sales rep over a period
     */
    static async calculateRepCommission(organizationId, userId, startDate, endDate) {
        const orders = await Order.find({
            organization: organizationId,
            assignedTo: userId,
            status: 'completed',
            orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }).populate('items.product');

        let totalCommission = 0;
        const breakdown = [];

        for (const order of orders) {
            const orderCommission = await this.calculateOrderCommission(order._id);
            totalCommission += orderCommission.totalCommission;
            breakdown.push(orderCommission);
        }

        return {
            userId,
            period: { startDate, endDate },
            totalOrders: orders.length,
            totalCommission,
            breakdown
        };
    }

    /**
     * Calculate team commission for a period
     */
    static async calculateTeamCommissionPeriod(organizationId, teamMembers, startDate, endDate) {
        const teamCommissions = [];

        for (const member of teamMembers) {
            const commission = await this.calculateRepCommission(
                organizationId,
                member.userId,
                startDate,
                endDate
            );
            teamCommissions.push({
                ...commission,
                role: member.role,
                split: member.split
            });
        }

        return teamCommissions;
    }

    /**
     * Calculate commission by tier
     */
    static calculateTierCommission(amount, tiers) {
        let remainingAmount = amount;
        let totalCommission = 0;
        const breakdown = [];

        for (const tier of tiers.sort((a, b) => a.minAmount - b.minAmount)) {
            if (remainingAmount <= 0) break;

            const tierAmount = tier.maxAmount 
                ? Math.min(remainingAmount, tier.maxAmount - tier.minAmount + 1)
                : remainingAmount;

            const tierCommission = tierAmount * (tier.rate / 100);
            totalCommission += tierCommission;

            breakdown.push({
                tier: `${tier.minAmount} - ${tier.maxAmount || '∞'}`,
                amount: tierAmount,
                rate: tier.rate,
                commission: tierCommission
            });

            remainingAmount -= tierAmount;
        }

        return { totalCommission, breakdown };
    }

    /**
     * Generate commission report
     */
    static async generateCommissionReport(organizationId, startDate, endDate) {
        const salesReps = await User.find({
            organization: organizationId,
            roles: 'sales_rep'
        });

        const report = {
            period: { startDate, endDate },
            byRep: [],
            totals: {
                totalOrders: 0,
                totalRevenue: 0,
                totalCommission: 0
            }
        };

        for (const rep of salesReps) {
            const repCommission = await this.calculateRepCommission(
                organizationId,
                rep._id,
                startDate,
                endDate
            );

            report.byRep.push({
                repId: rep._id,
                repName: `${rep.firstName} ${rep.lastName}`,
                ...repCommission
            });

            report.totals.totalOrders += repCommission.totalOrders;
            report.totals.totalCommission += repCommission.totalCommission;
            
            // Calculate total revenue from rep's breakdown
            repCommission.breakdown.forEach(order => {
                report.totals.totalRevenue += order.totalAmount;
            });
        }

        // Calculate averages
        report.averages = {
            commissionPerOrder: report.totals.totalOrders > 0
                ? report.totals.totalCommission / report.totals.totalOrders
                : 0,
            commissionPerRep: report.byRep.length > 0
                ? report.totals.totalCommission / report.byRep.length
                : 0
        };

        return report;
    }

    /**
     * Calculate forecasted commission
     */
    static async calculateForecastedCommission(organizationId, months = 3) {
        const opportunities = await Opportunity.find({
            organization: organizationId,
            stage: { $nin: ['closed-won', 'closed-lost'] },
            expectedCloseDate: {
                $lte: new Date(new Date().setMonth(new Date().getMonth() + months))
            }
        }).populate('assignedTo');

        const rules = await this.getCommissionRules(organizationId);
        const forecast = [];

        for (const opp of opportunities) {
            const expectedAmount = opp.amount * (opp.probability / 100);
            const { totalCommission } = this.calculateTierCommission(
                expectedAmount,
                rules.tierRates
            );

            forecast.push({
                opportunityId: opp._id,
                opportunityName: opp.name,
                salesRep: opp.assignedTo ? {
                    id: opp.assignedTo._id,
                    name: `${opp.assignedTo.firstName} ${opp.assignedTo.lastName}`
                } : null,
                amount: opp.amount,
                probability: opp.probability,
                expectedAmount,
                expectedCommission: totalCommission,
                expectedCloseDate: opp.expectedCloseDate
            });
        }

        // Group by month
        const byMonth = {};
        forecast.forEach(f => {
            const month = f.expectedCloseDate.toISOString().slice(0, 7);
            if (!byMonth[month]) {
                byMonth[month] = {
                    month,
                    opportunities: [],
                    totalAmount: 0,
                    totalCommission: 0
                };
            }
            byMonth[month].opportunities.push(f);
            byMonth[month].totalAmount += f.expectedAmount;
            byMonth[month].totalCommission += f.expectedCommission;
        });

        return {
            forecast,
            byMonth: Object.values(byMonth),
            totals: {
                totalOpportunities: forecast.length,
                totalExpectedAmount: forecast.reduce((sum, f) => sum + f.expectedAmount, 0),
                totalExpectedCommission: forecast.reduce((sum, f) => sum + f.expectedCommission, 0)
            }
        };
    }

    /**
     * Calculate commission payout
     */
    static async calculatePayout(organizationId, period, userId = null) {
        const { startDate, endDate } = period;
        
        const query = {
            organization: organizationId,
            status: 'completed',
            orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
        };

        if (userId) {
            query.assignedTo = userId;
        }

        const orders = await Order.find(query).populate('assignedTo');

        const payout = {
            period,
            orders: [],
            byRep: {},
            totals: {
                totalOrders: 0,
                totalAmount: 0,
                totalCommission: 0
            }
        };

        for (const order of orders) {
            const orderCommission = await this.calculateOrderCommission(order._id);
            
            payout.orders.push({
                orderId: order._id,
                orderNumber: order.orderNumber,
                amount: order.total,
                commission: orderCommission.totalCommission,
                salesRep: order.assignedTo ? {
                    id: order.assignedTo._id,
                    name: `${order.assignedTo.firstName} ${order.assignedTo.lastName}`
                } : null
            });

            if (order.assignedTo) {
                const repId = order.assignedTo._id.toString();
                if (!payout.byRep[repId]) {
                    payout.byRep[repId] = {
                        repId,
                        repName: `${order.assignedTo.firstName} ${order.assignedTo.lastName}`,
                        orders: [],
                        totalAmount: 0,
                        totalCommission: 0
                    };
                }
                
                payout.byRep[repId].orders.push(order._id);
                payout.byRep[repId].totalAmount += order.total;
                payout.byRep[repId].totalCommission += orderCommission.totalCommission;
            }

            payout.totals.totalOrders++;
            payout.totals.totalAmount += order.total;
            payout.totals.totalCommission += orderCommission.totalCommission;
        }

        return payout;
    }
}

module.exports = CommissionService;