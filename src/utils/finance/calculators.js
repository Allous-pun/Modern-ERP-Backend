// src/utils/finance/calculators.js

/**
 * Calculate depreciation
 * @param {Object} params - Depreciation parameters
 * @param {number} params.cost - Asset cost
 * @param {number} params.salvageValue - Salvage value
 * @param {number} params.usefulLife - Useful life in years
 * @param {string} params.method - Depreciation method
 * @param {Date} params.purchaseDate - Purchase date
 * @returns {Object} Depreciation schedule
 */
const calculateDepreciation = ({
    cost,
    salvageValue = 0,
    usefulLife,
    method = 'straight-line',
    purchaseDate = new Date()
}) => {
    const depreciableAmount = cost - salvageValue;
    const schedule = [];
    const purchaseYear = purchaseDate.getFullYear();
    const purchaseMonth = purchaseDate.getMonth();

    switch(method) {
        case 'straight-line':
            const annualDepr = depreciableAmount / usefulLife;
            for (let year = 0; year < usefulLife; year++) {
                const yearAmount = year === 0 ? annualDepr * (12 - purchaseMonth) / 12 : annualDepr;
                schedule.push({
                    year: purchaseYear + year,
                    amount: Math.round(yearAmount * 100) / 100
                });
            }
            break;

        case 'double-declining':
            const rate = 2 / usefulLife;
            let remainingValue = cost;
            for (let year = 0; year < usefulLife; year++) {
                const yearAmount = remainingValue * rate;
                if (year === usefulLife - 1) {
                    // Last year - ensure we don't go below salvage value
                    remainingValue -= yearAmount;
                    const finalAmount = remainingValue - salvageValue;
                    schedule.push({
                        year: purchaseYear + year,
                        amount: Math.max(0, Math.round(finalAmount * 100) / 100)
                    });
                } else {
                    schedule.push({
                        year: purchaseYear + year,
                        amount: Math.round(yearAmount * 100) / 100
                    });
                    remainingValue -= yearAmount;
                }
            }
            break;

        case 'sum-of-years-digits':
            const sumOfYears = (usefulLife * (usefulLife + 1)) / 2;
            for (let year = 0; year < usefulLife; year++) {
                const yearAmount = depreciableAmount * ((usefulLife - year) / sumOfYears);
                schedule.push({
                    year: purchaseYear + year,
                    amount: Math.round(yearAmount * 100) / 100
                });
            }
            break;

        case 'units-of-production':
            // Return rate per unit instead of schedule
            return {
                ratePerUnit: Math.round((depreciableAmount / usefulLife) * 100) / 100,
                method: 'units-of-production'
            };

        default:
            return null;
    }

    return schedule;
};

/**
 * Calculate loan amortization
 * @param {Object} params - Loan parameters
 * @param {number} params.principal - Loan principal
 * @param {number} params.interestRate - Annual interest rate (%)
 * @param {number} params.term - Loan term in months
 * @param {Date} params.startDate - Loan start date
 * @returns {Object} Amortization schedule
 */
const calculateLoanAmortization = ({
    principal,
    interestRate,
    term,
    startDate = new Date()
}) => {
    const monthlyRate = interestRate / 100 / 12;
    const monthlyPayment = principal * monthlyRate * Math.pow(1 + monthlyRate, term) / 
                          (Math.pow(1 + monthlyRate, term) - 1);

    const schedule = [];
    let balance = principal;
    let date = new Date(startDate);

    for (let period = 1; period <= term; period++) {
        const interestPayment = balance * monthlyRate;
        const principalPayment = monthlyPayment - interestPayment;
        balance -= principalPayment;

        schedule.push({
            period,
            date: new Date(date),
            payment: Math.round(monthlyPayment * 100) / 100,
            principal: Math.round(principalPayment * 100) / 100,
            interest: Math.round(interestPayment * 100) / 100,
            balance: Math.max(0, Math.round(balance * 100) / 100)
        });

        date.setMonth(date.getMonth() + 1);
    }

    return {
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalInterest: Math.round((monthlyPayment * term - principal) * 100) / 100,
        totalPayment: Math.round(monthlyPayment * term * 100) / 100,
        schedule
    };
};

/**
 * Calculate investment returns
 * @param {Object} params - Investment parameters
 * @param {number} params.initialInvestment - Initial investment amount
 * @param {number[]} params.cashFlows - Array of periodic cash flows
 * @param {number} params.discountRate - Discount rate (%)
 * @returns {Object} Investment metrics
 */
const calculateInvestmentReturns = ({
    initialInvestment,
    cashFlows,
    discountRate
}) => {
    // Net Present Value (NPV)
    const npv = cashFlows.reduce((sum, flow, index) => {
        return sum + flow / Math.pow(1 + discountRate / 100, index + 1);
    }, -initialInvestment);

    // Internal Rate of Return (IRR)
    const calculateIRR = (guess = 0.1) => {
        const maxIterations = 1000;
        const tolerance = 0.0001;
        let rate = guess;

        for (let i = 0; i < maxIterations; i++) {
            let npvValue = -initialInvestment;
            let derivative = 0;

            for (let j = 0; j < cashFlows.length; j++) {
                npvValue += cashFlows[j] / Math.pow(1 + rate, j + 1);
                derivative += -(j + 1) * cashFlows[j] / Math.pow(1 + rate, j + 2);
            }

            const newRate = rate - npvValue / derivative;
            
            if (Math.abs(newRate - rate) < tolerance) {
                return newRate;
            }
            
            rate = newRate;
        }

        return null;
    };

    // Payback Period
    let cumulative = -initialInvestment;
    let paybackPeriod = null;
    
    for (let i = 0; i < cashFlows.length; i++) {
        cumulative += cashFlows[i];
        if (cumulative >= 0 && paybackPeriod === null) {
            paybackPeriod = i + 1;
        }
    }

    // Profitability Index
    const presentValue = cashFlows.reduce((sum, flow, index) => {
        return sum + flow / Math.pow(1 + discountRate / 100, index + 1);
    }, 0);
    
    const profitabilityIndex = presentValue / initialInvestment;

    return {
        npv: Math.round(npv * 100) / 100,
        irr: Math.round(calculateIRR() * 10000) / 100,
        paybackPeriod: paybackPeriod || '> ' + cashFlows.length,
        profitabilityIndex: Math.round(profitabilityIndex * 100) / 100
    };
};

/**
 * Calculate tax liability
 * @param {Object} params - Tax parameters
 * @param {number} params.taxableIncome - Taxable income
 * @param {Array} params.taxBrackets - Tax brackets
 * @returns {Object} Tax calculation
 */
const calculateTaxLiability = (taxableIncome, taxBrackets) => {
    let totalTax = 0;
    let remainingIncome = taxableIncome;
    const breakdown = [];

    for (const bracket of taxBrackets.sort((a, b) => a.from - b.from)) {
        if (remainingIncome <= 0) break;

        const bracketAmount = bracket.to 
            ? Math.min(remainingIncome, bracket.to - bracket.from)
            : remainingIncome;

        const taxForBracket = bracketAmount * (bracket.rate / 100);
        
        breakdown.push({
            from: bracket.from,
            to: bracket.to || 'above',
            rate: bracket.rate,
            amount: bracketAmount,
            tax: taxForBracket
        });

        totalTax += taxForBracket;
        remainingIncome -= bracketAmount;
    }

    const effectiveRate = (totalTax / taxableIncome) * 100;

    return {
        taxableIncome,
        totalTax: Math.round(totalTax * 100) / 100,
        effectiveRate: Math.round(effectiveRate * 100) / 100,
        breakdown,
        marginalRate: taxBrackets[breakdown.length - 1]?.rate || 0
    };
};

/**
 * Calculate break-even analysis
 * @param {Object} params - Break-even parameters
 * @param {number} params.fixedCosts - Fixed costs
 * @param {number} params.variableCostPerUnit - Variable cost per unit
 * @param {number} params.sellingPricePerUnit - Selling price per unit
 * @returns {Object} Break-even analysis
 */
const calculateBreakEven = ({
    fixedCosts,
    variableCostPerUnit,
    sellingPricePerUnit
}) => {
    const contributionMargin = sellingPricePerUnit - variableCostPerUnit;
    const breakEvenUnits = fixedCosts / contributionMargin;
    const breakEvenRevenue = breakEvenUnits * sellingPricePerUnit;

    return {
        contributionMargin: Math.round(contributionMargin * 100) / 100,
        contributionMarginRatio: Math.round((contributionMargin / sellingPricePerUnit) * 10000) / 100,
        breakEvenUnits: Math.ceil(breakEvenUnits),
        breakEvenRevenue: Math.round(breakEvenRevenue * 100) / 100,
        marginOfSafety: 0 // Would need actual sales to calculate
    };
};

/**
 * Calculate financial ratios
 * @param {Object} financials - Financial statements
 * @returns {Object} Financial ratios
 */
const calculateFinancialRatios = (financials) => {
    const ratios = {};

    // Profitability Ratios
    if (financials.revenue && financials.netIncome) {
        ratios.netProfitMargin = Math.round((financials.netIncome / financials.revenue) * 10000) / 100;
    }
    
    if (financials.totalAssets && financials.netIncome) {
        ratios.returnOnAssets = Math.round((financials.netIncome / financials.totalAssets) * 10000) / 100;
    }
    
    if (financials.equity && financials.netIncome) {
        ratios.returnOnEquity = Math.round((financials.netIncome / financials.equity) * 10000) / 100;
    }

    // Liquidity Ratios
    if (financials.currentAssets && financials.currentLiabilities) {
        ratios.currentRatio = Math.round((financials.currentAssets / financials.currentLiabilities) * 100) / 100;
    }
    
    if (financials.quickAssets && financials.currentLiabilities) {
        ratios.quickRatio = Math.round((financials.quickAssets / financials.currentLiabilities) * 100) / 100;
    }

    // Leverage Ratios
    if (financials.totalLiabilities && financials.totalAssets) {
        ratios.debtToAssets = Math.round((financials.totalLiabilities / financials.totalAssets) * 10000) / 100;
    }
    
    if (financials.totalLiabilities && financials.equity) {
        ratios.debtToEquity = Math.round((financials.totalLiabilities / financials.equity) * 100) / 100;
    }

    // Efficiency Ratios
    if (financials.costOfGoodsSold && financials.averageInventory) {
        ratios.inventoryTurnover = Math.round((financials.costOfGoodsSold / financials.averageInventory) * 100) / 100;
    }
    
    if (financials.revenue && financials.averageAccountsReceivable) {
        ratios.receivablesTurnover = Math.round((financials.revenue / financials.averageAccountsReceivable) * 100) / 100;
    }

    return ratios;
};

module.exports = {
    calculateDepreciation,
    calculateLoanAmortization,
    calculateInvestmentReturns,
    calculateTaxLiability,
    calculateBreakEven,
    calculateFinancialRatios
};