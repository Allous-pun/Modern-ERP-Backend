// src/services/hr/reporting.service.js
const { Employee, Attendance, Leave, Performance, Compensation, Training } = require('../../models/hr');
const mongoose = require('mongoose');

class ReportingService {
    
    /**
     * Generate headcount report
     */
    static async generateHeadcountReport(organizationId, options = {}) {
        const { asOfDate = new Date(), groupBy = 'department' } = options;

        const pipeline = [
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    employmentStatus: 'active'
                }
            }
        ];

        if (groupBy === 'department') {
            pipeline.push({
                $group: {
                    _id: '$department',
                    count: { $sum: 1 },
                    employees: {
                        $push: {
                            id: '$_id',
                            name: { $concat: ['$firstName', ' ', '$lastName'] },
                            position: '$position',
                            hireDate: '$hireDate'
                        }
                    }
                }
            });
        } else if (groupBy === 'position') {
            pipeline.push({
                $group: {
                    _id: '$position',
                    count: { $sum: 1 },
                    employees: {
                        $push: {
                            id: '$_id',
                            name: { $concat: ['$firstName', ' ', '$lastName'] },
                            department: '$department',
                            hireDate: '$hireDate'
                        }
                    }
                }
            });
        } else if (groupBy === 'employmentType') {
            pipeline.push({
                $group: {
                    _id: '$employmentType',
                    count: { $sum: 1 },
                    employees: {
                        $push: {
                            id: '$_id',
                            name: { $concat: ['$firstName', ' ', '$lastName'] },
                            department: '$department',
                            position: '$position'
                        }
                    }
                }
            });
        }

        pipeline.push({ $sort: { '_id': 1 } });

        const data = await Employee.aggregate(pipeline);

        // Calculate totals
        const total = data.reduce((sum, group) => sum + group.count, 0);

        return {
            asOfDate,
            groupBy,
            data,
            total
        };
    }

    /**
     * Generate turnover report
     */
    static async generateTurnoverReport(organizationId, startDate, endDate) {
        const pipeline = [
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    $or: [
                        { hireDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
                        { terminationDate: { $gte: new Date(startDate), $lte: new Date(endDate) } }
                    ]
                }
            },
            {
                $facet: {
                    hires: [
                        { $match: { hireDate: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
                        {
                            $group: {
                                _id: { $dateToString: { format: '%Y-%m', date: '$hireDate' } },
                                count: { $sum: 1 },
                                employees: {
                                    $push: {
                                        name: { $concat: ['$firstName', ' ', '$lastName'] },
                                        department: '$department',
                                        position: '$position',
                                        date: '$hireDate'
                                    }
                                }
                            }
                        }
                    ],
                    terminations: [
                        { $match: { terminationDate: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
                        {
                            $group: {
                                _id: { $dateToString: { format: '%Y-%m', date: '$terminationDate' } },
                                count: { $sum: 1 },
                                employees: {
                                    $push: {
                                        name: { $concat: ['$firstName', ' ', '$lastName'] },
                                        department: '$department',
                                        position: '$position',
                                        date: '$terminationDate'
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        ];

        const [result] = await Employee.aggregate(pipeline);

        // Get average headcount for period
        const avgHeadcount = await this.getAverageHeadcount(organizationId, startDate, endDate);

        const hiresByMonth = result.hires || [];
        const terminationsByMonth = result.terminations || [];

        // Calculate turnover rates
        const turnoverData = [];
        const months = this.getMonthsInRange(startDate, endDate);

        for (const month of months) {
            const hires = hiresByMonth.find(h => h._id === month)?.count || 0;
            const terminations = terminationsByMonth.find(t => t._id === month)?.count || 0;
            
            const turnoverRate = avgHeadcount > 0 ? (terminations / avgHeadcount) * 100 : 0;

            turnoverData.push({
                month,
                hires,
                terminations,
                turnoverRate: Math.round(turnoverRate * 100) / 100
            });
        }

        const totalHires = hiresByMonth.reduce((sum, h) => sum + h.count, 0);
        const totalTerminations = terminationsByMonth.reduce((sum, t) => sum + t.count, 0);
        const overallTurnoverRate = avgHeadcount > 0 ? (totalTerminations / avgHeadcount) * 100 : 0;

        return {
            period: { startDate, endDate },
            hires: {
                total: totalHires,
                byMonth: hiresByMonth,
                details: result.hires?.flatMap(h => h.employees) || []
            },
            terminations: {
                total: totalTerminations,
                byMonth: terminationsByMonth,
                details: result.terminations?.flatMap(t => t.employees) || []
            },
            turnoverRate: {
                monthly: turnoverData,
                overall: Math.round(overallTurnoverRate * 100) / 100,
                annualized: Math.round(overallTurnoverRate * 12 * 100) / 100
            }
        };
    }

    /**
     * Generate attendance report
     */
    static async generateAttendanceReport(organizationId, startDate, endDate) {
        const pipeline = [
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
                }
            },
            {
                $lookup: {
                    from: 'employees',
                    localField: 'employee',
                    foreignField: '_id',
                    as: 'employeeInfo'
                }
            },
            { $unwind: '$employeeInfo' },
            {
                $group: {
                    _id: {
                        department: '$employeeInfo.department',
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                        status: '$status'
                    },
                    count: { $sum: 1 },
                    totalHours: { $sum: '$workingHours' },
                    overtimeHours: { $sum: '$overtimeHours' },
                    lateMinutes: { $sum: '$lateMinutes' }
                }
            },
            {
                $group: {
                    _id: {
                        department: '$_id.department',
                        date: '$_id.date'
                    },
                    present: {
                        $sum: { $cond: [{ $eq: ['$_id.status', 'present'] }, '$count', 0] }
                    },
                    absent: {
                        $sum: { $cond: [{ $eq: ['$_id.status', 'absent'] }, '$count', 0] }
                    },
                    late: {
                        $sum: { $cond: [{ $eq: ['$_id.status', 'late'] }, '$count', 0] }
                    },
                    halfDay: {
                        $sum: { $cond: [{ $eq: ['$_id.status', 'half-day'] }, '$count', 0] }
                    },
                    totalHours: { $sum: '$totalHours' },
                    overtimeHours: { $sum: '$overtimeHours' },
                    lateMinutes: { $sum: '$lateMinutes' }
                }
            },
            {
                $group: {
                    _id: '$_id.department',
                    daily: {
                        $push: {
                            date: '$_id.date',
                            present: '$present',
                            absent: '$absent',
                            late: '$late',
                            halfDay: '$halfDay',
                            totalHours: '$totalHours',
                            overtimeHours: '$overtimeHours',
                            lateMinutes: '$lateMinutes'
                        }
                    },
                    summary: {
                        $sum: {
                            present: '$present',
                            absent: '$absent',
                            late: '$late',
                            halfDay: '$halfDay',
                            totalHours: '$totalHours',
                            overtimeHours: '$overtimeHours',
                            lateMinutes: '$lateMinutes'
                        }
                    }
                }
            }
        ];

        const data = await Attendance.aggregate(pipeline);

        // Calculate overall summary
        const overallSummary = data.reduce(
            (acc, dept) => {
                acc.present += dept.summary.present || 0;
                acc.absent += dept.summary.absent || 0;
                acc.late += dept.summary.late || 0;
                acc.halfDay += dept.summary.halfDay || 0;
                acc.totalHours += dept.summary.totalHours || 0;
                acc.overtimeHours += dept.summary.overtimeHours || 0;
                acc.lateMinutes += dept.summary.lateMinutes || 0;
                return acc;
            },
            { present: 0, absent: 0, late: 0, halfDay: 0, totalHours: 0, overtimeHours: 0, lateMinutes: 0 }
        );

        const totalEmployees = await Employee.countDocuments({
            organization: organizationId,
            employmentStatus: 'active'
        });

        const workingDays = this.getWorkingDays(startDate, endDate);
        const expectedAttendance = totalEmployees * workingDays;

        overallSummary.attendanceRate = expectedAttendance > 0
            ? (overallSummary.present / expectedAttendance) * 100
            : 0;

        return {
            period: { startDate, endDate },
            departments: data,
            overall: overallSummary,
            metrics: {
                averageDailyAttendance: overallSummary.present / workingDays,
                absenteeismRate: expectedAttendance > 0
                    ? (overallSummary.absent / expectedAttendance) * 100
                    : 0,
                latenessRate: overallSummary.present > 0
                    ? (overallSummary.late / overallSummary.present) * 100
                    : 0
            }
        };
    }

    /**
     * Generate leave report
     */
    static async generateLeaveReport(organizationId, year) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);

        const pipeline = [
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    startDate: { $lte: endDate },
                    endDate: { $gte: startDate }
                }
            },
            {
                $lookup: {
                    from: 'employees',
                    localField: 'employee',
                    foreignField: '_id',
                    as: 'employeeInfo'
                }
            },
            { $unwind: '$employeeInfo' },
            {
                $group: {
                    _id: {
                        department: '$employeeInfo.department',
                        leaveType: '$leaveType',
                        status: '$status'
                    },
                    totalDays: { $sum: '$days' },
                    count: { $sum: 1 },
                    employees: {
                        $push: {
                            name: { $concat: ['$employeeInfo.firstName', ' ', '$employeeInfo.lastName'] },
                            days: '$days',
                            startDate: '$startDate',
                            endDate: '$endDate'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        department: '$_id.department',
                        leaveType: '$_id.leaveType'
                    },
                    approved: {
                        $sum: { $cond: [{ $eq: ['$_id.status', 'approved'] }, '$totalDays', 0] }
                    },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$_id.status', 'pending'] }, '$totalDays', 0] }
                    },
                    totalDays: { $sum: '$totalDays' },
                    totalRequests: { $sum: '$count' },
                    employees: { $first: '$employees' }
                }
            }
        ];

        const data = await Leave.aggregate(pipeline);

        // Calculate summary by leave type
        const byType = {};
        data.forEach(item => {
            if (!byType[item._id.leaveType]) {
                byType[item._id.leaveType] = {
                    totalDays: 0,
                    approved: 0,
                    pending: 0,
                    requests: 0
                };
            }
            byType[item._id.leaveType].totalDays += item.totalDays;
            byType[item._id.leaveType].approved += item.approved;
            byType[item._id.leaveType].pending += item.pending;
            byType[item._id.leaveType].requests += item.totalRequests;
        });

        return {
            year,
            byDepartment: data,
            byType,
            totals: {
                totalDays: Object.values(byType).reduce((sum, t) => sum + t.totalDays, 0),
                totalRequests: data.reduce((sum, d) => sum + d.totalRequests, 0),
                averageDaysPerRequest: data.length > 0
                    ? Object.values(byType).reduce((sum, t) => sum + t.totalDays, 0) / data.reduce((sum, d) => sum + d.totalRequests, 0)
                    : 0
            }
        };
    }

    /**
     * Generate performance report
     */
    static async generatePerformanceReport(organizationId, year) {
        const pipeline = [
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    year,
                    status: 'approved'
                }
            },
            {
                $lookup: {
                    from: 'employees',
                    localField: 'employee',
                    foreignField: '_id',
                    as: 'employeeInfo'
                }
            },
            { $unwind: '$employeeInfo' },
            {
                $group: {
                    _id: {
                        department: '$employeeInfo.department',
                        rating: '$overallRating'
                    },
                    count: { $sum: 1 },
                    averageScore: { $avg: '$overallScore' },
                    employees: {
                        $push: {
                            name: { $concat: ['$employeeInfo.firstName', ' ', '$employeeInfo.lastName'] },
                            score: '$overallScore',
                            rating: '$overallRating'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$_id.department',
                    ratings: {
                        $push: {
                            rating: '$_id.rating',
                            count: '$count',
                            averageScore: '$averageScore',
                            employees: '$employees'
                        }
                    },
                    totalReviews: { $sum: '$count' },
                    departmentAverage: { $avg: '$averageScore' }
                }
            }
        ];

        const data = await Performance.aggregate(pipeline);

        // Calculate overall statistics
        const overall = {
            totalReviews: data.reduce((sum, d) => sum + d.totalReviews, 0),
            averageScore: data.length > 0
                ? data.reduce((sum, d) => sum + d.departmentAverage, 0) / data.length
                : 0,
            distribution: {}
        };

        data.forEach(dept => {
            dept.ratings.forEach(r => {
                if (!overall.distribution[r.rating]) {
                    overall.distribution[r.rating] = 0;
                }
                overall.distribution[r.rating] += r.count;
            });
        });

        return {
            year,
            byDepartment: data,
            overall,
            topPerformers: await this.getTopPerformers(organizationId, year, 10),
            needsImprovement: await this.getNeedsImprovement(organizationId, year, 10)
        };
    }

    /**
     * Generate training report
     */
    static async generateTrainingReport(organizationId, startDate, endDate) {
        const pipeline = [
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    startDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
                }
            },
            {
                $project: {
                    title: 1,
                    type: 1,
                    startDate: 1,
                    endDate: 1,
                    status: 1,
                    enrolledCount: { $size: '$participants' },
                    completedCount: {
                        $size: {
                            $filter: {
                                input: '$participants',
                                as: 'p',
                                cond: { $eq: ['$$p.status', 'completed'] }
                            }
                        }
                    },
                    averageProgress: { $avg: '$participants.progress' },
                    cost: '$cost.amount'
                }
            },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    totalParticipants: { $sum: '$enrolledCount' },
                    completedParticipants: { $sum: '$completedCount' },
                    averageProgress: { $avg: '$averageProgress' },
                    totalCost: { $sum: '$cost' },
                    trainings: { $push: '$$ROOT' }
                }
            }
        ];

        const data = await Training.aggregate(pipeline);

        return {
            period: { startDate, endDate },
            byType: data,
            totals: {
                totalTrainings: data.reduce((sum, t) => sum + t.count, 0),
                totalParticipants: data.reduce((sum, t) => sum + t.totalParticipants, 0),
                completionRate: data.reduce((sum, t) => sum + t.totalParticipants, 0) > 0
                    ? (data.reduce((sum, t) => sum + t.completedParticipants, 0) / data.reduce((sum, t) => sum + t.totalParticipants, 0)) * 100
                    : 0,
                totalCost: data.reduce((sum, t) => sum + t.totalCost, 0)
            }
        };
    }

    /**
     * Get top performers
     */
    static async getTopPerformers(organizationId, year, limit = 10) {
        const pipeline = [
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    year,
                    status: 'approved'
                }
            },
            { $sort: { overallScore: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'employees',
                    localField: 'employee',
                    foreignField: '_id',
                    as: 'employeeInfo'
                }
            },
            { $unwind: '$employeeInfo' },
            {
                $project: {
                    name: { $concat: ['$employeeInfo.firstName', ' ', '$employeeInfo.lastName'] },
                    department: '$employeeInfo.department',
                    position: '$employeeInfo.position',
                    score: '$overallScore',
                    rating: '$overallRating',
                    reviewPeriod: '$reviewPeriod'
                }
            }
        ];

        return Performance.aggregate(pipeline);
    }

    /**
     * Get needs improvement list
     */
    static async getNeedsImprovement(organizationId, year, limit = 10) {
        const pipeline = [
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    year,
                    status: 'approved',
                    overallRating: { $in: ['needs-improvement', 'poor'] }
                }
            },
            { $sort: { overallScore: 1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'employees',
                    localField: 'employee',
                    foreignField: '_id',
                    as: 'employeeInfo'
                }
            },
            { $unwind: '$employeeInfo' },
            {
                $project: {
                    name: { $concat: ['$employeeInfo.firstName', ' ', '$employeeInfo.lastName'] },
                    department: '$employeeInfo.department',
                    position: '$employeeInfo.position',
                    score: '$overallScore',
                    rating: '$overallRating',
                    reviewPeriod: '$reviewPeriod'
                }
            }
        ];

        return Performance.aggregate(pipeline);
    }

    /**
     * Get average headcount for period
     */
    static async getAverageHeadcount(organizationId, startDate, endDate) {
        const employees = await Employee.find({
            organization: organizationId,
            employmentStatus: 'active'
        });

        if (employees.length === 0) return 0;

        let totalDays = 0;
        const days = this.getDaysInRange(startDate, endDate);

        for (const day of days) {
            const activeOnDay = employees.filter(e => 
                e.hireDate <= day && 
                (!e.terminationDate || e.terminationDate >= day)
            ).length;
            totalDays += activeOnDay;
        }

        return totalDays / days.length;
    }

    /**
     * Get months in range
     */
    static getMonthsInRange(startDate, endDate) {
        const months = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        while (start <= end) {
            months.push(start.toISOString().slice(0, 7));
            start.setMonth(start.getMonth() + 1);
        }

        return months;
    }

    /**
     * Get days in range
     */
    static getDaysInRange(startDate, endDate) {
        const days = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        while (start <= end) {
            days.push(new Date(start));
            start.setDate(start.getDate() + 1);
        }

        return days;
    }

    /**
     * Get working days count
     */
    static getWorkingDays(startDate, endDate, excludeWeekends = true) {
        let count = 0;
        const start = new Date(startDate);
        const end = new Date(endDate);

        while (start <= end) {
            const dayOfWeek = start.getDay();
            if (!excludeWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
                count++;
            }
            start.setDate(start.getDate() + 1);
        }

        return count;
    }
}

module.exports = ReportingService;