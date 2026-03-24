// src/models/executive/financialDashboard.model.js
const mongoose = require('mongoose');

// Define all subdocument schemas first
const AlertSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    metric: String,
    value: Number,
    threshold: Number,
    timestamp: {
        type: Date,
        default: Date.now
    },
    acknowledged: {
        by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OrganizationMember'
        },
        at: Date
    },
    resolved: {
        type: Boolean,
        default: false
    }
}, { _id: true });

const RiskSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['liquidity', 'credit', 'market', 'operational', 'compliance'],
        required: true
    },
    level: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true
    },
    metric: String,
    value: Number,
    threshold: Number,
    trend: String,
    mitigation: String
}, { _id: true });

// Investment subdocument schema
const InvestmentSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    value: {
        type: Number,
        required: true
    },
    return: {
        type: Number,
        required: true
    },
    maturityDate: {
        type: Date,
        required: true
    },
    risk: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true
    }
}, { _id: true });

// Debt subdocument schema
const DebtSchema = new mongoose.Schema({
    lender: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    interestRate: {
        type: Number,
        required: true
    },
    term: {
        type: Number,
        required: true
    },
    nextPayment: {
        type: Date,
        required: true
    }
}, { _id: true });

// Cash by currency subdocument
const CashCurrencySchema = new mongoose.Schema({
    currency: String,
    amount: Number
}, { _id: true });

// Cash by account subdocument
const CashAccountSchema = new mongoose.Schema({
    bank: String,
    account: String,
    balance: Number,
    lastReconciled: Date
}, { _id: true });

// Forecast inflow/outflow subdocuments
const ForecastInflowSchema = new mongoose.Schema({
    source: String,
    amount: Number,
    date: Date,
    probability: Number
}, { _id: true });

const ForecastOutflowSchema = new mongoose.Schema({
    purpose: String,
    amount: Number,
    date: Date,
    required: Boolean
}, { _id: true });

const NetPositionSchema = new mongoose.Schema({
    date: Date,
    amount: Number
}, { _id: true });

// Budget Department Schema - updated to include variancePercentage and status
const BudgetDepartmentSchema = new mongoose.Schema({
    department: String,
    budget: Number,
    actual: Number,
    variance: Number,
    variancePercentage: Number,
    status: {
        type: String,
        enum: ['good', 'warning', 'critical'],
        default: 'good'
    }
}, { _id: true });

// Budget Category Schema
const BudgetCategorySchema = new mongoose.Schema({
    category: String,
    budget: Number,
    actual: Number,
    variance: Number,
    variancePercentage: Number
}, { _id: true });

// Budget Monthly Breakdown Schema
const BudgetMonthlySchema = new mongoose.Schema({
    month: Number,
    budget: Number,
    actual: Number,
    revenue: Number,
    expenses: Number,
    profit: Number,
    variance: Number,
    variancePercentage: Number
}, { _id: true });

// Budget Quarterly Breakdown Schema
const BudgetQuarterlySchema = new mongoose.Schema({
    quarter: Number,
    budget: Number,
    actual: Number,
    revenue: Number,
    expenses: Number,
    profit: Number,
    variance: Number,
    variancePercentage: Number
}, { _id: true });

// Budget Project Schema
const BudgetProjectSchema = new mongoose.Schema({
    project: String,
    budget: Number,
    actual: Number,
    variance: Number,
    variancePercentage: Number
}, { _id: true });

const financialDashboardSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Dashboard configuration
    name: {
        type: String,
        required: true
    },
    period: {
        start: Date,
        end: Date,
        periodType: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
            default: 'monthly'
        },
        fiscalYear: Number,
        quarter: Number
    },
    
    // Financial Health Summary
    financialHealth: {
        revenue: {
            current: Number,
            previous: Number,
            change: Number,
            trend: {
                type: String,
                enum: ['up', 'down', 'stable']
            },
            yearToDate: Number,
            forecast: Number
        },
        profit: {
            gross: {
                value: Number,
                margin: Number,
                trend: String
            },
            operating: {
                value: Number,
                margin: Number,
                trend: String
            },
            net: {
                value: Number,
                margin: Number,
                trend: String
            },
            ebitda: {
                value: Number,
                margin: Number,
                trend: String
            }
        },
        cashFlow: {
            operating: Number,
            investing: Number,
            financing: Number,
            net: Number,
            free: Number,
            burnRate: Number,
            runway: Number
        },
        balanceSheet: {
            assets: {
                total: Number,
                current: Number,
                fixed: Number,
                intangible: Number
            },
            liabilities: {
                total: Number,
                current: Number,
                longTerm: Number
            },
            equity: {
                total: Number,
                retained: Number,
                paid: Number
            },
            workingCapital: Number,
            debtToEquity: Number
        }
    },
    
    // Revenue Analysis
    revenue: {
        total: Number,
        breakdown: {
            byStream: [{
                name: String,
                value: Number,
                percentage: Number,
                growth: Number,
                trend: String
            }],
            byRegion: [{
                region: String,
                value: Number,
                percentage: Number,
                growth: Number
            }],
            byProduct: [{
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product'
                },
                name: String,
                value: Number,
                units: Number,
                growth: Number
            }],
            byCustomer: [{
                customerId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Customer'
                },
                name: String,
                value: Number,
                percentage: Number
            }]
        },
        recurring: {
            value: Number,
            percentage: Number,
            growth: Number,
            churn: Number
        },
        trends: {
            daily: [{
                date: Date,
                value: Number
            }],
            monthly: [{
                month: String,
                value: Number
            }],
            quarterly: [{
                quarter: String,
                value: Number
            }],
            yearOverYear: Number,
            quarterOverQuarter: Number,
            monthOverMonth: Number
        },
        forecast: {
            nextMonth: Number,
            nextQuarter: Number,
            nextYear: Number,
            confidence: Number,
            drivers: [{
                factor: String,
                impact: Number
            }]
        }
    },
    
    // Expense Analysis
    expenses: {
        total: Number,
        breakdown: {
            byCategory: [{
                category: String,
                value: Number,
                percentage: Number,
                budget: Number,
                variance: Number,
                trend: String
            }],
            byDepartment: [{
                department: String,
                value: Number,
                budget: Number,
                variance: Number,
                headcount: Number,
                costPerHead: Number
            }],
            byProject: [{
                projectId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Project'
                },
                name: String,
                value: Number,
                budget: Number,
                variance: Number
            }]
        },
        fixed: {
            value: Number,
            percentage: Number,
            items: [{
                name: String,
                value: Number
            }]
        },
        variable: {
            value: Number,
            percentage: Number,
            drivers: [{
                name: String,
                value: Number,
                correlation: Number
            }]
        },
        trends: {
            daily: [{
                date: Date,
                value: Number
            }],
            monthly: [{
                month: String,
                value: Number
            }]
        }
    },
    
    // Profitability Metrics
    profitability: {
        grossMargin: {
            value: Number,
            target: Number,
            variance: Number,
            trend: String
        },
        operatingMargin: {
            value: Number,
            target: Number,
            variance: Number,
            trend: String
        },
        netMargin: {
            value: Number,
            target: Number,
            variance: Number,
            trend: String
        },
        ebitda: {
            value: Number,
            margin: Number,
            target: Number,
            variance: Number
        },
        contribution: {
            byProduct: [{
                product: String,
                revenue: Number,
                cost: Number,
                margin: Number,
                contribution: Number
            }],
            byChannel: [{
                channel: String,
                revenue: Number,
                cost: Number,
                margin: Number
            }]
        },
        breakEven: {
            revenue: Number,
            units: Number,
            months: Number,
            marginOfSafety: Number
        }
    },
    
    // Cash Flow Analysis
    cashFlow: {
        operating: {
            inflow: Number,
            outflow: Number,
            net: Number,
            items: [{
                description: String,
                value: Number,
                category: String
            }]
        },
        investing: {
            inflow: Number,
            outflow: Number,
            net: Number,
            capex: Number,
            investments: [{
                description: String,
                value: Number,
                type: String
            }]
        },
        financing: {
            inflow: Number,
            outflow: Number,
            net: Number,
            debt: Number,
            equity: Number,
            dividends: Number
        },
        workingCapital: {
            current: Number,
            previous: Number,
            change: Number,
            components: {
                accountsReceivable: {
                    value: Number,
                    days: Number,
                    turnover: Number
                },
                inventory: {
                    value: Number,
                    days: Number,
                    turnover: Number
                },
                accountsPayable: {
                    value: Number,
                    days: Number,
                    turnover: Number
                }
            },
            cashConversionCycle: Number
        },
        forecast: {
            nextMonth: Number,
            nextQuarter: Number,
            nextYear: Number,
            minimum: Number,
            maximum: Number
        }
    },
    
    // Budget Management - UPDATED with enhanced structure
    budget: {
        current: {
            revenue: Number,
            expenses: Number,
            profit: Number,
            capex: Number
        },
        actual: {
            revenue: Number,
            expenses: Number,
            profit: Number,
            capex: Number
        },
        variance: {
            revenue: {
                value: Number,
                percentage: Number,
                reasons: [String]
            },
            expenses: {
                value: Number,
                percentage: Number,
                reasons: [String]
            },
            profit: {
                value: Number,
                percentage: Number,
                reasons: [String]
            }
        },
        byDepartment: [BudgetDepartmentSchema],
        byCategory: [BudgetCategorySchema],
        byProject: [BudgetProjectSchema],
        monthlyBreakdown: [BudgetMonthlySchema],
        quarterlyBreakdown: [BudgetQuarterlySchema],
        forecast: {
            revenue: Number,
            expenses: Number,
            profit: Number,
            confidence: Number
        }
    },
    
    // Financial Ratios
    ratios: {
        liquidity: {
            current: Number,
            quick: Number,
            cash: Number
        },
        efficiency: {
            assetTurnover: Number,
            inventoryTurnover: Number,
            receivableTurnover: Number,
            payableTurnover: Number,
            cashConversion: Number
        },
        profitability: {
            roa: Number,
            roe: Number,
            roi: Number,
            roic: Number
        },
        leverage: {
            debtToEquity: Number,
            debtToAsset: Number,
            interestCoverage: Number,
            debtToEbitda: Number
        },
        valuation: {
            eps: Number,
            pe: Number,
            peg: Number,
            dividendYield: Number
        }
    },
    
    // Treasury Management
    treasury: {
        cash: {
            onHand: Number,
            inBank: Number,
            total: Number,
            byCurrency: [CashCurrencySchema],
            byAccount: [CashAccountSchema]
        },
        investments: [InvestmentSchema],
        debt: [DebtSchema],
        forecast: {
            inflow: [ForecastInflowSchema],
            outflow: [ForecastOutflowSchema],
            netPosition: [NetPositionSchema]
        }
    },
    
    // Tax Management
    tax: {
        corporate: {
            provision: Number,
            paid: Number,
            payable: Number,
            effectiveRate: Number
        },
        vat: {
            collected: Number,
            paid: Number,
            net: Number,
            returnDate: Date
        },
        payroll: {
            withheld: Number,
            paid: Number,
            nextDue: Date
        },
        deferred: {
            assets: Number,
            liabilities: Number,
            net: Number
        },
        compliance: {
            lastFiling: Date,
            nextFiling: Date,
            status: {
                type: String,
                enum: ['compliant', 'pending', 'overdue']
            }
        }
    },
    
    // Risk Indicators
    risks: [RiskSchema],
    
    // Alerts
    alerts: [AlertSchema],
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
financialDashboardSchema.index({ organization: 1, 'period.start': -1, 'period.end': -1 });
financialDashboardSchema.index({ organization: 1, 'period.fiscalYear': 1, 'period.quarter': 1 });

// Create and export the model
const FinancialDashboard = mongoose.model('FinancialDashboard', financialDashboardSchema);

module.exports = FinancialDashboard;
