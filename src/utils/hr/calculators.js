// src/utils/hr/calculators.js

/**
 * Calculate age from date of birth
 * @param {Date|string} dateOfBirth - Date of birth
 * @returns {number} Age in years
 */
const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
};

/**
 * Calculate years of service
 * @param {Date|string} hireDate - Date of hire
 * @param {Date|string} endDate - End date (optional, defaults to today)
 * @returns {number} Years of service
 */
const calculateYearsOfService = (hireDate, endDate = new Date()) => {
    if (!hireDate) return 0;
    
    const start = new Date(hireDate);
    const end = new Date(endDate);
    
    const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.round(years * 10) / 10;
};

/**
 * Calculate pro-rated salary
 * @param {number} annualSalary - Annual salary amount
 * @param {number} daysWorked - Number of days worked
 * @param {number} totalDays - Total days in period (default: 365)
 * @returns {number} Pro-rated salary
 */
const calculateProRatedSalary = (annualSalary, daysWorked, totalDays = 365) => {
    if (!annualSalary || !daysWorked) return 0;
    return (annualSalary / totalDays) * daysWorked;
};

/**
 * Calculate overtime pay
 * @param {number} hourlyRate - Hourly rate
 * @param {number} overtimeHours - Overtime hours worked
 * @param {number} multiplier - Overtime multiplier (default: 1.5)
 * @returns {number} Overtime pay
 */
const calculateOvertimePay = (hourlyRate, overtimeHours, multiplier = 1.5) => {
    if (!hourlyRate || !overtimeHours) return 0;
    return hourlyRate * overtimeHours * multiplier;
};

/**
 * Calculate daily rate from salary
 * @param {number} salary - Salary amount
 * @param {string} frequency - Salary frequency (annual, monthly, weekly)
 * @param {number} workingDays - Working days per period (optional)
 * @returns {number} Daily rate
 */
const calculateDailyRate = (salary, frequency, workingDays = null) => {
    if (!salary) return 0;
    
    switch(frequency) {
        case 'annual':
            return salary / (workingDays || 260);
        case 'monthly':
            return salary / (workingDays || 22);
        case 'weekly':
            return salary / (workingDays || 5);
        case 'daily':
            return salary;
        default:
            return salary / 22;
    }
};

/**
 * Calculate hourly rate from salary
 * @param {number} salary - Salary amount
 * @param {string} frequency - Salary frequency
 * @param {number} hoursPerDay - Hours per day (default: 8)
 * @returns {number} Hourly rate
 */
const calculateHourlyRate = (salary, frequency, hoursPerDay = 8) => {
    if (!salary) return 0;
    
    const dailyRate = calculateDailyRate(salary, frequency);
    return dailyRate / hoursPerDay;
};

/**
 * Calculate tax based on progressive brackets
 * @param {number} income - Taxable income
 * @param {Array} brackets - Tax brackets array
 * @returns {Object} Tax calculation result
 */
const calculateProgressiveTax = (income, brackets) => {
    let totalTax = 0;
    const breakdown = [];

    for (const bracket of brackets) {
        if (income > bracket.min) {
            const taxableAmount = bracket.max 
                ? Math.min(income - bracket.min, bracket.max - bracket.min)
                : income - bracket.min;
            
            const bracketTax = taxableAmount * bracket.rate;
            totalTax += bracketTax;

            breakdown.push({
                range: bracket.max 
                    ? `${bracket.min} - ${bracket.max}`
                    : `${bracket.min}+`,
                rate: bracket.rate * 100,
                taxableAmount,
                tax: bracketTax
            });
        }
    }

    return {
        total: totalTax,
        effectiveRate: income > 0 ? (totalTax / income) * 100 : 0,
        breakdown
    };
};

/**
 * Calculate payroll deductions
 * @param {number} grossPay - Gross pay amount
 * @param {Object} deductionRates - Deduction rates object
 * @returns {Object} Deductions calculation
 */
const calculateDeductions = (grossPay, deductionRates = {}) => {
    const defaults = {
        pension: 0.05,
        healthInsurance: 0.02,
        socialSecurity: 0.08,
        other: 0
    };

    const rates = { ...defaults, ...deductionRates };

    return {
        pension: grossPay * rates.pension,
        healthInsurance: grossPay * rates.healthInsurance,
        socialSecurity: grossPay * rates.socialSecurity,
        other: grossPay * rates.other,
        total: grossPay * (rates.pension + rates.healthInsurance + rates.socialSecurity + rates.other)
    };
};

/**
 * Calculate employer contributions
 * @param {number} grossPay - Gross pay amount
 * @param {Object} contributionRates - Contribution rates object
 * @returns {Object} Employer contributions calculation
 */
const calculateEmployerContributions = (grossPay, contributionRates = {}) => {
    const defaults = {
        pension: 0.1,
        healthInsurance: 0.05,
        socialSecurity: 0.08,
        other: 0
    };

    const rates = { ...defaults, ...contributionRates };

    return {
        pension: grossPay * rates.pension,
        healthInsurance: grossPay * rates.healthInsurance,
        socialSecurity: grossPay * rates.socialSecurity,
        other: grossPay * rates.other,
        total: grossPay * (rates.pension + rates.healthInsurance + rates.socialSecurity + rates.other)
    };
};

/**
 * Calculate leave balance
 * @param {number} accrued - Leave accrued
 * @param {number} taken - Leave taken
 * @param {number} carriedOver - Leave carried over from previous year
 * @returns {Object} Leave balance calculation
 */
const calculateLeaveBalance = (accrued, taken, carriedOver = 0) => {
    const totalAccrued = accrued + carriedOver;
    const remaining = Math.max(0, totalAccrued - taken);
    
    return {
        accrued: totalAccrued,
        taken,
        carriedOver,
        remaining,
        usedPercentage: totalAccrued > 0 ? (taken / totalAccrued) * 100 : 0
    };
};

/**
 * Calculate attendance rate
 * @param {number} presentDays - Days present
 * @param {number} totalDays - Total working days
 * @returns {number} Attendance rate percentage
 */
const calculateAttendanceRate = (presentDays, totalDays) => {
    if (!totalDays) return 0;
    return (presentDays / totalDays) * 100;
};

/**
 * Calculate overtime hours
 * @param {Array} attendance - Attendance records
 * @param {number} standardHours - Standard hours per day (default: 8)
 * @returns {Object} Overtime calculation
 */
const calculateOvertime = (attendance, standardHours = 8) => {
    let totalOvertime = 0;
    let totalHours = 0;
    let overtimeDays = 0;

    attendance.forEach(record => {
        if (record.workingHours > standardHours) {
            const overtime = record.workingHours - standardHours;
            totalOvertime += overtime;
            overtimeDays++;
        }
        totalHours += record.workingHours || 0;
    });

    return {
        totalOvertime,
        overtimeDays,
        averageOvertime: overtimeDays > 0 ? totalOvertime / overtimeDays : 0,
        totalHours
    };
};

/**
 * Calculate performance score
 * @param {Array} criteria - Performance criteria with scores and weights
 * @returns {Object} Performance score calculation
 */
const calculatePerformanceScore = (criteria) => {
    if (!criteria || criteria.length === 0) {
        return { total: 0, weighted: 0, average: 0 };
    }

    let totalWeight = 0;
    let weightedScore = 0;

    criteria.forEach(c => {
        const weight = c.weight || 0;
        const score = c.score || 0;
        
        totalWeight += weight;
        weightedScore += score * (weight / 100);
    });

    const averageScore = criteria.reduce((sum, c) => sum + (c.score || 0), 0) / criteria.length;

    return {
        total: weightedScore,
        weighted: totalWeight > 0 ? weightedScore : 0,
        average: averageScore
    };
};

/**
 * Calculate training ROI
 * @param {number} cost - Training cost
 * @param {number} participants - Number of participants
 * @param {number} productivityGain - Productivity gain percentage
 * @param {number} averageSalary - Average participant salary
 * @returns {Object} ROI calculation
 */
const calculateTrainingROI = (cost, participants, productivityGain, averageSalary) => {
    const totalCost = cost * participants;
    const annualBenefit = averageSalary * participants * (productivityGain / 100);
    const netBenefit = annualBenefit - totalCost;
    const roi = totalCost > 0 ? (netBenefit / totalCost) * 100 : 0;

    return {
        totalCost,
        annualBenefit,
        netBenefit,
        roi,
        paybackPeriod: annualBenefit > 0 ? totalCost / annualBenefit : null
    };
};

/**
 * Calculate turnover rate
 * @param {number} terminations - Number of terminations
 * @param {number} averageHeadcount - Average headcount for period
 * @returns {number} Turnover rate percentage
 */
const calculateTurnoverRate = (terminations, averageHeadcount) => {
    if (!averageHeadcount) return 0;
    return (terminations / averageHeadcount) * 100;
};

/**
 * Calculate absenteeism rate
 * @param {number} absentDays - Days absent
 * @param {number} totalWorkingDays - Total working days
 * @returns {number} Absenteeism rate percentage
 */
const calculateAbsenteeismRate = (absentDays, totalWorkingDays) => {
    if (!totalWorkingDays) return 0;
    return (absentDays / totalWorkingDays) * 100;
};

/**
 * Calculate promotion readiness score
 * @param {Object} employee - Employee data
 * @param {Array} performanceHistory - Performance history
 * @param {Array} skills - Employee skills
 * @returns {Object} Promotion readiness score
 */
const calculatePromotionReadiness = (employee, performanceHistory, skills) => {
    let score = 0;
    let maxScore = 0;

    // Performance score (40% weight)
    if (performanceHistory && performanceHistory.length > 0) {
        const avgPerformance = performanceHistory.reduce((sum, p) => sum + (p.score || 0), 0) / performanceHistory.length;
        score += avgPerformance * 0.4;
        maxScore += 100 * 0.4;
    }

    // Tenure score (20% weight)
    const yearsOfService = calculateYearsOfService(employee.hireDate);
    const tenureScore = Math.min(yearsOfService * 10, 100); // 10 points per year, max 100
    score += tenureScore * 0.2;
    maxScore += 100 * 0.2;

    // Skills score (40% weight)
    if (skills && skills.length > 0) {
        const avgSkillLevel = skills.reduce((sum, s) => {
            const levelMap = { beginner: 25, intermediate: 50, advanced: 75, expert: 100 };
            return sum + (levelMap[s.level] || 0);
        }, 0) / skills.length;
        score += avgSkillLevel * 0.4;
        maxScore += 100 * 0.4;
    }

    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    return {
        score: Math.round(percentage),
        level: percentage >= 80 ? 'ready' : percentage >= 60 ? 'potential' : 'needs-development',
        components: {
            performance: performanceHistory ? performanceHistory[performanceHistory.length - 1]?.score : null,
            tenure: yearsOfService,
            skills: skills?.length || 0
        }
    };
};

module.exports = {
    calculateAge,
    calculateYearsOfService,
    calculateProRatedSalary,
    calculateOvertimePay,
    calculateDailyRate,
    calculateHourlyRate,
    calculateProgressiveTax,
    calculateDeductions,
    calculateEmployerContributions,
    calculateLeaveBalance,
    calculateAttendanceRate,
    calculateOvertime,
    calculatePerformanceScore,
    calculateTrainingROI,
    calculateTurnoverRate,
    calculateAbsenteeismRate,
    calculatePromotionReadiness
};