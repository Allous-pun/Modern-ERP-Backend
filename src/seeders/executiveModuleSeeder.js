// src/seeders/executiveModuleSeeder.js
const mongoose = require('mongoose');
const Module = require('../models/module.model');
require('dotenv').config();

const executiveModules = [
    // ========== EXECUTIVE & STRATEGIC MANAGEMENT ==========
    {
        name: 'Executive & Strategic Management',
        slug: 'executive',
        description: 'Comprehensive executive suite with strategic dashboards, governance oversight, and role-based analytics',
        category: 'executive',
        isCore: true,
        isSystem: false,
        permissionPrefix: 'executive',
        icon: 'executive',
        color: '#8e44ad',
        routeBase: '/executive',
        sidebarGroup: 'main',
        displayOrder: 5,
        features: [
            // Board Level Features
            { 
                name: 'Strategic Dashboards', 
                key: 'board_dashboards', 
                description: 'High-level strategic KPIs and metrics for board members',
                roles: ['board_member', 'chairman', 'ceo']
            },
            { 
                name: 'Board Reports', 
                key: 'board_reports', 
                description: 'Comprehensive reports for board meetings',
                roles: ['board_member', 'chairman', 'ceo', 'strategy_director']
            },
            
            // Chairman Specific
            { 
                name: 'Governance Oversight', 
                key: 'governance_oversight', 
                description: 'Governance reports and compliance oversight',
                roles: ['chairman', 'ceo']
            },
            { 
                name: 'Board Management', 
                key: 'board_management', 
                description: 'Manage board meetings, resolutions, and minutes',
                roles: ['chairman', 'company_secretary']
            },
            
            // CEO Level
            { 
                name: 'Full Analytics', 
                key: 'full_analytics', 
                description: 'Complete business analytics and performance metrics',
                roles: ['ceo', 'strategy_director']
            },
            { 
                name: 'Executive Summary', 
                key: 'executive_summary', 
                description: 'Daily executive summary of key business metrics',
                roles: ['ceo', 'coo', 'cfo', 'cto', 'cio', 'cro', 'chro']
            },
            
            // COO
            { 
                name: 'Operations Dashboard', 
                key: 'operations_dashboard', 
                description: 'Operational KPIs and performance metrics',
                roles: ['coo', 'ceo']
            },
            { 
                name: 'Process Efficiency', 
                key: 'process_efficiency', 
                description: 'Business process efficiency metrics',
                roles: ['coo', 'operations_manager']
            },
            
            // CFO
            { 
                name: 'Financial Oversight', 
                key: 'financial_oversight', 
                description: 'Financial performance dashboards and forecasts',
                roles: ['cfo', 'ceo']
            },
            { 
                name: 'Budget Management', 
                key: 'budget_management', 
                description: 'Corporate budget planning and tracking',
                roles: ['cfo', 'finance_director']
            },
            
            // CTO
            { 
                name: 'Technology Oversight', 
                key: 'technology_oversight', 
                description: 'Technology strategy and performance',
                roles: ['cto', 'ceo']
            },
            { 
                name: 'Innovation Pipeline', 
                key: 'innovation_pipeline', 
                description: 'R&D and innovation tracking',
                roles: ['cto', 'innovation_manager']
            },
            
            // CIO
            { 
                name: 'IT Governance', 
                key: 'it_governance', 
                description: 'IT compliance and governance metrics',
                roles: ['cio', 'cto']
            },
            { 
                name: 'Digital Transformation', 
                key: 'digital_transformation', 
                description: 'Digital transformation progress tracking',
                roles: ['cio', 'cto', 'ceo']
            },
            
            // CRO
            { 
                name: 'Risk Management', 
                key: 'risk_management', 
                description: 'Enterprise risk management dashboard',
                roles: ['cro', 'ceo', 'cfo']
            },
            { 
                name: 'Compliance Dashboard', 
                key: 'compliance_dashboard', 
                description: 'Regulatory compliance status',
                roles: ['cro', 'general_counsel']
            },
            
            // CHRO
            { 
                name: 'HR Oversight', 
                key: 'hr_oversight', 
                description: 'HR metrics and workforce analytics',
                roles: ['chro', 'ceo']
            },
            { 
                name: 'Talent Management', 
                key: 'talent_management', 
                description: 'Talent acquisition and retention metrics',
                roles: ['chro', 'hr_director']
            },
            
            // Strategy Director
            { 
                name: 'Strategic Planning', 
                key: 'strategic_planning', 
                description: 'Strategic planning tools and frameworks',
                roles: ['strategy_director', 'ceo']
            },
            { 
                name: 'Market Intelligence', 
                key: 'market_intelligence', 
                description: 'Market analysis and competitive intelligence',
                roles: ['strategy_director', 'ceo']
            },
            { 
                name: 'Scenario Planning', 
                key: 'scenario_planning', 
                description: 'Business scenario modeling and analysis',
                roles: ['strategy_director', 'ceo', 'cfo']
            },
            
            // Cross-functional
            { 
                name: 'KPI Management', 
                key: 'kpi_management', 
                description: 'Corporate KPI definition and tracking',
                roles: ['ceo', 'strategy_director', 'cfo']
            },
            { 
                name: 'OKR Tracking', 
                key: 'okr_tracking', 
                description: 'Objectives and Key Results tracking',
                roles: ['ceo', 'strategy_director', 'all_executives']
            },
            { 
                name: 'Strategic Initiatives', 
                key: 'strategic_initiatives', 
                description: 'Track major strategic projects',
                roles: ['ceo', 'strategy_director', 'coo']
            },
            { 
                name: 'Investor Relations', 
                key: 'investor_relations', 
                description: 'Investor communications and reports',
                roles: ['ceo', 'cfo', 'chairman']
            },
            { 
                name: 'ESG Reporting', 
                key: 'esg_reporting', 
                description: 'Environmental, Social, Governance reporting',
                roles: ['ceo', 'chairman', 'cro']
            },
            { 
                name: 'Executive Calendar', 
                key: 'executive_calendar', 
                description: 'Executive team coordination',
                roles: ['all_executives']
            },
            { 
                name: 'Decision Support', 
                key: 'decision_support', 
                description: 'Data-driven decision support tools',
                roles: ['all_executives']
            },
            { 
                name: 'Competitive Analysis', 
                key: 'competitive_analysis', 
                description: 'Competitor tracking and analysis',
                roles: ['ceo', 'strategy_director', 'cmo']
            }
        ]
    },
    
    // Optional: Additional executive modules if needed
    {
        name: 'Board Management',
        slug: 'board',
        description: 'Board meeting management, resolutions, and governance',
        category: 'executive',
        isCore: false,
        permissionPrefix: 'board',
        icon: 'board',
        color: '#9b59b6',
        routeBase: '/board',
        sidebarGroup: 'main',
        displayOrder: 6,
        dependencies: ['executive'],
        features: [
            { name: 'Meeting Management', key: 'meetings', description: 'Schedule and manage board meetings' },
            { name: 'Resolutions', key: 'resolutions', description: 'Board resolutions and voting' },
            { name: 'Minutes', key: 'minutes', description: 'Meeting minutes and approvals' },
            { name: 'Board Documents', key: 'documents', description: 'Board document repository' }
        ]
    },
    {
        name: 'Strategy Management',
        slug: 'strategy',
        description: 'Strategic planning, OKRs, and initiative tracking',
        category: 'executive',
        isCore: false,
        permissionPrefix: 'strategy',
        icon: 'strategy',
        color: '#8e44ad',
        routeBase: '/strategy',
        sidebarGroup: 'main',
        displayOrder: 7,
        dependencies: ['executive'],
        features: [
            { name: 'Strategic Planning', key: 'planning', description: 'Strategic planning tools' },
            { name: 'OKR Management', key: 'okrs', description: 'Objectives and Key Results' },
            { name: 'Initiative Tracking', key: 'initiatives', description: 'Track strategic initiatives' },
            { name: 'Market Analysis', key: 'market', description: 'Market and competitive analysis' }
        ]
    }
];

const seedExecutiveModules = async () => {
    try {
        console.log('🌱 Seeding Executive & Strategic Management modules...');
        
        // Remove existing executive modules
        await Module.deleteMany({ 
            $or: [
                { category: 'executive' },
                { slug: { $in: ['executive', 'board', 'strategy'] } }
            ]
        });
        console.log('   Cleared existing executive modules');
        
        // Insert executive modules
        const insertedModules = await Module.insertMany(executiveModules);
        
        console.log(`✅ ${insertedModules.length} executive modules seeded successfully`);
        
        // Show inserted modules
        insertedModules.forEach(module => {
            console.log(`   - ${module.name} (${module.features.length} features)`);
        });
        
        return insertedModules;
    } catch (error) {
        console.error('Error seeding executive modules:', error);
        throw error;
    }
};

// Run seeder if called directly
if (require.main === module) {
    require('dotenv').config();
    
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('📦 Connected to MongoDB');
            return seedExecutiveModules();
        })
        .then(() => {
            console.log('✨ Executive module seeding complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seeding error:', error);
            process.exit(1);
        });
}

module.exports = seedExecutiveModules;