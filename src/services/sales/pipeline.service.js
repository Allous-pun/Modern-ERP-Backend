// src/services/sales/pipeline.service.js
const { Opportunity, Lead, Customer } = require('../../models/sales');
const mongoose = require('mongoose');

class PipelineService {
    
    /**
     * Get pipeline summary by stage
     */
    static async getPipelineSummary(organizationId, filters = {}) {
        const match = {
            organization: mongoose.Types.ObjectId(organizationId),
            stage: { $nin: ['closed-won', 'closed-lost'] }
        };

        // Apply additional filters
        if (filters.assignedTo) {
            match.assignedTo = mongoose.Types.ObjectId(filters.assignedTo);
        }
        if (filters.customerId) {
            match.customer = mongoose.Types.ObjectId(filters.customerId);
        }

        const pipeline = await Opportunity.aggregate([
            { $match: match },
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
                            customer: '$customer',
                            assignedTo: '$assignedTo'
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

        return {
            stages: pipeline,
            totals
        };
    }

    /**
     * Get pipeline velocity metrics
     */
    static async getPipelineVelocity(organizationId, startDate, endDate) {
        const pipeline = await Opportunity.aggregate([
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
                }
            },
            {
                $project: {
                    name: 1,
                    stage: 1,
                    amount: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    closedAt: 1,
                    daysInStage: {
                        $divide: [
                            { $subtract: ['$updatedAt', '$createdAt'] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: '$stage',
                    count: { $sum: 1 },
                    averageDays: { $avg: '$daysInStage' },
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        return pipeline;
    }

    /**
     * Get conversion rates between stages
     */
    static async getConversionRates(organizationId, startDate, endDate) {
        const stages = [
            'qualification',
            'needs-analysis',
            'proposal',
            'negotiation',
            'closed-won',
            'closed-lost'
        ];

        const pipeline = await Opportunity.aggregate([
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
                }
            },
            {
                $group: {
                    _id: '$stage',
                    count: { $sum: 1 },
                    amount: { $sum: '$amount' }
                }
            }
        ]);

        const stageMap = {};
        pipeline.forEach(stage => {
            stageMap[stage._id] = stage;
        });

        const rates = [];
        for (let i = 0; i < stages.length - 2; i++) {
            const currentStage = stages[i];
            const nextStage = stages[i + 1];
            
            const currentCount = stageMap[currentStage]?.count || 0;
            const nextCount = stageMap[nextStage]?.count || 0;
            
            const conversionRate = currentCount > 0 
                ? (nextCount / currentCount) * 100 
                : 0;

            rates.push({
                fromStage: currentStage,
                toStage: nextStage,
                fromCount: currentCount,
                toCount: nextCount,
                conversionRate
            });
        }

        // Win rate
        const qualifiedCount = stageMap['negotiation']?.count || 0;
        const wonCount = stageMap['closed-won']?.count || 0;
        const winRate = qualifiedCount > 0 ? (wonCount / qualifiedCount) * 100 : 0;

        return {
            stageRates: rates,
            winRate,
            totalWon: stageMap['closed-won']?.amount || 0,
            totalLost: stageMap['closed-lost']?.amount || 0
        };
    }

    /**
     * Get lead conversion metrics
     */
    static async getLeadConversionMetrics(organizationId, startDate, endDate) {
        const leads = await Lead.aggregate([
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    converted: {
                        $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
                    },
                    qualified: {
                        $sum: { $cond: [{ $eq: ['$status', 'qualified'] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    total: 1,
                    converted: 1,
                    qualified: 1,
                    conversionRate: {
                        $multiply: [{ $divide: ['$converted', '$total'] }, 100]
                    },
                    qualificationRate: {
                        $multiply: [{ $divide: ['$qualified', '$total'] }, 100]
                    }
                }
            }
        ]);

        return leads[0] || { total: 0, converted: 0, qualified: 0, conversionRate: 0, qualificationRate: 0 };
    }

    /**
     * Get sales rep performance
     */
    static async getSalesRepPerformance(organizationId, startDate, endDate) {
        const performance = await Opportunity.aggregate([
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
                }
            },
            {
                $group: {
                    _id: '$assignedTo',
                    opportunities: { $sum: 1 },
                    won: {
                        $sum: { $cond: [{ $eq: ['$stage', 'closed-won'] }, 1, 0] }
                    },
                    lost: {
                        $sum: { $cond: [{ $eq: ['$stage', 'closed-lost'] }, 1, 0] }
                    },
                    totalValue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$stage', 'closed-won'] },
                                '$amount',
                                0
                            ]
                        }
                    },
                    pipelineValue: {
                        $sum: {
                            $cond: [
                                { $nin: ['$stage', ['closed-won', 'closed-lost']] },
                                '$amount',
                                0
                            ]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: 1,
                    name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                    email: '$user.email',
                    opportunities: 1,
                    won: 1,
                    lost: 1,
                    totalValue: 1,
                    pipelineValue: 1,
                    winRate: {
                        $multiply: [
                            { $divide: ['$won', { $max: [{ $add: ['$won', '$lost'] }, 1] }] },
                            100
                        ]
                    },
                    averageDealSize: {
                        $divide: ['$totalValue', { $max: ['$won', 1] }]
                    }
                }
            },
            { $sort: { totalValue: -1 } }
        ]);

        return performance;
    }

    /**
     * Get pipeline health metrics
     */
    static async getPipelineHealth(organizationId) {
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const metrics = await Opportunity.aggregate([
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    stage: { $nin: ['closed-won', 'closed-lost'] }
                }
            },
            {
                $facet: {
                    byAge: [
                        {
                            $bucket: {
                                groupBy: '$createdAt',
                                boundaries: [
                                    new Date(now.setDate(now.getDate() - 30)),
                                    new Date(now.setDate(now.getDate() - 60)),
                                    new Date(now.setDate(now.getDate() - 90)),
                                    new Date(now.setDate(now.getDate() - 120))
                                ],
                                default: 'older',
                                output: {
                                    count: { $sum: 1 },
                                    amount: { $sum: '$amount' }
                                }
                            }
                        }
                    ],
                    upcomingClosures: [
                        {
                            $match: {
                                expectedCloseDate: {
                                    $lte: thirtyDaysFromNow,
                                    $gte: new Date()
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                count: { $sum: 1 },
                                amount: { $sum: '$amount' },
                                weightedAmount: {
                                    $sum: {
                                        $multiply: [
                                            '$amount',
                                            { $divide: ['$probability', 100] }
                                        ]
                                    }
                                }
                            }
                        }
                    ],
                    staleOpportunities: [
                        {
                            $match: {
                                updatedAt: { $lte: new Date(now.setDate(now.getDate() - 7)) }
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                amount: 1,
                                stage: 1,
                                daysSinceUpdate: {
                                    $divide: [
                                        { $subtract: [new Date(), '$updatedAt'] },
                                        1000 * 60 * 60 * 24
                                    ]
                                }
                            }
                        },
                        { $sort: { daysSinceUpdate: -1 } },
                        { $limit: 10 }
                    ]
                }
            }
        ]);

        return metrics[0];
    }

    /**
     * Calculate pipeline coverage
     */
    static async calculatePipelineCoverage(organizationId, targetRevenue) {
        const pipeline = await this.getPipelineSummary(organizationId);
        
        const coverage = {
            targetRevenue,
            currentPipeline: pipeline.totals.amount,
            weightedPipeline: pipeline.totals.weightedAmount,
            coverageRatio: targetRevenue > 0 ? pipeline.totals.amount / targetRevenue : 0,
            weightedCoverageRatio: targetRevenue > 0 ? pipeline.totals.weightedAmount / targetRevenue : 0,
            gap: Math.max(0, targetRevenue - pipeline.totals.amount),
            weightedGap: Math.max(0, targetRevenue - pipeline.totals.weightedAmount)
        };

        return coverage;
    }

    /**
     * Get stage distribution
     */
    static async getStageDistribution(organizationId) {
        const distribution = await Opportunity.aggregate([
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId)
                }
            },
            {
                $group: {
                    _id: '$stage',
                    count: { $sum: 1 },
                    amount: { $sum: '$amount' }
                }
            },
            {
                $project: {
                    stage: '$_id',
                    count: 1,
                    amount: 1,
                    percentage: {
                        $multiply: [
                            { $divide: ['$count', { $sum: '$count' }] },
                            100
                        ]
                    }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        return distribution;
    }

    /**
     * Get conversion time analysis
     */
    static async getConversionTimeAnalysis(organizationId, startDate, endDate) {
        const analysis = await Opportunity.aggregate([
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
                    stage: { $in: ['closed-won', 'closed-lost'] }
                }
            },
            {
                $project: {
                    name: 1,
                    stage: 1,
                    amount: 1,
                    conversionTime: {
                        $divide: [
                            { $subtract: ['$closedAt', '$createdAt'] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: '$stage',
                    averageTime: { $avg: '$conversionTime' },
                    minTime: { $min: '$conversionTime' },
                    maxTime: { $max: '$conversionTime' },
                    count: { $sum: 1 }
                }
            }
        ]);

        return analysis;
    }
}

module.exports = PipelineService;