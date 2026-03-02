// src/controllers/sales/dashboard.controller.js
const { Lead, Opportunity, Quote, Order, Customer } = require('../../models/sales');
const mongoose = require('mongoose');

// @desc    Get sales dashboard
// @route   GET /api/sales/dashboard
// @access  Private (requires sales.dashboard_view)
const getDashboard = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        // Get key metrics
        const [
            totalLeads,
            newLeadsThisMonth,
            totalOpportunities,
            pipelineValue,
            ordersThisMonth,
            revenueThisMonth,
            topCustomers,
            salesByStage,
            recentActivities
        ] = await Promise.all([
            // Total leads
            Lead.countDocuments({ organization: organizationId }),
            
            // New leads this month
            Lead.countDocuments({
                organization: organizationId,
                createdAt: { $gte: startOfMonth }
            }),
            
            // Total opportunities
            Opportunity.countDocuments({
                organization: organizationId,
                status: { $in: ['open', 'in-progress'] }
            }),
            
            // Pipeline value
            Opportunity.aggregate([
                {
                    $match: {
                        organization: mongoose.Types.ObjectId(organizationId),
                        status: { $in: ['open', 'in-progress'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                        weighted: {
                            $sum: {
                                $multiply: [
                                    '$amount',
                                    { $divide: ['$probability', 100] }
                                ]
                            }
                        }
                    }
                }
            ]),
            
            // Orders this month
            Order.countDocuments({
                organization: organizationId,
                createdAt: { $gte: startOfMonth },
                status: 'completed'
            }),
            
            // Revenue this month
            Order.aggregate([
                {
                    $match: {
                        organization: mongoose.Types.ObjectId(organizationId),
                        createdAt: { $gte: startOfMonth },
                        status: 'completed'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$total' }
                    }
                }
            ]),
            
            // Top customers
            Order.aggregate([
                {
                    $match: {
                        organization: mongoose.Types.ObjectId(organizationId),
                        status: 'completed'
                    }
                },
                {
                    $group: {
                        _id: '$customer',
                        totalOrders: { $sum: 1 },
                        totalSpent: { $sum: '$total' }
                    }
                },
                {
                    $lookup: {
                        from: 'customers',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'customer'
                    }
                },
                { $unwind: '$customer' },
                {
                    $project: {
                        'customer.name': 1,
                        'customer.email': 1,
                        totalOrders: 1,
                        totalSpent: 1
                    }
                },
                { $sort: { totalSpent: -1 } },
                { $limit: 5 }
            ]),
            
            // Sales by stage
            Opportunity.aggregate([
                {
                    $match: {
                        organization: mongoose.Types.ObjectId(organizationId),
                        status: { $in: ['open', 'in-progress'] }
                    }
                },
                {
                    $group: {
                        _id: '$stage',
                        count: { $sum: 1 },
                        amount: { $sum: '$amount' }
                    }
                },
                { $sort: { '_id': 1 } }
            ]),
            
            // Recent activities (combine recent leads and opportunities)
            Promise.all([
                Lead.find({ organization: organizationId })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('firstName lastName company email status createdAt'),
                Opportunity.find({ organization: organizationId })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('name amount stage expectedCloseDate createdAt')
                    .populate('customer', 'name')
            ]).then(([recentLeads, recentOpportunities]) => {
                const activities = [
                    ...recentLeads.map(l => ({
                        type: 'lead',
                        id: l._id,
                        title: `${l.firstName} ${l.lastName}`,
                        subtitle: l.company || l.email,
                        status: l.status,
                        date: l.createdAt
                    })),
                    ...recentOpportunities.map(o => ({
                        type: 'opportunity',
                        id: o._id,
                        title: o.name,
                        subtitle: o.customer?.name,
                        amount: o.amount,
                        stage: o.stage,
                        date: o.createdAt
                    }))
                ];
                
                return activities.sort((a, b) => b.date - a.date).slice(0, 10);
            })
        ]);

        // Format pipeline value
        const pipelineTotals = pipelineValue[0] || { total: 0, weighted: 0 };

        // Format revenue
        const revenueTotal = revenueThisMonth[0]?.total || 0;

        // Get weekly sales trend
        const weeklySales = await Order.aggregate([
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    createdAt: { $gte: startOfWeek, $lte: endOfWeek },
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: '$createdAt' },
                    amount: { $sum: '$total' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Format weekly sales
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const salesTrend = daysOfWeek.map((day, index) => {
            const dayData = weeklySales.find(d => d._id === index + 1);
            return {
                day,
                amount: dayData?.amount || 0,
                count: dayData?.count || 0
            };
        });

        res.status(200).json({
            success: true,
            data: {
                metrics: {
                    leads: {
                        total: totalLeads,
                        newThisMonth: newLeadsThisMonth
                    },
                    opportunities: {
                        total: totalOpportunities,
                        pipelineValue: pipelineTotals.total,
                        weightedPipeline: pipelineTotals.weighted
                    },
                    orders: {
                        thisMonth: ordersThisMonth,
                        revenueThisMonth: revenueTotal
                    }
                },
                pipeline: salesByStage,
                topCustomers,
                recentActivities,
                trends: {
                    weekly: salesTrend
                }
            }
        });
    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data'
        });
    }
};

module.exports = {
    getDashboard
};