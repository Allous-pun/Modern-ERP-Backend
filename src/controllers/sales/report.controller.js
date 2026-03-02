// src/controllers/sales/report.controller.js
const { Lead, Opportunity, Quote, Order, Customer } = require('../../models/sales');
const mongoose = require('mongoose');

// @desc    Get sales report
// @route   GET /api/sales/reports/sales
// @access  Private (requires sales.reports_view)
const getSalesReport = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { startDate, endDate, groupBy = 'day' } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Determine date format based on groupBy
        let dateFormat;
        switch(groupBy) {
            case 'hour':
                dateFormat = '%Y-%m-%d %H:00';
                break;
            case 'day':
                dateFormat = '%Y-%m-%d';
                break;
            case 'week':
                dateFormat = '%Y-%W';
                break;
            case 'month':
                dateFormat = '%Y-%m';
                break;
            case 'quarter':
                dateFormat = '%Y-Q%q';
                break;
            case 'year':
                dateFormat = '%Y';
                break;
            default:
                dateFormat = '%Y-%m-%d';
        }

        // Get orders data
        const orders = await Order.aggregate([
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    createdAt: { $gte: start, $lte: end },
                    status: { $in: ['completed', 'invoiced'] }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: dateFormat, date: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$total' },
                    averageAmount: { $avg: '$total' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Get quotes data
        const quotes = await Quote.aggregate([
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    createdAt: { $gte: start, $lte: end },
                    status: 'approved'
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: dateFormat, date: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$total' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Get conversion data
        const leads = await Lead.aggregate([
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: dateFormat, date: '$createdAt' }
                    },
                    totalLeads: { $sum: 1 },
                    convertedLeads: {
                        $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    totalLeads: 1,
                    convertedLeads: 1,
                    conversionRate: {
                        $multiply: [
                            { $divide: ['$convertedLeads', '$totalLeads'] },
                            100
                        ]
                    }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Calculate totals
        const totals = {
            orders: {
                count: orders.reduce((sum, o) => sum + o.count, 0),
                amount: orders.reduce((sum, o) => sum + o.totalAmount, 0)
            },
            quotes: {
                count: quotes.reduce((sum, q) => sum + q.count, 0),
                amount: quotes.reduce((sum, q) => sum + q.totalAmount, 0)
            },
            leads: {
                total: leads.reduce((sum, l) => sum + l.totalLeads, 0),
                converted: leads.reduce((sum, l) => sum + l.convertedLeads, 0)
            }
        };

        totals.leads.conversionRate = totals.leads.total > 0 
            ? (totals.leads.converted / totals.leads.total) * 100 
            : 0;

        res.status(200).json({
            success: true,
            data: {
                period: { startDate, endDate },
                groupBy,
                orders,
                quotes,
                leads,
                totals
            }
        });
    } catch (error) {
        console.error('Get sales report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate sales report'
        });
    }
};

// @desc    Get pipeline report
// @route   GET /api/sales/reports/pipeline
// @access  Private (requires sales.reports_view)
const getPipelineReport = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;

        const pipeline = await Opportunity.aggregate([
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
                    totalAmount: { $sum: '$amount' },
                    weightedAmount: {
                        $sum: {
                            $multiply: [
                                '$amount',
                                { $divide: ['$probability', 100] }
                            ]
                        }
                    },
                    opportunities: {
                        $push: {
                            id: '$_id',
                            name: '$name',
                            amount: '$amount',
                            probability: '$probability',
                            expectedCloseDate: '$expectedCloseDate',
                            customer: '$customer'
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'opportunities.customer',
                    foreignField: '_id',
                    as: 'customerDetails'
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Calculate totals
        const totals = pipeline.reduce((acc, stage) => {
            acc.count += stage.count;
            acc.amount += stage.totalAmount;
            acc.weightedAmount += stage.weightedAmount;
            return acc;
        }, { count: 0, amount: 0, weightedAmount: 0 });

        res.status(200).json({
            success: true,
            data: {
                stages: pipeline,
                totals
            }
        });
    } catch (error) {
        console.error('Get pipeline report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate pipeline report'
        });
    }
};

// @desc    Get forecast report
// @route   GET /api/sales/reports/forecast
// @access  Private (requires sales.reports_view)
const getForecastReport = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { months = 3 } = req.query;

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + parseInt(months));

        const forecast = await Opportunity.aggregate([
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    expectedCloseDate: { $gte: startDate, $lte: endDate },
                    status: { $in: ['open', 'in-progress'] }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$expectedCloseDate' },
                        month: { $month: '$expectedCloseDate' }
                    },
                    opportunities: {
                        $push: {
                            name: '$name',
                            amount: '$amount',
                            probability: '$probability',
                            stage: '$stage'
                        }
                    },
                    bestCase: {
                        $sum: {
                            $multiply: ['$amount', { $divide: ['$probability', 100] }]
                        }
                    },
                    mostLikely: {
                        $sum: {
                            $multiply: [
                                '$amount',
                                {
                                    $switch: {
                                        branches: [
                                            { case: { $eq: ['$stage', 'qualification'] }, then: 0.2 },
                                            { case: { $eq: ['$stage', 'needs-analysis'] }, then: 0.4 },
                                            { case: { $eq: ['$stage', 'proposal'] }, then: 0.6 },
                                            { case: { $eq: ['$stage', 'negotiation'] }, then: 0.8 }
                                        ],
                                        default: 0.5
                                    }
                                }
                            ]
                        }
                    },
                    commit: {
                        $sum: {
                            $cond: [
                                { $gte: ['$probability', 80] },
                                '$amount',
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    opportunities: 1,
                    bestCase: 1,
                    mostLikely: 1,
                    commit: 1
                }
            },
            { $sort: { year: 1, month: 1 } }
        ]);

        // Calculate totals
        const totals = forecast.reduce((acc, month) => {
            acc.bestCase += month.bestCase;
            acc.mostLikely += month.mostLikely;
            acc.commit += month.commit;
            return acc;
        }, { bestCase: 0, mostLikely: 0, commit: 0 });

        res.status(200).json({
            success: true,
            data: {
                period: { startDate, endDate },
                forecast,
                totals
            }
        });
    } catch (error) {
        console.error('Get forecast report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate forecast report'
        });
    }
};

// @desc    Get commission report
// @route   GET /api/sales/reports/commission
// @access  Private (requires sales.reports_view)
const getCommissionReport = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { startDate, endDate, userId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }

        const match = {
            organization: mongoose.Types.ObjectId(organizationId),
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
            status: 'completed'
        };

        if (userId) {
            match.assignedTo = mongoose.Types.ObjectId(userId);
        }

        const commissions = await Order.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'users',
                    localField: 'assignedTo',
                    foreignField: '_id',
                    as: 'salesRep'
                }
            },
            { $unwind: { path: '$salesRep', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$assignedTo',
                    salesRepName: { $first: { $concat: ['$salesRep.firstName', ' ', '$salesRep.lastName'] } },
                    ordersCount: { $sum: 1 },
                    totalAmount: { $sum: '$total' },
                    commission: {
                        $sum: {
                            $multiply: ['$total', 0.05] // 5% commission rate
                        }
                    },
                    orders: {
                        $push: {
                            id: '$_id',
                            orderNumber: '$orderNumber',
                            amount: '$total',
                            date: '$createdAt'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    salesRepName: 1,
                    ordersCount: 1,
                    totalAmount: 1,
                    commission: 1,
                    orders: 1
                }
            },
            { $sort: { commission: -1 } }
        ]);

        // Calculate totals
        const totals = commissions.reduce((acc, rep) => {
            acc.ordersCount += rep.ordersCount;
            acc.totalAmount += rep.totalAmount;
            acc.commission += rep.commission;
            return acc;
        }, { ordersCount: 0, totalAmount: 0, commission: 0 });

        res.status(200).json({
            success: true,
            data: {
                period: { startDate, endDate },
                byRep: commissions,
                totals
            }
        });
    } catch (error) {
        console.error('Get commission report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate commission report'
        });
    }
};

module.exports = {
    getSalesReport,
    getPipelineReport,
    getForecastReport,
    getCommissionReport
};