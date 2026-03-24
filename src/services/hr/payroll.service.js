// src/services/hr/payroll.service.js
const { Employee, Compensation, Attendance, Leave } = require('../../models/hr');
const mongoose = require('mongoose');

class PayrollService {
    
    /**
     * Process payroll for a period
     */
    static async processPayroll(organizationId, period, userId) {
        const { month, year } = period;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Get all active employees
        const employees = await Employee.find({
            organization: organizationId,
            employmentStatus: 'active'
        }).populate('currentSalary');

        const payroll = {
            period,
            processedAt: new Date(),
            processedBy: userId,
            employees: [],
            summary: {
                totalEmployees: employees.length,
                totalGrossPay: 0,
                totalDeductions: 0,
                totalNetPay: 0,
                totalTax: 0,
                totalEmployerContributions: 0
            }
        };

        for (const employee of employees) {
            const employeePayroll = await this.calculateEmployeePayroll(
                employee,
                startDate,
                endDate
            );

            payroll.employees.push(employeePayroll);
            
            payroll.summary.totalGrossPay += employeePayroll.grossPay;
            payroll.summary.totalDeductions += employeePayroll.totalDeductions;
            payroll.summary.totalNetPay += employeePayroll.netPay;
            payroll.summary.totalTax += employeePayroll.tax.total;
            payroll.summary.totalEmployerContributions += employeePayroll.employerContributions.total;
        }

        // Save payroll record
        const Payroll = mongoose.model('Payroll');
        const payrollRecord = await Payroll.create({
            organization: organizationId,
            period,
            startDate,
            endDate,
            data: payroll,
            processedBy: userId,
            status: 'processed'
        });

        return payrollRecord;
    }

    /**
     * Calculate individual employee payroll
     */
    static async calculateEmployeePayroll(employee, startDate, endDate) {
        // Get base salary
        const baseSalary = employee.currentSalary?.amount || 0;
        const salaryFrequency = employee.currentSalary?.frequency || 'monthly';
        
        // Calculate daily rate
        const dailyRate = this.calculateDailyRate(baseSalary, salaryFrequency);

        // Get attendance for period
        const attendance = await Attendance.find({
            employee: employee._id,
            date: { $gte: startDate, $lte: endDate }
        });

        // Get leaves for period
        const leaves = await Leave.find({
            employee: employee._id,
            status: 'approved',
            $or: [
                { startDate: { $lte: endDate, $gte: startDate } },
                { endDate: { $lte: endDate, $gte: startDate } }
            ]
        });

        // Calculate working days
        const workingDays = this.calculateWorkingDays(attendance, leaves, startDate, endDate);
        
        // Calculate gross pay
        const grossPay = workingDays.present * dailyRate;
        
        // Calculate overtime
        const overtimePay = this.calculateOvertimePay(attendance, dailyRate);

        // Calculate deductions
        const deductions = await this.calculateDeductions(employee, grossPay);

        // Calculate taxes
        const tax = this.calculateTax(grossPay, employee.taxInformation);

        // Calculate employer contributions
        const employerContributions = this.calculateEmployerContributions(grossPay);

        return {
            employeeId: employee._id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            position: employee.position,
            baseSalary,
            dailyRate,
            attendance: {
                workingDays: workingDays.total,
                presentDays: workingDays.present,
                absentDays: workingDays.absent,
                leaveDays: workingDays.leave,
                holidayDays: workingDays.holiday
            },
            earnings: {
                basic: grossPay,
                overtime: overtimePay,
                bonus: 0,
                commission: 0,
                allowance: 0,
                total: grossPay + overtimePay
            },
            deductions: {
                tax: tax.total,
                pension: deductions.pension,
                healthInsurance: deductions.healthInsurance,
                loan: deductions.loan,
                other: deductions.other,
                total: tax.total + deductions.pension + deductions.healthInsurance + 
                       deductions.loan + deductions.other
            },
            tax: {
                taxableIncome: grossPay,
                brackets: tax.brackets,
                total: tax.total
            },
            employerContributions: {
                pension: employerContributions.pension,
                healthInsurance: employerContributions.healthInsurance,
                socialSecurity: employerContributions.socialSecurity,
                other: employerContributions.other,
                total: employerContributions.pension + employerContributions.healthInsurance +
                       employerContributions.socialSecurity + employerContributions.other
            },
            netPay: grossPay + overtimePay - (tax.total + deductions.pension + 
                    deductions.healthInsurance + deductions.loan + deductions.other)
        };
    }

    /**
     * Calculate daily rate from salary
     */
    static calculateDailyRate(salary, frequency) {
        switch(frequency) {
            case 'annual':
                return salary / 260; // Working days in a year
            case 'monthly':
                return salary / 22; // Average working days in a month
            case 'weekly':
                return salary / 5;
            case 'daily':
                return salary;
            default:
                return salary / 22;
        }
    }

    /**
     * Calculate working days from attendance
     */
    static calculateWorkingDays(attendance, leaves, startDate, endDate) {
        const result = {
            total: 0,
            present: 0,
            absent: 0,
            leave: 0,
            holiday: 0
        };

        // Calculate total working days in period
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        result.total = days;

        // Count attendance
        attendance.forEach(a => {
            if (a.status === 'present') result.present++;
            else if (a.status === 'absent') result.absent++;
            else if (a.status === 'holiday') result.holiday++;
            else if (a.status === 'leave') result.leave++;
        });

        // Add approved leaves not already counted
        leaves.forEach(leave => {
            const leaveDays = leave.days;
            result.leave += leaveDays;
            // Adjust if leave was already counted in attendance
            result.absent = Math.max(0, result.absent - leaveDays);
        });

        return result;
    }

    /**
     * Calculate overtime pay
     */
    static calculateOvertimePay(attendance, dailyRate) {
        const hourlyRate = dailyRate / 8; // Assuming 8-hour workday
        let overtimePay = 0;

        attendance.forEach(a => {
            if (a.overtimeHours > 0) {
                // Overtime paid at 1.5x rate
                overtimePay += a.overtimeHours * hourlyRate * 1.5;
            }
        });

        return overtimePay;
    }

    /**
     * Calculate deductions
     */
    static async calculateDeductions(employee, grossPay) {
        const deductions = {
            pension: 0,
            healthInsurance: 0,
            loan: 0,
            other: 0
        };

        // Pension contribution (employee portion)
        deductions.pension = grossPay * 0.05; // 5% example

        // Health insurance
        deductions.healthInsurance = grossPay * 0.02; // 2% example

        // Get active loans
        const Loan = mongoose.model('Loan');
        const activeLoans = await Loan.find({
            employee: employee._id,
            status: 'active'
        });

        activeLoans.forEach(loan => {
            deductions.loan += loan.monthlyPayment || 0;
        });

        return deductions;
    }

    /**
     * Calculate tax
     */
    static calculateTax(grossPay, taxInfo) {
        // Progressive tax brackets example
        const brackets = [
            { min: 0, max: 1000, rate: 0 },
            { min: 1001, max: 3000, rate: 0.1 },
            { min: 3001, max: 5000, rate: 0.15 },
            { min: 5001, max: 10000, rate: 0.2 },
            { min: 10001, max: null, rate: 0.25 }
        ];

        let totalTax = 0;
        const appliedBrackets = [];

        for (const bracket of brackets) {
            if (grossPay > bracket.min) {
                const taxableAmount = bracket.max 
                    ? Math.min(grossPay - bracket.min, bracket.max - bracket.min)
                    : grossPay - bracket.min;
                
                const bracketTax = taxableAmount * bracket.rate;
                totalTax += bracketTax;

                appliedBrackets.push({
                    range: bracket.max 
                        ? `${bracket.min} - ${bracket.max}`
                        : `${bracket.min}+`,
                    rate: bracket.rate * 100,
                    amount: taxableAmount,
                    tax: bracketTax
                });
            }
        }

        return {
            brackets: appliedBrackets,
            total: totalTax
        };
    }

    /**
     * Calculate employer contributions
     */
    static calculateEmployerContributions(grossPay) {
        return {
            pension: grossPay * 0.1, // Employer pension contribution (10%)
            healthInsurance: grossPay * 0.05, // Employer health insurance (5%)
            socialSecurity: grossPay * 0.08, // Social security (8%)
            other: 0
        };
    }

    /**
     * Generate payslip
     */
    static async generatePayslip(employeeId, period) {
        const employee = await Employee.findById(employeeId);
        
        if (!employee) {
            throw new Error('Employee not found');
        }

        const { month, year } = period;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const payrollData = await this.calculateEmployeePayroll(
            employee,
            startDate,
            endDate
        );

        const payslip = {
            employee: {
                id: employee._id,
                name: `${employee.firstName} ${employee.lastName}`,
                employeeId: employee.employeeId,
                department: employee.department,
                position: employee.position,
                bankDetails: employee.bankDetails
            },
            period,
            generatedAt: new Date(),
            earnings: payrollData.earnings,
            deductions: payrollData.deductions,
            netPay: payrollData.netPay,
            tax: payrollData.tax
        };

        return payslip;
    }

    /**
     * Get payroll summary for period
     */
    static async getPayrollSummary(organizationId, year) {
        const Payroll = mongoose.model('Payroll');

        const pipeline = [
            {
                $match: {
                    organization: mongoose.Types.ObjectId(organizationId),
                    'period.year': year
                }
            },
            {
                $group: {
                    _id: '$period.month',
                    totalGrossPay: { $sum: '$summary.totalGrossPay' },
                    totalNetPay: { $sum: '$summary.totalNetPay' },
                    totalTax: { $sum: '$summary.totalTax' },
                    employeeCount: { $first: '$summary.totalEmployees' },
                    processedAt: { $first: '$processedAt' },
                    status: { $first: '$status' }
                }
            },
            { $sort: { '_id': 1 } }
        ];

        const monthlyData = await Payroll.aggregate(pipeline);

        const yearlySummary = {
            year,
            months: monthlyData,
            totals: {
                grossPay: monthlyData.reduce((sum, m) => sum + m.totalGrossPay, 0),
                netPay: monthlyData.reduce((sum, m) => sum + m.totalNetPay, 0),
                tax: monthlyData.reduce((sum, m) => sum + m.totalTax, 0)
            }
        };

        return yearlySummary;
    }

    /**
     * Process bulk payroll
     */
    static async processBulkPayroll(organizationId, periods, userId) {
        const results = [];

        for (const period of periods) {
            try {
                const payroll = await this.processPayroll(organizationId, period, userId);
                results.push({
                    period,
                    success: true,
                    id: payroll._id
                });
            } catch (error) {
                results.push({
                    period,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Revert payroll
     */
    static async revertPayroll(payrollId, organizationId, userId) {
        const Payroll = mongoose.model('Payroll');
        
        const payroll = await Payroll.findOne({
            _id: payrollId,
            organization: organizationId
        });

        if (!payroll) {
            throw new Error('Payroll not found');
        }

        payroll.status = 'reverted';
        payroll.revertedBy = userId;
        payroll.revertedAt = new Date();
        await payroll.save();

        return payroll;
    }
}

module.exports = PayrollService;