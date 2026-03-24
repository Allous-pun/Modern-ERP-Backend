// src/models/executive/executiveBudget.model.js (instead of budget.model.js)
const mongoose = require('mongoose');

const executiveBudgetSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    
    // Budget identification
    name: {
        type: String,
        required: true
    },
    fiscalYear: {
        type: Number,
        required: true
    },
    version: {
        type: Number,
        default: 1
    },
    status: {
        type: String,
        enum: ['draft', 'under_review', 'approved', 'active', 'archived'],
        default: 'draft'
    },
    
    // Budget periods
    periods: [{
        month: Number,
        quarter: Number,
        startDate: Date,
        endDate: Date
    }],
    
    // Revenue budget
    revenue: {
        total: Number,
        byStream: [{
            stream: String,
            amount: Number,
            growth: Number,
            assumptions: [String],
            monthly: [{
                month: Number,
                amount: Number
            }]
        }],
        byProduct: [{
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            name: String,
            units: Number,
            price: Number,
            amount: Number,
            monthly: [{
                month: Number,
                units: Number,
                amount: Number
            }]
        }],
        byRegion: [{
            region: String,
            amount: Number,
            monthly: [{
                month: Number,
                amount: Number
            }]
        }]
    },
    
    // Expense budget
    expenses: {
        total: Number,
        byCategory: [{
            category: String,
            amount: Number,
            fixed: Number,
            variable: Number,
            assumptions: [String],
            monthly: [{
                month: Number,
                amount: Number
            }]
        }],
        byDepartment: [{
            department: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Department'
            },
            name: String,
            amount: Number,
            headcount: Number,
            salaries: Number,
            operations: Number,
            capex: Number,
            monthly: [{
                month: Number,
                amount: Number
            }]
        }],
        byProject: [{
            projectId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Project'
            },
            name: String,
            amount: Number,
            timeline: [{
                month: Number,
                amount: Number
            }]
        }]
    },
    
    // Capital expenditure
    capex: {
        total: Number,
        byAsset: [{
            assetType: String,
            description: String,
            amount: Number,
            depreciation: Number,
            usefulLife: Number,
            purchaseDate: Date,
            monthly: [{
                month: Number,
                amount: Number
            }]
        }]
    },
    
    // Cash flow budget
    cashFlow: {
        operating: {
            inflow: Number,
            outflow: Number,
            net: Number,
            monthly: [{
                month: Number,
                inflow: Number,
                outflow: Number,
                net: Number
            }]
        },
        investing: {
            inflow: Number,
            outflow: Number,
            net: Number,
            monthly: [{
                month: Number,
                inflow: Number,
                outflow: Number,
                net: Number
            }]
        },
        financing: {
            inflow: Number,
            outflow: Number,
            net: Number,
            monthly: [{
                month: Number,
                inflow: Number,
                outflow: Number,
                net: Number
            }]
        },
        ending: {
            monthly: [{
                month: Number,
                amount: Number
            }]
        }
    },
    
    // Profit & Loss summary
    pnl: {
        revenue: Number,
        cogs: Number,
        grossProfit: Number,
        grossMargin: Number,
        operatingExpenses: Number,
        operatingProfit: Number,
        operatingMargin: Number,
        interest: Number,
        tax: Number,
        netProfit: Number,
        netMargin: Number,
        ebitda: Number,
        ebitdaMargin: Number,
        monthly: [{
            month: Number,
            revenue: Number,
            expenses: Number,
            profit: Number,
            margin: Number
        }]
    },
    
    // Balance sheet projections
    balanceSheet: {
        assets: {
            current: Number,
            fixed: Number,
            total: Number
        },
        liabilities: {
            current: Number,
            longTerm: Number,
            total: Number
        },
        equity: Number,
        monthly: [{
            month: Number,
            assets: Number,
            liabilities: Number,
            equity: Number
        }]
    },
    
    // Key assumptions
    assumptions: [{
        factor: String,
        value: mongoose.Schema.Types.Mixed,
        basis: String,
        confidence: Number
    }],
    
    // Scenarios
    scenarios: [{
        name: String,
        description: String,
        adjustments: [{
            factor: String,
            change: Number,
            type: {
                type: String,
                enum: ['percentage', 'absolute']
            }
        }],
        results: {
            revenue: Number,
            profit: Number,
            cashFlow: Number
        }
    }],
    
    // Variance analysis (when actuals are available)
    variance: {
        revenue: {
            amount: Number,
            percentage: Number,
            byStream: [{
                stream: String,
                budget: Number,
                actual: Number,
                variance: Number,
                explanation: String
            }]
        },
        expenses: {
            amount: Number,
            percentage: Number,
            byCategory: [{
                category: String,
                budget: Number,
                actual: Number,
                variance: Number,
                explanation: String
            }]
        },
        profit: {
            amount: Number,
            percentage: Number,
            explanation: String
        }
    },
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember',
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrganizationMember'
    },
    approvedAt: Date,
    notes: String,
    attachments: [{
        name: String,
        url: String,
        type: String
    }]
}, {
    timestamps: true
});

// Indexes
executiveBudgetSchema.index({ organization: 1, fiscalYear: 1, version: 1 });
executiveBudgetSchema.index({ organization: 1, status: 1 });

// Methods
executiveBudgetSchema.methods.calculateVariance = async function(actuals) {
    // Revenue variance
    this.variance.revenue = {
        amount: actuals.revenue - this.revenue.total,
        percentage: ((actuals.revenue - this.revenue.total) / this.revenue.total) * 100,
        byStream: []
    };
    
    // Expense variance
    this.variance.expenses = {
        amount: actuals.expenses - this.expenses.total,
        percentage: ((actuals.expenses - this.expenses.total) / this.expenses.total) * 100,
        byCategory: []
    };
    
    // Profit variance
    this.variance.profit = {
        amount: (actuals.revenue - actuals.expenses) - (this.revenue.total - this.expenses.total),
        percentage: (((actuals.revenue - actuals.expenses) - (this.revenue.total - this.expenses.total)) / 
                    (this.revenue.total - this.expenses.total)) * 100
    };
    
    return this.save();
};

module.exports = mongoose.model('ExecutiveBudget', executiveBudgetSchema);