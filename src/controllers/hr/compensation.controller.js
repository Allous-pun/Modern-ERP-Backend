// src/controllers/hr/compensation.controller.js
const { Compensation, Employee } = require('../../models/hr');
const AuditLog = require('../../models/auditLog.model');

// @desc    Get all compensation records
// @route   GET /api/hr/compensation
// @access  Private (requires hr.compensation_view)
const getCompensation = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            employeeId,
            type,
            status,
            page = 1,
            limit = 20
        } = req.query;

        const filter = { organization: organizationId };
        
        if (employeeId) filter.employee = employeeId;
        if (type) filter.type = type;
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const compensations = await Compensation.find(filter)
            .sort({ effectiveDate: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('employee', 'firstName lastName employeeId department');

        const total = await Compensation.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: compensations,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get compensation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch compensation records'
        });
    }
};

// @desc    Get employee compensation
// @route   GET /api/hr/compensation/employee/:employeeId
// @access  Private (requires hr.compensation_view)
const getEmployeeCompensation = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const compensations = await Compensation.find({ 
            organization: organizationId,
            employee: req.params.employeeId
        }).sort({ effectiveDate: -1 });

        res.status(200).json({
            success: true,
            data: compensations
        });
    } catch (error) {
        console.error('Get employee compensation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee compensation'
        });
    }
};

// @desc    Create compensation record
// @route   POST /api/hr/compensation
// @access  Private (requires hr.compensation_manage)
const createCompensation = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { employeeId, type, amount, effectiveDate, currency, frequency, notes } = req.body;

        // Check employee exists
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // End current compensation if exists
        if (type === 'salary') {
            await Compensation.updateMany(
                {
                    organization: organizationId,
                    employee: employeeId,
                    type: 'salary',
                    status: 'active',
                    effectiveDate: { $lt: new Date(effectiveDate) }
                },
                {
                    status: 'inactive',
                    endDate: new Date(effectiveDate)
                }
            );
        }

        const compensation = await Compensation.create({
            organization: organizationId,
            employee: employeeId,
            type,
            amount,
            currency: currency || 'USD',
            frequency,
            effectiveDate: new Date(effectiveDate),
            status: 'active',
            notes,
            createdBy: req.user.userId
        });

        // Update employee current salary if this is a salary record
        if (type === 'salary') {
            employee.currentSalary = {
                amount,
                currency: currency || 'USD',
                frequency,
                effectiveDate: new Date(effectiveDate)
            };
            await employee.save();
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'compensation_created',
            target: compensation._id,
            details: {
                employeeId,
                type,
                amount
            }
        });

        res.status(201).json({
            success: true,
            message: 'Compensation record created successfully',
            data: compensation
        });
    } catch (error) {
        console.error('Create compensation error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create compensation record'
        });
    }
};

// @desc    Update compensation record
// @route   PUT /api/hr/compensation/:id
// @access  Private (requires hr.compensation_manage)
const updateCompensation = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const compensation = await Compensation.findOne({ 
            _id: req.params.id,
            organization: organizationId
        });

        if (!compensation) {
            return res.status(404).json({
                success: false,
                message: 'Compensation record not found'
            });
        }

        Object.assign(compensation, req.body);
        await compensation.save();

        // If this is an active salary record, update employee's current salary
        if (compensation.type === 'salary' && compensation.status === 'active') {
            await Employee.findByIdAndUpdate(compensation.employee, {
                currentSalary: {
                    amount: compensation.amount,
                    currency: compensation.currency,
                    frequency: compensation.frequency,
                    effectiveDate: compensation.effectiveDate
                }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Compensation record updated successfully',
            data: compensation
        });
    } catch (error) {
        console.error('Update compensation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update compensation record'
        });
    }
};

// @desc    Get salary structure
// @route   GET /api/hr/compensation/salary-structure
// @access  Private (requires hr.compensation_view)
const getSalaryStructure = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { department } = req.query;

        const filter = { organization: organizationId };
        if (department) filter.department = department;

        const employees = await Employee.find(filter)
            .select('firstName lastName employeeId department currentSalary');

        const structure = {
            byDepartment: {},
            byLevel: {},
            statistics: {
                min: 0,
                max: 0,
                avg: 0,
                median: 0
            }
        };

        const salaries = [];

        employees.forEach(emp => {
            if (emp.currentSalary) {
                const salary = emp.currentSalary.amount;
                salaries.push(salary);

                // Group by department
                if (!structure.byDepartment[emp.department]) {
                    structure.byDepartment[emp.department] = {
                        count: 0,
                        total: 0,
                        min: salary,
                        max: salary
                    };
                }

                const dept = structure.byDepartment[emp.department];
                dept.count++;
                dept.total += salary;
                dept.min = Math.min(dept.min, salary);
                dept.max = Math.max(dept.max, salary);
                dept.avg = dept.total / dept.count;
            }
        });

        if (salaries.length > 0) {
            salaries.sort((a, b) => a - b);
            structure.statistics = {
                min: salaries[0],
                max: salaries[salaries.length - 1],
                avg: salaries.reduce((a, b) => a + b, 0) / salaries.length,
                median: salaries[Math.floor(salaries.length / 2)]
            };
        }

        res.status(200).json({
            success: true,
            data: structure
        });
    } catch (error) {
        console.error('Get salary structure error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch salary structure'
        });
    }
};

// @desc    Process payroll
// @route   POST /api/hr/compensation/process-payroll
// @access  Private (requires hr.payroll_process)
const processPayroll = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { month, year, department } = req.body;

        const filter = { 
            organization: organizationId,
            status: 'active'
        };
        
        if (department) filter.department = department;

        const employees = await Employee.find(filter);

        const payroll = {
            month,
            year,
            processedAt: new Date(),
            processedBy: req.user.userId,
            employees: [],
            totals: {
                count: 0,
                grossPay: 0,
                deductions: 0,
                netPay: 0
            }
        };

        for (const emp of employees) {
            if (!emp.currentSalary) continue;

            const grossPay = emp.currentSalary.amount;
            const deductions = grossPay * 0.2; // Example: 20% deductions
            const netPay = grossPay - deductions;

            payroll.employees.push({
                employeeId: emp._id,
                name: `${emp.firstName} ${emp.lastName}`,
                department: emp.department,
                grossPay,
                deductions,
                netPay
            });

            payroll.totals.count++;
            payroll.totals.grossPay += grossPay;
            payroll.totals.deductions += deductions;
            payroll.totals.netPay += netPay;
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'payroll_processed',
            details: {
                month,
                year,
                employeeCount: payroll.totals.count,
                totalPayroll: payroll.totals.netPay
            }
        });

        res.status(200).json({
            success: true,
            message: 'Payroll processed successfully',
            data: payroll
        });
    } catch (error) {
        console.error('Process payroll error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process payroll'
        });
    }
};

module.exports = {
    getCompensation,
    getEmployeeCompensation,
    createCompensation,
    updateCompensation,
    getSalaryStructure,
    processPayroll
};