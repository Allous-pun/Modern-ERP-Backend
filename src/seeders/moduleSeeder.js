// src/seeders/moduleSeeder.js
const mongoose = require('mongoose');
const Module = require('../models/module.model');
require('dotenv').config();

const modules = [
    // ========== 1. SYSTEM, SECURITY & GOVERNANCE (CORE) ==========
    {
        name: 'System Core',
        slug: 'system',
        description: 'Core system functionality - user management, roles, permissions, authentication',
        category: 'core',
        isCore: true,
        isSystem: true,
        permissionPrefix: 'system',
        icon: 'settings',
        color: '#2c3e50',
        routeBase: '/system',
        sidebarGroup: 'admin',
        displayOrder: 1,
        features: [
            { name: 'User Management', key: 'users', description: 'Manage system users' },
            { name: 'Role Management', key: 'roles', description: 'Manage roles and permissions' },
            { name: 'Audit Logs', key: 'audit', description: 'View system audit logs' },
            { name: 'Backup Management', key: 'backups', description: 'Manage system backups' },
            { name: 'System Configuration', key: 'config', description: 'Configure system settings' }
        ]
    },
    {
        name: 'Security & Governance',
        slug: 'security',
        description: 'Security policies, compliance, risk management, and data protection',
        category: 'core',
        isCore: true,
        permissionPrefix: 'security',
        icon: 'security',
        color: '#34495e',
        routeBase: '/security',
        sidebarGroup: 'admin',
        displayOrder: 2,
        features: [
            { name: 'Security Policies', key: 'policies', description: 'Manage security policies' },
            { name: 'Compliance Management', key: 'compliance', description: 'Regulatory compliance' },
            { name: 'Risk Management', key: 'risk', description: 'Risk registers and mitigation' },
            { name: 'Data Privacy', key: 'privacy', description: 'GDPR and data privacy' },
            { name: 'Encryption Management', key: 'encryption', description: 'Manage encryption' }
        ]
    },
    
    // ========== 2. EXECUTIVE & STRATEGIC MANAGEMENT ==========
    {
        name: 'Executive Dashboard',
        slug: 'executive',
        description: 'Strategic dashboards and analytics for executive management',
        category: 'executive',
        isCore: false,
        permissionPrefix: 'executive',
        icon: 'dashboard',
        color: '#8e44ad',
        routeBase: '/executive',
        sidebarGroup: 'main',
        displayOrder: 5,
        features: [
            { name: 'Strategic Dashboards', key: 'dashboards', description: 'High-level KPIs and metrics' },
            { name: 'Governance Oversight', key: 'governance', description: 'Governance reports' },
            { name: 'Full Analytics', key: 'analytics', description: 'Complete business analytics' }
        ]
    },
    
    // ========== 3. FINANCE, ACCOUNTING & TREASURY ==========
    {
        name: 'Finance & Accounting',
        slug: 'finance',
        description: 'Complete financial management - general ledger, accounts, budgeting',
        category: 'financial',  // Changed from 'finance' to 'financial'
        isCore: false,
        permissionPrefix: 'finance',
        icon: 'finance',
        color: '#27ae60',
        routeBase: '/finance',
        sidebarGroup: 'financial',
        displayOrder: 10,
        features: [
            { name: 'General Ledger', key: 'ledger', description: 'Chart of accounts and journal entries' },
            { name: 'Accounts Payable', key: 'ap', description: 'Supplier invoices and payments' },
            { name: 'Accounts Receivable', key: 'ar', description: 'Customer invoices and receipts' },
            { name: 'Budgeting', key: 'budget', description: 'Create and manage budgets' },
            { name: 'Financial Reports', key: 'reports', description: 'Balance sheet, income statement, cash flow' },
            { name: 'Tax Management', key: 'tax', description: 'Tax compliance and reporting' },
            { name: 'Cost Accounting', key: 'cost', description: 'Cost tracking and analysis' },
            { name: 'Treasury Management', key: 'treasury', description: 'Cash and bank management' },
            { name: 'Fixed Assets', key: 'assets', description: 'Asset lifecycle management' }
        ]
    },
    {
        name: 'Payroll',
        slug: 'payroll',
        description: 'Employee payroll processing, tax calculations, and payslips',
        category: 'financial',  // Changed from 'finance' to 'financial'
        isCore: false,
        permissionPrefix: 'payroll',
        icon: 'payroll',
        color: '#2980b9',
        routeBase: '/payroll',
        sidebarGroup: 'financial',
        displayOrder: 20,
        dependencies: ['hr'],  // Depends on HR module
        features: [
            { name: 'Payroll Processing', key: 'processing', description: 'Process employee payroll' },
            { name: 'Payslip Generation', key: 'payslips', description: 'Generate employee payslips' },
            { name: 'Tax Calculations', key: 'tax', description: 'Calculate payroll taxes' },
            { name: 'Year-end Reports', key: 'year-end', description: 'P60, P11D, etc.' }
        ]
    },
    
    // ========== 4. HUMAN RESOURCES (HCM) ==========
    {
        name: 'Human Capital Management',
        slug: 'hr',
        description: 'Complete HR management - employees, attendance, leave, performance',
        category: 'hr',
        isCore: false,
        permissionPrefix: 'hr',
        icon: 'hr',
        color: '#e67e22',
        routeBase: '/hr',
        sidebarGroup: 'hr',
        displayOrder: 30,
        features: [
            { name: 'Employee Records', key: 'employees', description: 'Manage employee information' },
            { name: 'Attendance Tracking', key: 'attendance', description: 'Track employee attendance' },
            { name: 'Leave Management', key: 'leave', description: 'Manage leave requests and approvals' },
            { name: 'Performance Management', key: 'performance', description: 'Employee performance reviews' },
            { name: 'Compensation & Benefits', key: 'compensation', description: 'Salary and benefits management' },
            { name: 'Training Management', key: 'training', description: 'Employee training and development' }
        ]
    },
    {
        name: 'Recruitment',
        slug: 'recruitment',
        description: 'Job postings, applicant tracking, and hiring workflow',
        category: 'hr',
        isCore: false,
        permissionPrefix: 'recruitment',
        icon: 'recruitment',
        color: '#f39c12',
        routeBase: '/recruitment',
        sidebarGroup: 'hr',
        displayOrder: 40,
        dependencies: ['hr'],
        features: [
            { name: 'Job Postings', key: 'jobs', description: 'Create and manage job postings' },
            { name: 'Applicant Tracking', key: 'applicants', description: 'Track job applicants' },
            { name: 'Interview Scheduling', key: 'interviews', description: 'Schedule and manage interviews' },
            { name: 'Offer Management', key: 'offers', description: 'Create and manage job offers' }
        ]
    },
    
    // ========== 5. SALES, MARKETING & CRM ==========
    {
        name: 'Sales Management',
        slug: 'sales',
        description: 'Sales pipeline, leads, opportunities, quotes, and orders',
        category: 'sales',
        isCore: false,
        permissionPrefix: 'sales',
        icon: 'sales',
        color: '#3498db',
        routeBase: '/sales',
        sidebarGroup: 'operations',
        displayOrder: 50,
        features: [
            { name: 'Lead Management', key: 'leads', description: 'Track and manage sales leads' },
            { name: 'Opportunity Management', key: 'opportunities', description: 'Manage sales opportunities' },
            { name: 'Quotes', key: 'quotes', description: 'Create and manage quotes' },
            { name: 'Orders', key: 'orders', description: 'Process sales orders' },
            { name: 'Sales Reports', key: 'reports', description: 'Sales analytics and reports' },
            { name: 'Commission Tracking', key: 'commission', description: 'Sales commission calculation' },
            { name: 'Targets', key: 'targets', description: 'Sales target management' }
        ]
    },
    {
        name: 'CRM',
        slug: 'crm',
        description: 'Customer relationship management',
        category: 'sales',
        isCore: false,
        permissionPrefix: 'crm',
        icon: 'crm',
        color: '#9b59b6',
        routeBase: '/crm',
        sidebarGroup: 'operations',
        displayOrder: 60,
        dependencies: ['sales'],
        features: [
            { name: 'Contact Management', key: 'contacts', description: 'Manage customer contacts' },
            { name: 'Interaction Tracking', key: 'interactions', description: 'Track customer interactions' },
            { name: 'Customer Segmentation', key: 'segments', description: 'Segment customers' }
        ]
    },
    {
        name: 'Marketing',
        slug: 'marketing',
        description: 'Campaign management, digital marketing, and marketing analytics',
        category: 'sales',
        isCore: false,
        permissionPrefix: 'marketing',
        icon: 'marketing',
        color: '#e74c3c',
        routeBase: '/marketing',
        sidebarGroup: 'operations',
        displayOrder: 65,
        dependencies: ['crm'],
        features: [
            { name: 'Campaign Management', key: 'campaigns', description: 'Create and manage campaigns' },
            { name: 'Digital Marketing', key: 'digital', description: 'Online marketing tools' },
            { name: 'Marketing Analytics', key: 'analytics', description: 'Campaign performance' }
        ]
    },
    {
        name: 'Customer Support',
        slug: 'support',
        description: 'Customer support tickets and service management',
        category: 'sales',
        isCore: false,
        permissionPrefix: 'support',
        icon: 'support',
        color: '#1abc9c',
        routeBase: '/support',
        sidebarGroup: 'operations',
        displayOrder: 70,
        dependencies: ['crm'],
        features: [
            { name: 'Ticket Management', key: 'tickets', description: 'Manage support tickets' },
            { name: 'Knowledge Base', key: 'knowledge', description: 'Customer self-service' },
            { name: 'SLA Management', key: 'sla', description: 'Service level agreements' }
        ]
    },
    
    // ========== 6. PROCUREMENT, INVENTORY & SUPPLY CHAIN ==========
    {
        name: 'Procurement',
        slug: 'procurement',
        description: 'Purchase orders, vendor management, and sourcing',
        category: 'procurement',
        isCore: false,
        permissionPrefix: 'procurement',
        icon: 'procurement',
        color: '#16a085',
        routeBase: '/procurement',
        sidebarGroup: 'operations',
        displayOrder: 80,
        features: [
            { name: 'Vendor Management', key: 'vendors', description: 'Manage suppliers and vendors' },
            { name: 'Purchase Orders', key: 'po', description: 'Create and manage purchase orders' },
            { name: 'RFQ Management', key: 'rfq', description: 'Request for quotes' },
            { name: 'Sourcing', key: 'sourcing', description: 'Source new suppliers' },
            { name: 'Vendor Evaluation', key: 'evaluation', description: 'Vendor performance tracking' }
        ]
    },
    {
        name: 'Inventory Management',
        slug: 'inventory',
        description: 'Stock control, warehouses, and inventory tracking',
        category: 'procurement',
        isCore: false,
        permissionPrefix: 'inventory',
        icon: 'inventory',
        color: '#27ae60',
        routeBase: '/inventory',
        sidebarGroup: 'operations',
        displayOrder: 90,
        dependencies: ['procurement'],
        features: [
            { name: 'Stock Control', key: 'stock', description: 'Manage inventory levels' },
            { name: 'Warehouse Management', key: 'warehouses', description: 'Manage multiple warehouses' },
            { name: 'Stock Transfers', key: 'transfers', description: 'Transfer stock between locations' },
            { name: 'Stock Counts', key: 'counts', description: 'Physical inventory counts' },
            { name: 'Reordering', key: 'reorder', description: 'Automated reordering' }
        ]
    },
    {
        name: 'Supply Chain',
        slug: 'supply-chain',
        description: 'Supply chain planning, logistics, and distribution',
        category: 'procurement',
        isCore: false,
        permissionPrefix: 'supplychain',
        icon: 'supply-chain',
        color: '#d35400',
        routeBase: '/supply-chain',
        sidebarGroup: 'operations',
        displayOrder: 100,
        dependencies: ['inventory'],
        features: [
            { name: 'Supply Planning', key: 'planning', description: 'Supply chain planning' },
            { name: 'Demand Forecasting', key: 'forecasting', description: 'Demand planning' },
            { name: 'Logistics', key: 'logistics', description: 'Transport and logistics' },
            { name: 'Distribution', key: 'distribution', description: 'Distribution management' },
            { name: 'Quality Control', key: 'quality', description: 'Quality inspections' }
        ]
    },
    
    // ========== 7. MANUFACTURING & PRODUCTION ==========
    {
        name: 'Manufacturing',
        slug: 'manufacturing',
        description: 'Production planning, shop floor control, and quality management',
        category: 'manufacturing',
        isCore: false,
        permissionPrefix: 'manufacturing',
        icon: 'manufacturing',
        color: '#c0392b',
        routeBase: '/manufacturing',
        sidebarGroup: 'operations',
        displayOrder: 110,
        dependencies: ['inventory'],
        features: [
            { name: 'Production Planning', key: 'planning', description: 'Plan production schedules' },
            { name: 'Bill of Materials', key: 'bom', description: 'Create and manage BOMs' },
            { name: 'Work Orders', key: 'work-orders', description: 'Manage production work orders' },
            { name: 'Shop Floor Control', key: 'shop-floor', description: 'Monitor production' },
            { name: 'Quality Assurance', key: 'quality', description: 'Quality inspections' },
            { name: 'Maintenance', key: 'maintenance', description: 'Equipment maintenance' }
        ]
    },
    
    // ========== 8. PROJECT & OPERATIONS MANAGEMENT ==========
    {
        name: 'Project Management',
        slug: 'projects',
        description: 'Project planning, task management, and collaboration',
        category: 'projects',
        isCore: false,
        permissionPrefix: 'projects',
        icon: 'projects',
        color: '#8e44ad',
        routeBase: '/projects',
        sidebarGroup: 'operations',
        displayOrder: 120,
        features: [
            { name: 'Project Planning', key: 'planning', description: 'Plan and schedule projects' },
            { name: 'Task Management', key: 'tasks', description: 'Manage project tasks' },
            { name: 'Time Tracking', key: 'time', description: 'Track time on projects' },
            { name: 'Resource Management', key: 'resources', description: 'Manage project resources' },
            { name: 'Project Reports', key: 'reports', description: 'Project progress reports' },
            { name: 'Budget Tracking', key: 'budget', description: 'Track project budgets' }
        ]
    },
    {
        name: 'Operations Management',
        slug: 'operations',
        description: 'Process management, field operations, and service delivery',
        category: 'projects',
        isCore: false,
        permissionPrefix: 'operations',
        icon: 'operations',
        color: '#7f8c8d',
        routeBase: '/operations',
        sidebarGroup: 'operations',
        displayOrder: 130,
        dependencies: ['projects'],
        features: [
            { name: 'Process Management', key: 'process', description: 'Manage business processes' },
            { name: 'Field Operations', key: 'field', description: 'Manage field operations' },
            { name: 'Service Delivery', key: 'service', description: 'Service delivery management' }
        ]
    },
    
    // ========== 9. ADDITIONAL OPERATIONS MODULES ==========
    {
        name: 'Point of Sale',
        slug: 'pos',
        description: 'Retail POS, sales transactions, and cash management',
        category: 'operations',
        isCore: false,
        permissionPrefix: 'pos',
        icon: 'pos',
        color: '#e67e22',
        routeBase: '/pos',
        sidebarGroup: 'operations',
        displayOrder: 140,
        dependencies: ['inventory', 'sales'],
        features: [
            { name: 'Sales Transactions', key: 'sales', description: 'Process POS sales' },
            { name: 'Cash Management', key: 'cash', description: 'Manage cash drawers' },
            { name: 'Returns', key: 'returns', description: 'Process customer returns' },
            { name: 'End of Day', key: 'eod', description: 'End of day reconciliation' },
            { name: 'Loyalty', key: 'loyalty', description: 'Customer loyalty integration' }
        ]
    },
    
    // ========== 10. INDUSTRY-SPECIFIC EXTENSIONS ==========
    {
        name: 'Healthcare Management',
        slug: 'healthcare',
        description: 'Healthcare-specific modules for hospitals and clinics',
        category: 'industry',
        isCore: false,
        permissionPrefix: 'healthcare',
        icon: 'healthcare',
        color: '#e74c3c',
        routeBase: '/healthcare',
        sidebarGroup: 'industry',
        displayOrder: 200,
        features: [
            { name: 'Patient Records', key: 'patients', description: 'Manage patient information' },
            { name: 'Appointments', key: 'appointments', description: 'Schedule appointments' },
            { name: 'Medical Records', key: 'medical', description: 'Electronic medical records' },
            { name: 'Pharmacy', key: 'pharmacy', description: 'Pharmacy management' },
            { name: 'Lab Management', key: 'lab', description: 'Laboratory operations' },
            { name: 'Insurance Billing', key: 'insurance', description: 'Insurance claims' }
        ]
    },
    {
        name: 'Education Management',
        slug: 'education',
        description: 'Education-specific modules for schools and universities',
        category: 'industry',
        isCore: false,
        permissionPrefix: 'education',
        icon: 'education',
        color: '#3498db',
        routeBase: '/education',
        sidebarGroup: 'industry',
        displayOrder: 210,
        features: [
            { name: 'Student Records', key: 'students', description: 'Manage student information' },
            { name: 'Course Management', key: 'courses', description: 'Manage courses and curriculum' },
            { name: 'Enrollment', key: 'enrollment', description: 'Student enrollment' },
            { name: 'Grades', key: 'grades', description: 'Manage grades and transcripts' },
            { name: 'Examinations', key: 'exams', description: 'Exam scheduling and results' },
            { name: 'Faculty Management', key: 'faculty', description: 'Manage teaching staff' }
        ]
    },
    {
        name: 'Hospitality Management',
        slug: 'hospitality',
        description: 'Hospitality modules for hotels, restaurants, and venues',
        category: 'industry',
        isCore: false,
        permissionPrefix: 'hospitality',
        icon: 'hospitality',
        color: '#f39c12',
        routeBase: '/hospitality',
        sidebarGroup: 'industry',
        displayOrder: 220,
        dependencies: ['pos', 'inventory'],
        features: [
            { name: 'Hotel Management', key: 'hotel', description: 'Hotel operations' },
            { name: 'Restaurant Management', key: 'restaurant', description: 'Restaurant operations' },
            { name: 'Kitchen Management', key: 'kitchen', description: 'Kitchen operations' },
            { name: 'Table Management', key: 'tables', description: 'Restaurant table management' },
            { name: 'Menu Management', key: 'menu', description: 'Menu and pricing' },
            { name: 'Housekeeping', key: 'housekeeping', description: 'Housekeeping management' },
            { name: 'Event Management', key: 'events', description: 'Banquet and event management' }
        ]
    },
    {
        name: 'Retail Management',
        slug: 'retail',
        description: 'Retail-specific modules for stores and chains',
        category: 'industry',
        isCore: false,
        permissionPrefix: 'retail',
        icon: 'retail',
        color: '#27ae60',
        routeBase: '/retail',
        sidebarGroup: 'industry',
        displayOrder: 230,
        dependencies: ['pos', 'inventory'],
        features: [
            { name: 'Store Management', key: 'stores', description: 'Manage retail stores' },
            { name: 'Merchandising', key: 'merchandising', description: 'Product display and promotion' },
            { name: 'Loyalty Programs', key: 'loyalty', description: 'Customer loyalty' },
            { name: 'Pricing', key: 'pricing', description: 'Retail pricing management' },
            { name: 'Promotions', key: 'promotions', description: 'Sales promotions' }
        ]
    },
    
    // ========== 11. EXTERNAL & PORTAL USERS ==========
    {
        name: 'Customer Portal',
        slug: 'customer-portal',
        description: 'Self-service portal for customers',
        category: 'external',
        isCore: false,
        permissionPrefix: 'customer',
        icon: 'customer',
        color: '#95a5a6',
        routeBase: '/portal/customer',
        sidebarGroup: 'external',
        displayOrder: 300,
        features: [
            { name: 'Order Tracking', key: 'orders', description: 'View order status' },
            { name: 'Invoice Viewing', key: 'invoices', description: 'View invoices' },
            { name: 'Support Tickets', key: 'tickets', description: 'Submit support tickets' },
            { name: 'Profile Management', key: 'profile', description: 'Manage profile' }
        ]
    },
    {
        name: 'Vendor Portal',
        slug: 'vendor-portal',
        description: 'Self-service portal for vendors and suppliers',
        category: 'external',
        isCore: false,
        permissionPrefix: 'vendor',
        icon: 'vendor',
        color: '#7f8c8d',
        routeBase: '/portal/vendor',
        sidebarGroup: 'external',
        displayOrder: 310,
        features: [
            { name: 'Purchase Orders', key: 'pos', description: 'View purchase orders' },
            { name: 'Invoicing', key: 'invoices', description: 'Submit invoices' },
            { name: 'RFQ Responses', key: 'rfq', description: 'Respond to RFQs' }
        ]
    },
    {
        name: 'Partner Portal',
        slug: 'partner-portal',
        description: 'Portal for business partners',
        category: 'external',
        isCore: false,
        permissionPrefix: 'partner',
        icon: 'partner',
        color: '#bdc3c7',
        routeBase: '/portal/partner',
        sidebarGroup: 'external',
        displayOrder: 320,
        features: [
            { name: 'Partner Data', key: 'data', description: 'View partner information' },
            { name: 'Collaboration', key: 'collaboration', description: 'Partner collaboration' }
        ]
    },
    
    // ========== 12. REPORTING & ANALYTICS ==========
    {
        name: 'Analytics & Reporting',
        slug: 'analytics',
        description: 'Business intelligence, dashboards, and custom reports',
        category: 'reporting',
        isCore: false,
        permissionPrefix: 'analytics',
        icon: 'analytics',
        color: '#34495e',
        routeBase: '/analytics',
        sidebarGroup: 'reports',
        displayOrder: 400,
        features: [
            { name: 'Dashboards', key: 'dashboards', description: 'Customizable dashboards' },
            { name: 'Standard Reports', key: 'standard', description: 'Pre-built reports' },
            { name: 'Custom Reports', key: 'custom', description: 'Create custom reports' },
            { name: 'Data Export', key: 'export', description: 'Export data to various formats' },
            { name: 'Scheduled Reports', key: 'scheduled', description: 'Schedule report generation' }
        ]
    }
];

const seedModules = async () => {
    try {
        console.log('🌱 Seeding modules...');
        
        // Clear existing modules
        await Module.deleteMany({});
        console.log('   Cleared existing modules');
        
        // Insert modules
        const insertedModules = await Module.insertMany(modules);
        
        console.log(`✅ ${insertedModules.length} modules seeded successfully`);
        
        // Group by category for summary
        const categoryCount = {};
        modules.forEach(module => {
            categoryCount[module.category] = (categoryCount[module.category] || 0) + 1;
        });
        
        console.log('\n📊 Modules by Category:');
        Object.entries(categoryCount).forEach(([category, count]) => {
            console.log(`   ${category}: ${count} modules`);
        });
        
        return insertedModules;
    } catch (error) {
        console.error('Error seeding modules:', error);
        throw error;
    }
};

// Run seeder if called directly
if (require.main === module) {
    require('dotenv').config();
    
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('📦 Connected to MongoDB');
            return seedModules();
        })
        .then(() => {
            console.log('✨ Module seeding complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seeding error:', error);
            process.exit(1);
        });
}

module.exports = seedModules;