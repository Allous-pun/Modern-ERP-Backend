// src/utils/sales/stages.js

/**
 * Sales pipeline stages configuration
 */
const STAGES = {
    LEAD: {
        NEW: 'new',
        CONTACTED: 'contacted',
        QUALIFIED: 'qualified',
        UNQUALIFIED: 'unqualified',
        WORKING: 'working',
        NURTURING: 'nurturing',
        CONVERTED: 'converted',
        LOST: 'lost'
    },
    
    OPPORTUNITY: {
        QUALIFICATION: 'qualification',
        NEEDS_ANALYSIS: 'needs-analysis',
        PROPOSAL: 'proposal',
        NEGOTIATION: 'negotiation',
        CLOSED_WON: 'closed-won',
        CLOSED_LOST: 'closed-lost'
    },
    
    QUOTE: {
        DRAFT: 'draft',
        SENT: 'sent',
        VIEWED: 'viewed',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        EXPIRED: 'expired',
        CONVERTED: 'converted'
    },
    
    ORDER: {
        PENDING: 'pending',
        PROCESSING: 'processing',
        SHIPPED: 'shipped',
        DELIVERED: 'delivered',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        REFUNDED: 'refunded',
        ON_HOLD: 'on-hold'
    },
    
    TICKET: {
        OPEN: 'open',
        ASSIGNED: 'assigned',
        IN_PROGRESS: 'in-progress',
        PENDING: 'pending',
        RESOLVED: 'resolved',
        CLOSED: 'closed'
    },
    
    CAMPAIGN: {
        DRAFT: 'draft',
        ACTIVE: 'active',
        PAUSED: 'paused',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    }
};

/**
 * Stage weights for weighted pipeline calculation
 */
const STAGE_WEIGHTS = {
    [STAGES.OPPORTUNITY.QUALIFICATION]: 0.1,
    [STAGES.OPPORTUNITY.NEEDS_ANALYSIS]: 0.3,
    [STAGES.OPPORTUNITY.PROPOSAL]: 0.6,
    [STAGES.OPPORTUNITY.NEGOTIATION]: 0.8,
    [STAGES.OPPORTUNITY.CLOSED_WON]: 1.0,
    [STAGES.OPPORTUNITY.CLOSED_LOST]: 0.0
};

/**
 * Stage colors for UI
 */
const STAGE_COLORS = {
    // Lead stages
    [STAGES.LEAD.NEW]: '#3498db',
    [STAGES.LEAD.CONTACTED]: '#f39c12',
    [STAGES.LEAD.QUALIFIED]: '#27ae60',
    [STAGES.LEAD.UNQUALIFIED]: '#95a5a6',
    [STAGES.LEAD.WORKING]: '#9b59b6',
    [STAGES.LEAD.NURTURING]: '#1abc9c',
    [STAGES.LEAD.CONVERTED]: '#2ecc71',
    [STAGES.LEAD.LOST]: '#e74c3c',
    
    // Opportunity stages
    [STAGES.OPPORTUNITY.QUALIFICATION]: '#3498db',
    [STAGES.OPPORTUNITY.NEEDS_ANALYSIS]: '#f39c12',
    [STAGES.OPPORTUNITY.PROPOSAL]: '#27ae60',
    [STAGES.OPPORTUNITY.NEGOTIATION]: '#9b59b6',
    [STAGES.OPPORTUNITY.CLOSED_WON]: '#2ecc71',
    [STAGES.OPPORTUNITY.CLOSED_LOST]: '#e74c3c',
    
    // Quote stages
    [STAGES.QUOTE.DRAFT]: '#95a5a6',
    [STAGES.QUOTE.SENT]: '#3498db',
    [STAGES.QUOTE.VIEWED]: '#f39c12',
    [STAGES.QUOTE.APPROVED]: '#27ae60',
    [STAGES.QUOTE.REJECTED]: '#e74c3c',
    [STAGES.QUOTE.EXPIRED]: '#7f8c8d',
    [STAGES.QUOTE.CONVERTED]: '#2ecc71',
    
    // Order stages
    [STAGES.ORDER.PENDING]: '#f39c12',
    [STAGES.ORDER.PROCESSING]: '#3498db',
    [STAGES.ORDER.SHIPPED]: '#9b59b6',
    [STAGES.ORDER.DELIVERED]: '#27ae60',
    [STAGES.ORDER.COMPLETED]: '#2ecc71',
    [STAGES.ORDER.CANCELLED]: '#e74c3c',
    [STAGES.ORDER.REFUNDED]: '#95a5a6',
    [STAGES.ORDER.ON_HOLD]: '#7f8c8d',
    
    // Ticket stages
    [STAGES.TICKET.OPEN]: '#e74c3c',
    [STAGES.TICKET.ASSIGNED]: '#f39c12',
    [STAGES.TICKET.IN_PROGRESS]: '#3498db',
    [STAGES.TICKET.PENDING]: '#9b59b6',
    [STAGES.TICKET.RESOLVED]: '#27ae60',
    [STAGES.TICKET.CLOSED]: '#7f8c8d',
    
    // Campaign stages
    [STAGES.CAMPAIGN.DRAFT]: '#95a5a6',
    [STAGES.CAMPAIGN.ACTIVE]: '#27ae60',
    [STAGES.CAMPAIGN.PAUSED]: '#f39c12',
    [STAGES.CAMPAIGN.COMPLETED]: '#3498db',
    [STAGES.CAMPAIGN.CANCELLED]: '#e74c3c'
};

/**
 * Get next stage in pipeline
 * @param {string} currentStage - Current stage
 * @param {string} type - Stage type ('lead', 'opportunity', 'quote', 'order', 'ticket')
 * @returns {string|null} Next stage or null if at end
 */
const getNextStage = (currentStage, type) => {
    const stages = {
        lead: Object.values(STAGES.LEAD),
        opportunity: Object.values(STAGES.OPPORTUNITY),
        quote: Object.values(STAGES.QUOTE),
        order: Object.values(STAGES.ORDER),
        ticket: Object.values(STAGES.TICKET),
        campaign: Object.values(STAGES.CAMPAIGN)
    };
    
    const stageList = stages[type];
    if (!stageList) return null;
    
    const currentIndex = stageList.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex === stageList.length - 1) return null;
    
    return stageList[currentIndex + 1];
};

/**
 * Get previous stage in pipeline
 * @param {string} currentStage - Current stage
 * @param {string} type - Stage type
 * @returns {string|null} Previous stage or null if at start
 */
const getPreviousStage = (currentStage, type) => {
    const stages = {
        lead: Object.values(STAGES.LEAD),
        opportunity: Object.values(STAGES.OPPORTUNITY),
        quote: Object.values(STAGES.QUOTE),
        order: Object.values(STAGES.ORDER),
        ticket: Object.values(STAGES.TICKET),
        campaign: Object.values(STAGES.CAMPAIGN)
    };
    
    const stageList = stages[type];
    if (!stageList) return null;
    
    const currentIndex = stageList.indexOf(currentStage);
    if (currentIndex <= 0) return null;
    
    return stageList[currentIndex - 1];
};

/**
 * Check if stage is terminal
 * @param {string} stage - Stage to check
 * @returns {boolean} True if terminal stage
 */
const isTerminalStage = (stage) => {
    const terminalStages = [
        STAGES.LEAD.CONVERTED,
        STAGES.LEAD.LOST,
        STAGES.OPPORTUNITY.CLOSED_WON,
        STAGES.OPPORTUNITY.CLOSED_LOST,
        STAGES.QUOTE.APPROVED,
        STAGES.QUOTE.REJECTED,
        STAGES.QUOTE.EXPIRED,
        STAGES.ORDER.COMPLETED,
        STAGES.ORDER.CANCELLED,
        STAGES.ORDER.REFUNDED,
        STAGES.TICKET.RESOLVED,
        STAGES.TICKET.CLOSED,
        STAGES.CAMPAIGN.COMPLETED,
        STAGES.CAMPAIGN.CANCELLED
    ];
    
    return terminalStages.includes(stage);
};

/**
 * Get stage weight
 * @param {string} stage - Opportunity stage
 * @returns {number} Stage weight
 */
const getStageWeight = (stage) => {
    return STAGE_WEIGHTS[stage] || 0;
};

/**
 * Get stage color
 * @param {string} stage - Stage
 * @returns {string} Color code
 */
const getStageColor = (stage) => {
    return STAGE_COLORS[stage] || '#95a5a6';
};

/**
 * Get stage progress percentage
 * @param {string} stage - Current stage
 * @param {string} type - Stage type
 * @returns {number} Progress percentage
 */
const getStageProgress = (stage, type) => {
    const stages = {
        lead: Object.values(STAGES.LEAD),
        opportunity: Object.values(STAGES.OPPORTUNITY),
        quote: Object.values(STAGES.QUOTE),
        order: Object.values(STAGES.ORDER),
        ticket: Object.values(STAGES.TICKET),
        campaign: Object.values(STAGES.CAMPAIGN)
    };
    
    const stageList = stages[type];
    if (!stageList) return 0;
    
    const currentIndex = stageList.indexOf(stage);
    if (currentIndex === -1) return 0;
    
    return (currentIndex / (stageList.length - 1)) * 100;
};

/**
 * Get stage description
 * @param {string} stage - Stage
 * @returns {string} Stage description
 */
const getStageDescription = (stage) => {
    const descriptions = {
        // Lead stages
        [STAGES.LEAD.NEW]: 'New lead, not yet contacted',
        [STAGES.LEAD.CONTACTED]: 'Lead has been contacted',
        [STAGES.LEAD.QUALIFIED]: 'Lead has been qualified',
        [STAGES.LEAD.UNQUALIFIED]: 'Lead is not qualified',
        [STAGES.LEAD.WORKING]: 'Currently working with lead',
        [STAGES.LEAD.NURTURING]: 'Lead is being nurtured',
        [STAGES.LEAD.CONVERTED]: 'Lead has been converted',
        [STAGES.LEAD.LOST]: 'Lead has been lost',
        
        // Opportunity stages
        [STAGES.OPPORTUNITY.QUALIFICATION]: 'Initial qualification phase',
        [STAGES.OPPORTUNITY.NEEDS_ANALYSIS]: 'Analyzing customer needs',
        [STAGES.OPPORTUNITY.PROPOSAL]: 'Proposal has been sent',
        [STAGES.OPPORTUNITY.NEGOTIATION]: 'Negotiating terms',
        [STAGES.OPPORTUNITY.CLOSED_WON]: 'Opportunity has been won',
        [STAGES.OPPORTUNITY.CLOSED_LOST]: 'Opportunity has been lost',
        
        // Quote stages
        [STAGES.QUOTE.DRAFT]: 'Quote is in draft',
        [STAGES.QUOTE.SENT]: 'Quote has been sent to customer',
        [STAGES.QUOTE.VIEWED]: 'Customer has viewed the quote',
        [STAGES.QUOTE.APPROVED]: 'Quote has been approved',
        [STAGES.QUOTE.REJECTED]: 'Quote has been rejected',
        [STAGES.QUOTE.EXPIRED]: 'Quote has expired',
        [STAGES.QUOTE.CONVERTED]: 'Quote has been converted to order',
        
        // Order stages
        [STAGES.ORDER.PENDING]: 'Order is pending',
        [STAGES.ORDER.PROCESSING]: 'Order is being processed',
        [STAGES.ORDER.SHIPPED]: 'Order has been shipped',
        [STAGES.ORDER.DELIVERED]: 'Order has been delivered',
        [STAGES.ORDER.COMPLETED]: 'Order is complete',
        [STAGES.ORDER.CANCELLED]: 'Order has been cancelled',
        [STAGES.ORDER.REFUNDED]: 'Order has been refunded',
        [STAGES.ORDER.ON_HOLD]: 'Order is on hold'
    };
    
    return descriptions[stage] || 'Unknown stage';
};

module.exports = {
    STAGES,
    STAGE_WEIGHTS,
    STAGE_COLORS,
    getNextStage,
    getPreviousStage,
    isTerminalStage,
    getStageWeight,
    getStageColor,
    getStageProgress,
    getStageDescription
};