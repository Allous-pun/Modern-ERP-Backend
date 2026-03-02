// src/controllers/hr/employee.controller.js
const { Employee } = require('../../models/hr');
const AuditLog = require('../../models/auditLog.model');
const User = require('../../models/user.model');
const OrganizationMember = require('../../models/organizationMember.model');

// @desc    Get all employees
// @route   GET /api/hr/employees
// @access  Private (requires hr.employees_view)
const getEmployees = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        const { 
            department,
            status,
            employmentType,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = -1
        } = req.query;

        const filter = { organization: organizationId };
        if (department) filter.department = department;
        if (status) filter.status = status;
        if (employmentType) filter.employmentType = employmentType;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const employees = await Employee.find(filter)
            .sort({ [sortBy]: parseInt(sortOrder) })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('userId', 'firstName lastName email avatar');

        const total = await Employee.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: employees,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employees'
        });
    }
};

// @desc    Get single employee
// @route   GET /api/hr/employees/:id
// @access  Private (requires hr.employees_view)
const getEmployee = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const employee = await Employee.findOne({ 
            _id: req.params.id,
            organization: organizationId
        }).populate('userId', 'firstName lastName email avatar');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            data: employee
        });
    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch employee'
        });
    }
};

// @desc    Create employee
// @route   POST /api/hr/employees
// @access  Private (requires hr.employees_create)
const createEmployee = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        // Check if employee with same employeeId exists
        if (req.body.employeeId) {
            const existingEmployee = await Employee.findOne({
                organization: organizationId,
                employeeId: req.body.employeeId
            });

            if (existingEmployee) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee with this ID already exists'
                });
            }
        }

        // If userId is provided, check if user exists and belongs to organization
        if (req.body.userId) {
            const member = await OrganizationMember.findOne({
                user: req.body.userId,
                organization: organizationId
            });

            if (!member) {
                return res.status(400).json({
                    success: false,
                    message: 'User does not belong to this organization'
                });
            }
        }

        const employeeData = {
            ...req.body,
            organization: organizationId,
            createdBy: req.user.userId
        };

        const employee = await Employee.create(employeeData);

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'employee_created',
            target: employee._id,
            details: {
                employeeId: employee.employeeId,
                firstName: employee.firstName,
                lastName: employee.lastName
            }
        });

        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: employee
        });
    } catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create employee'
        });
    }
};

// @desc    Update employee
// @route   PUT /api/hr/employees/:id
// @access  Private (requires hr.employees_update)
const updateEmployee = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const employee = await Employee.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId
            },
            req.body,
            { new: true, runValidators: true }
        );

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'employee_updated',
            target: employee._id,
            details: {
                employeeId: employee.employeeId,
                name: `${employee.firstName} ${employee.lastName}`
            }
        });

        res.status(200).json({
            success: true,
            message: 'Employee updated successfully',
            data: employee
        });
    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update employee'
        });
    }
};

// @desc    Delete employee (deactivate)
// @route   DELETE /api/hr/employees/:id
// @access  Private (requires hr.employees_delete)
const deleteEmployee = async (req, res) => {
    try {
        const organizationId = req.headers['x-organization-id'] || req.user.defaultOrganization;
        
        const employee = await Employee.findOneAndUpdate(
            { 
                _id: req.params.id,
                organization: organizationId
            },
            { 
                status: 'terminated',
                terminationDate: new Date(),
                updatedBy: req.user.userId
            },
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Log audit
        await AuditLog.create({
            organization: organizationId,
            user: req.user.userId,
            action: 'employee_terminated',
            target: employee._id,
            details: {
                employeeId: employee.employeeId,
                name: `${employee.firstName} ${employee.lastName}`
            }
        });

        res.status(200).json({
            success: true,
            message: 'Employee terminated successfully'
        });
    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to terminate employee'
        });
    }
};

module.exports = {
    getEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee
};