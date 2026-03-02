// src/utils/sales/calculators.js

/**
 * Calculate discount amount
 * @param {number} price - Original price
 * @param {number} discount - Discount percentage or amount
 * @param {string} type - Discount type ('percentage' or 'fixed')
 * @returns {number} Discount amount
 */
const calculateDiscount = (price, discount, type = 'percentage') => {
    if (type === 'percentage') {
        return price * (discount / 100);
    }
    return discount;
};

/**
 * Calculate tax amount
 * @param {number} amount - Amount to calculate tax on
 * @param {number} taxRate - Tax rate percentage
 * @returns {number} Tax amount
 */
const calculateTax = (amount, taxRate) => {
    return amount * (taxRate / 100);
};

/**
 * Calculate total with tax and discount
 * @param {number} subtotal - Subtotal amount
 * @param {number} discount - Discount amount
 * @param {number} tax - Tax amount
 * @param {number} shipping - Shipping cost
 * @returns {number} Total amount
 */
const calculateTotal = (subtotal, discount = 0, tax = 0, shipping = 0) => {
    return subtotal - discount + tax + shipping;
};

/**
 * Calculate profit margin
 * @param {number} revenue - Revenue amount
 * @param {number} cost - Cost amount
 * @returns {number} Profit margin percentage
 */
const calculateProfitMargin = (revenue, cost) => {
    if (revenue === 0) return 0;
    return ((revenue - cost) / revenue) * 100;
};

/**
 * Calculate commission
 * @param {number} amount - Sale amount
 * @param {number} rate - Commission rate
 * @param {string} type - Commission type ('percentage' or 'fixed')
 * @returns {number} Commission amount
 */
const calculateCommission = (amount, rate, type = 'percentage') => {
    if (type === 'percentage') {
        return amount * (rate / 100);
    }
    return rate;
};

/**
 * Calculate weighted pipeline value
 * @param {number} amount - Opportunity amount
 * @param {number} probability - Probability percentage
 * @returns {number} Weighted amount
 */
const calculateWeightedValue = (amount, probability) => {
    return amount * (probability / 100);
};

/**
 * Calculate conversion rate
 * @param {number} converted - Number converted
 * @param {number} total - Total number
 * @returns {number} Conversion rate percentage
 */
const calculateConversionRate = (converted, total) => {
    if (total === 0) return 0;
    return (converted / total) * 100;
};

/**
 * Calculate growth rate
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Growth rate percentage
 */
const calculateGrowthRate = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
};

/**
 * Calculate average deal size
 * @param {Array} deals - Array of deal amounts
 * @returns {number} Average deal size
 */
const calculateAverageDealSize = (deals) => {
    if (!deals || deals.length === 0) return 0;
    const sum = deals.reduce((acc, deal) => acc + deal, 0);
    return sum / deals.length;
};

/**
 * Calculate win rate
 * @param {number} won - Number of won deals
 * @param {number} lost - Number of lost deals
 * @returns {number} Win rate percentage
 */
const calculateWinRate = (won, lost) => {
    const total = won + lost;
    if (total === 0) return 0;
    return (won / total) * 100;
};

/**
 * Calculate sales velocity
 * @param {number} opportunities - Number of opportunities
 * @param {number} averageDealSize - Average deal size
 * @param {number} winRate - Win rate percentage
 * @param {number} salesCycleDays - Average sales cycle in days
 * @returns {number} Sales velocity
 */
const calculateSalesVelocity = (opportunities, averageDealSize, winRate, salesCycleDays) => {
    return (opportunities * averageDealSize * (winRate / 100)) / salesCycleDays;
};

/**
 * Calculate pipeline coverage
 * @param {number} pipelineValue - Total pipeline value
 * @param {number} targetRevenue - Target revenue
 * @returns {number} Pipeline coverage ratio
 */
const calculatePipelineCoverage = (pipelineValue, targetRevenue) => {
    if (targetRevenue === 0) return 0;
    return pipelineValue / targetRevenue;
};

/**
 * Calculate customer lifetime value (CLV)
 * @param {number} averagePurchaseValue - Average purchase value
 * @param {number} purchaseFrequency - Purchase frequency per year
 * @param {number} customerLifespan - Customer lifespan in years
 * @returns {number} Customer lifetime value
 */
const calculateCLV = (averagePurchaseValue, purchaseFrequency, customerLifespan) => {
    return averagePurchaseValue * purchaseFrequency * customerLifespan;
};

/**
 * Calculate customer acquisition cost (CAC)
 * @param {number} marketingCost - Marketing cost
 * @param {number} salesCost - Sales cost
 * @param {number} newCustomers - Number of new customers
 * @returns {number} Customer acquisition cost
 */
const calculateCAC = (marketingCost, salesCost, newCustomers) => {
    if (newCustomers === 0) return 0;
    return (marketingCost + salesCost) / newCustomers;
};

/**
 * Calculate return on investment (ROI)
 * @param {number} gain - Gain from investment
 * @param {number} cost - Cost of investment
 * @returns {number} ROI percentage
 */
const calculateROI = (gain, cost) => {
    if (cost === 0) return 0;
    return ((gain - cost) / cost) * 100;
};

/**
 * Calculate payback period
 * @param {number} investment - Initial investment
 * @param {number} monthlyReturn - Monthly return
 * @returns {number} Payback period in months
 */
const calculatePaybackPeriod = (investment, monthlyReturn) => {
    if (monthlyReturn === 0) return Infinity;
    return investment / monthlyReturn;
};

/**
 * Calculate forecast accuracy
 * @param {number} forecast - Forecasted value
 * @param {number} actual - Actual value
 * @returns {number} Accuracy percentage
 */
const calculateForecastAccuracy = (forecast, actual) => {
    if (actual === 0) return forecast === 0 ? 100 : 0;
    const error = Math.abs(actual - forecast);
    return Math.max(0, 100 - (error / actual) * 100);
};

/**
 * Calculate moving average
 * @param {Array} values - Array of values
 * @param {number} period - Moving average period
 * @returns {Array} Moving average values
 */
const calculateMovingAverage = (values, period) => {
    if (values.length < period) return [];
    
    const averages = [];
    for (let i = period - 1; i < values.length; i++) {
        const sum = values.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
        averages.push(sum / period);
    }
    return averages;
};

/**
 * Calculate seasonal adjustment
 * @param {number} value - Current value
 * @param {number} seasonalFactor - Seasonal factor (0-2)
 * @returns {number} Seasonally adjusted value
 */
const calculateSeasonalAdjustment = (value, seasonalFactor) => {
    return value * seasonalFactor;
};

/**
 * Calculate quota attainment
 * @param {number} actual - Actual sales
 * @param {number} quota - Sales quota
 * @returns {number} Quota attainment percentage
 */
const calculateQuotaAttainment = (actual, quota) => {
    if (quota === 0) return 0;
    return (actual / quota) * 100;
};

/**
 * Calculate deal velocity
 * @param {Date} createdDate - Deal creation date
 * @param {Date} closedDate - Deal close date
 * @returns {number} Deal velocity in days
 */
const calculateDealVelocity = (createdDate, closedDate) => {
    const created = new Date(createdDate);
    const closed = new Date(closedDate);
    const diffTime = Math.abs(closed - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calculate lead response time
 * @param {Date} leadCreated - Lead creation date
 * @param {Date} firstContact - First contact date
 * @returns {number} Response time in hours
 */
const calculateLeadResponseTime = (leadCreated, firstContact) => {
    const created = new Date(leadCreated);
    const contacted = new Date(firstContact);
    const diffTime = Math.abs(contacted - created);
    return Math.ceil(diffTime / (1000 * 60 * 60));
};

module.exports = {
    calculateDiscount,
    calculateTax,
    calculateTotal,
    calculateProfitMargin,
    calculateCommission,
    calculateWeightedValue,
    calculateConversionRate,
    calculateGrowthRate,
    calculateAverageDealSize,
    calculateWinRate,
    calculateSalesVelocity,
    calculatePipelineCoverage,
    calculateCLV,
    calculateCAC,
    calculateROI,
    calculatePaybackPeriod,
    calculateForecastAccuracy,
    calculateMovingAverage,
    calculateSeasonalAdjustment,
    calculateQuotaAttainment,
    calculateDealVelocity,
    calculateLeadResponseTime
};