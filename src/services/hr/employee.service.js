// src/services/hr/employee.service.js
const { Employee, Attendance, Leave, Performance, Compensation } = require('../../models/hr');
const User = require('../../models/user.model');
const OrganizationMember = require('../../models/organizationMember.model');

class EmployeeService {
    
    /**
     * Create a new employee and optionally link to user
     */
    static async createEmployee(employeeData, organizationId, userId) {
        const session = await Employee.startSession();
        session.startTransaction();

        try {
            // Check if employee with same employeeId exists
            const existingEmployee = await Employee.findOne({
                organization: organizationId,
                employeeId: employeeData.employeeId
            }).session(session);

            if (existingEmployee) {
                throw new Error('Employee with this ID already exists');
            }

            // If userId is provided, check if user exists and belongs to organization
            if (employeeData.userId) {
                const member = await OrganizationMember.findOne({
                    user: employeeData.userId,
                    organization: organizationId
                }).session(session);

                if (!member) {
                    throw new Error('User does not belong to this organization');
                }
            }

            // Create employee
            const employee = await Employee.create([{
                ...employeeData,
                organization: organizationId,
                createdBy: userId
            }], { session });

            // If email matches an existing user, link automatically
            if (!employeeData.userId && employeeData.email) {
                const user = await User.findOne({ email: employeeData.email }).session(session);
                if (user) {
                    // Check if user belongs to organization
                    const member = await OrganizationMember.findOne({
                        user: user._id,
                        organization: organizationId
                    }).session(session);

                    if (member) {
                        employee[0].userId = user._id;
                        await employee[0].save({ session });
                    }
                }
            }

            await session.commitTransaction();
            return employee[0];

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Update employee information
     */
    static async updateEmployee(employeeId, updateData, organizationId, userId) {
        const employee = await Employee.findOne({
            _id: employeeId,
            organization: organizationId
        });

        if (!employee) {
            throw new Error('Employee not found');
        }

        // If updating employeeId, check for duplicates
        if (updateData.employeeId && updateData.employeeId !== employee.employeeId) {
            const existing = await Employee.findOne({
                organization: organizationId,
                employeeId: updateData.employeeId
            });

            if (existing) {
                throw new Error('Employee ID already exists');
            }
        }

        Object.assign(employee, updateData);
        employee.updatedBy = userId;
        await employee.save();

        return employee;
    }

    /**
     * Terminate employee
     */
    static async terminateEmployee(employeeId, terminationData, organizationId, userId) {
        const employee = await Employee.findOne({
            _id: employeeId,
            organization: organizationId
        });

        if (!employee) {
            throw new Error('Employee not found');
        }

        if (employee.employmentStatus !== 'active') {
            throw new Error('Employee is not active');
        }

        employee.employmentStatus = 'terminated';
        employee.terminationDate = terminationData.terminationDate || new Date();
        employee.lastWorkingDate = terminationData.lastWorkingDate;
        employee.notes = `Terminated: ${terminationData.reason || 'No reason provided'}\n${employee.notes || ''}`;
        employee.updatedBy = userId;
        await employee.save();

        // Deactivate user account if exists
        if (employee.userId) {
            await User.findByIdAndUpdate(employee.userId, { isActive: false });
        }

        return employee;
    }

    /**
     * Get employee directory
     */
    static async getEmployeeDirectory(organizationId, filters = {}) {
        const query = { organization: organizationId };

        if (filters.department) query.department = filters.department;
        if (filters.employmentStatus) query.employmentStatus = filters.employmentStatus;
        if (filters.position) query.position = filters.position;

        const employees = await Employee.find(query)
            .select('employeeId firstName lastName position department employmentStatus hireDate email phone')
            .sort('lastName firstName');

        return employees;
    }

    /**
     * Get employee hierarchy
     */
    static async getEmployeeHierarchy(organizationId, rootEmployeeId = null) {
        const query = { organization: organizationId };
        
        if (rootEmployeeId) {
            query._id = rootEmployeeId;
        }

        const employees = await Employee.find(query)
            .select('_id firstName lastName position department reportsTo')
            .lean();

        const employeeMap = {};
        employees.forEach(emp => {
            employeeMap[emp._id] = { ...emp, children: [] };
        });

        const hierarchy = [];

        employees.forEach(emp => {
            if (emp.reportsTo && employeeMap[emp.reportsTo]) {
                employeeMap[emp.reportsTo].children.push(employeeMap[emp._id]);
            } else {
                hierarchy.push(employeeMap[emp._id]);
            }
        });

        return hierarchy;
    }

    /**
     * Get employee statistics
     */
    static async getEmployeeStatistics(organizationId) {
        const pipeline = [
            { $match: { organization: mongoose.Types.ObjectId(organizationId) } },
            {
                $facet: {
                    byDepartment: [
                        { $group: {
                            _id: '$department',
                            count: { $sum: 1 },
                            active: {
                                $sum: { $cond: [{ $eq: ['$employmentStatus', 'active'] }, 1, 0] }
                            }
                        }}
                    ],
                    byStatus: [
                        { $group: {
                            _id: '$employmentStatus',
                            count: { $sum: 1 }
                        }}
                    ],
                    byType: [
                        { $group: {
                            _id: '$employmentType',
                            count: { $sum: 1 }
                        }}
                    ],
                    tenure: [
                        {
                            $project: {
                                yearsOfService: {
                                    $divide: [
                                        { $subtract: [new Date(), '$hireDate'] },
                                        1000 * 60 * 60 * 24 * 365
                                    ]
                                }
                            }
                        },
                        {
                            $bucket: {
                                groupBy: '$yearsOfService',
                                boundaries: [0, 1, 3, 5, 10, 20],
                                default: '20+',
                                output: {
                                    count: { $sum: 1 }
                                }
                            }
                        }
                    ],
                    totals: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                active: {
                                    $sum: { $cond: [{ $eq: ['$employmentStatus', 'active'] }, 1, 0] }
                                },
                                newHires: {
                                    $sum: {
                                        $cond: [
                                            { $gte: ['$hireDate', new Date(new Date().setMonth(new Date().getMonth() - 3))] },
                                            1,
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        ];

        const results = await Employee.aggregate(pipeline);
        return results[0] || {};
    }

    /**
     * Get employee profile with all related data
     */
    static async getEmployeeProfile(employeeId, organizationId) {
        const employee = await Employee.findOne({
            _id: employeeId,
            organization: organizationId
        }).populate('reportsTo', 'firstName lastName position');

        if (!employee) {
            throw new Error('Employee not found');
        }

        // Get recent attendance
        const attendance = await Attendance.find({
            organization: organizationId,
            employee: employeeId
        })
        .sort({ date: -1 })
        .limit(30);

        // Get upcoming leaves
        const upcomingLeaves = await Leave.find({
            organization: organizationId,
            employee: employeeId,
            startDate: { $gte: new Date() },
            status: { $in: ['pending', 'approved'] }
        }).sort('startDate');

        // Get performance reviews
        const performanceReviews = await Performance.find({
            organization: organizationId,
            employee: employeeId
        }).sort({ year: -1, createdAt: -1 });

        // Get compensation history
        const compensationHistory = await Compensation.find({
            organization: organizationId,
            employee: employeeId
        }).sort({ effectiveDate: -1 });

        return {
            employee,
            attendance,
            upcomingLeaves,
            performanceReviews,
            compensationHistory
        };
    }

    /**
     * Search employees
     */
    static async searchEmployees(organizationId, searchTerm, filters = {}) {
        const query = { organization: organizationId };

        if (searchTerm) {
            query.$or = [
                { firstName: { $regex: searchTerm, $options: 'i' } },
                { lastName: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } },
                { employeeId: { $regex: searchTerm, $options: 'i' } },
                { position: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        if (filters.department) query.department = filters.department;
        if (filters.employmentStatus) query.employmentStatus = filters.employmentStatus;

        return Employee.find(query)
            .select('employeeId firstName lastName position department employmentStatus email phone')
            .limit(filters.limit || 50)
            .sort('lastName firstName');
    }

    /**
     * Import employees from CSV/Excel
     */
    static async importEmployees(employeesData, organizationId, userId) {
        const results = {
            success: [],
            failed: [],
            total: employeesData.length
        };

        for (const empData of employeesData) {
            try {
                // Validate required fields
                if (!empData.firstName || !empData.lastName || !empData.email) {
                    throw new Error('Missing required fields');
                }

                // Generate employee ID if not provided
                if (!empData.employeeId) {
                    const count = await Employee.countDocuments({ organization: organizationId });
                    empData.employeeId = `EMP${String(count + 1).padStart(5, '0')}`;
                }

                const employee = await this.createEmployee(empData, organizationId, userId);
                results.success.push({
                    employeeId: employee.employeeId,
                    name: `${employee.firstName} ${employee.lastName}`,
                    id: employee._id
                });

            } catch (error) {
                results.failed.push({
                    data: empData,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Export employees data
     */
    static async exportEmployees(organizationId, format = 'json', filters = {}) {
        const employees = await Employee.find({
            organization: organizationId,
            ...filters
        }).lean();

        if (format === 'csv') {
            const fields = [
                'employeeId', 'firstName', 'lastName', 'email', 'phone',
                'department', 'position', 'employmentType', 'employmentStatus',
                'hireDate', 'dateOfBirth', 'gender'
            ];

            const csv = [
                fields.join(','),
                ...employees.map(emp => 
                    fields.map(f => emp[f] ? `"${emp[f]}"` : '').join(',')
                )
            ].join('\n');

            return { data: csv, format: 'csv' };
        }

        return { data: employees, format: 'json' };
    }
}

module.exports = EmployeeService;