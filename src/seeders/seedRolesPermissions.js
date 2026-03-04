// src/seeders/rolesPermissions.seeder.js
const mongoose = require('mongoose');
const Permission = require('../models/permission.model');
const Role = require('../models/role.model');
const { PERMISSIONS } = require('../utils/permission.constants');

const seedPermissions = async () => {
    try {
        console.log('🌱 Seeding permissions...');
        
        // Clear existing permissions
        await Permission.deleteMany({});
        console.log('   Cleared existing permissions');
        
        // Convert PERMISSIONS object to array of permission documents
        const permissions = [];
        
        // Flatten the PERMISSIONS object
        for (const [module, modulePermissions] of Object.entries(PERMISSIONS)) {
            for (const [key, permissionString] of Object.entries(modulePermissions)) {
                // Parse permission string correctly
                const [moduleName, ...rest] = permissionString.split('.');
                const resourceAction = rest.join('.');
                
                // Find last underscore to split resource and action
                const lastUnderscore = resourceAction.lastIndexOf('_');
                const resource = resourceAction.substring(0, lastUnderscore);
                const action = resourceAction.substring(lastUnderscore + 1);
                
                permissions.push({
                    name: permissionString,
                    description: `${action} ${resource} in ${moduleName} module`,
                    module: moduleName.toLowerCase(),
                    resource: resource,
                    action: action,
                    isActive: true
                });
            }
        }

        // Insert all permissions at once (more efficient)
        const insertedPermissions = await Permission.insertMany(permissions, { 
            ordered: false, // Continue even if some fail
            rawResult: true 
        });

        console.log(`✅ ${permissions.length} permissions seeded successfully`);
        return await Permission.find();
    } catch (error) {
        // If error is duplicate key, it's okay - permissions might already exist
        if (error.code === 11000) {
            console.log('⚠️  Some permissions already exist, continuing...');
            return await Permission.find();
        }
        console.error('Error seeding permissions:', error);
        throw error;
    }
};

const seedRoles = async () => {
    try {
        console.log('🌱 Seeding all ERP roles...');
        
        // Clear existing roles
        await Role.deleteMany({});
        console.log('   Cleared existing roles');
        
        // Get all permissions
        const allPermissions = await Permission.find();
        
        // Helper function to filter permissions by module and actions
        const getPermissionsByModule = (module, actions = ['create', 'read', 'update', 'delete', 'approve', 'manage']) => {
            return allPermissions.filter(p => 
                p.module === module && actions.includes(p.action)
            ).map(p => p._id);
        };

        const getReadOnlyPermissions = (modules = []) => {
            if (modules.length === 0) {
                return allPermissions.filter(p => 
                    p.action === 'read' || p.action === 'view'
                ).map(p => p._id);
            }
            return allPermissions.filter(p => 
                modules.includes(p.module) && (p.action === 'read' || p.action === 'view')
            ).map(p => p._id);
        };

        // Helper to get POS permissions by action
        const getPosPermissions = (actions = []) => {
            return allPermissions.filter(p => 
                p.module === 'pos' && 
                (actions.length === 0 || actions.includes(p.action))
            ).map(p => p._id);
        };

        // Define ALL roles from your comprehensive list
        const roles = [
            // ========================================
            // 1. SYSTEM, SECURITY & GOVERNANCE
            // ========================================
            {
                name: 'Super Administrator',
                description: 'Full unrestricted system access',
                category: 'system',
                hierarchy: 1000,
                isDefault: true,
                permissions: allPermissions.map(p => p._id) // ALL permissions
            },
            {
                name: 'System Administrator',
                description: 'System config, servers, backups',
                category: 'system',
                hierarchy: 950,
                isDefault: true,
                permissions: [
                    ...getPermissionsByModule('system'),
                    ...getPermissionsByModule('security')
                ]
            },
            {
                name: 'ERP Administrator',
                description: 'Module control, workflows, master data',
                category: 'system',
                hierarchy: 900,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'system' || 
                    p.resource === 'workflow' || 
                    p.resource === 'module'
                ).map(p => p._id)
            },
            {
                name: 'Identity & Access Manager',
                description: 'Users, roles, permissions',
                category: 'system',
                hierarchy: 850,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    (p.module === 'system' && ['users', 'roles', 'permissions'].includes(p.resource))
                ).map(p => p._id)
            },
            {
                name: 'Security Officer',
                description: 'Security policies, audits',
                category: 'security',
                hierarchy: 800,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'security' || 
                    (p.module === 'system' && p.resource === 'audit')
                ).map(p => p._id)
            },
            {
                name: 'Compliance Officer',
                description: 'Regulatory compliance',
                category: 'security',
                hierarchy: 750,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'security' && 
                    ['compliance', 'policy'].includes(p.resource)
                ).map(p => p._id)
            },
            {
                name: 'Risk Manager',
                description: 'Risk registers, mitigation',
                category: 'security',
                hierarchy: 700,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'risk' || p.resource === 'mitigation'
                ).map(p => p._id)
            },
            {
                name: 'Internal Auditor',
                description: 'Read-only audit access',
                category: 'security',
                hierarchy: 650,
                isDefault: true,
                permissions: getReadOnlyPermissions(['system', 'security', 'finance', 'hr', 'procurement'])
            },
            {
                name: 'External Auditor',
                description: 'Restricted audit access',
                category: 'security',
                hierarchy: 600,
                isDefault: true,
                permissions: getReadOnlyPermissions(['finance', 'procurement'])
            },
            {
                name: 'Data Protection Officer (DPO)',
                description: 'GDPR / data privacy',
                category: 'security',
                hierarchy: 700,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'privacy' || 
                    p.resource === 'data' || 
                    (p.module === 'hr' && p.resource === 'employees')
                ).map(p => p._id)
            },

            // ========================================
            // 2. EXECUTIVE & STRATEGIC MANAGEMENT
            // ========================================
            {
                name: 'Board Member',
                description: 'Strategic dashboards',
                category: 'executive',
                hierarchy: 980,
                isDefault: true,
                permissions: getReadOnlyPermissions(['analytics'])
            },
            {
                name: 'Chairman',
                description: 'Governance oversight',
                category: 'executive',
                hierarchy: 990,
                isDefault: true,
                permissions: getReadOnlyPermissions(['analytics', 'system', 'security'])
            },
            {
                name: 'Chief Executive Officer (CEO)',
                description: 'Full analytics',
                category: 'executive',
                hierarchy: 970,
                isDefault: true,
                permissions: [
                    ...getReadOnlyPermissions(['analytics', 'finance', 'sales', 'hr', 'manufacturing']),
                    ...getPermissionsByModule('analytics', ['read', 'export'])
                ]
            },
            {
                name: 'Chief Operating Officer (COO)',
                description: 'Operations',
                category: 'executive',
                hierarchy: 950,
                isDefault: true,
                permissions: [
                    ...getReadOnlyPermissions(['manufacturing', 'procurement', 'inventory', 'projects'])
                ]
            },
            {
                name: 'Chief Financial Officer (CFO)',
                description: 'Financial oversight',
                category: 'executive',
                hierarchy: 950,
                isDefault: true,
                permissions: [
                    ...getReadOnlyPermissions(['finance']),
                    ...getPermissionsByModule('finance', ['read', 'approve'])
                ]
            },
            {
                name: 'Chief Technology Officer (CTO)',
                description: 'Technology & systems',
                category: 'executive',
                hierarchy: 940,
                isDefault: true,
                permissions: [
                    ...getReadOnlyPermissions(['system']),
                    ...getPermissionsByModule('system', ['read', 'manage'])
                ]
            },
            {
                name: 'Chief Information Officer (CIO)',
                description: 'IT governance',
                category: 'executive',
                hierarchy: 940,
                isDefault: true,
                permissions: getReadOnlyPermissions(['system', 'security'])
            },
            {
                name: 'Chief Risk Officer (CRO)',
                description: 'Risk management',
                category: 'executive',
                hierarchy: 930,
                isDefault: true,
                permissions: [
                    ...getReadOnlyPermissions(['security', 'finance', 'projects']),
                    ...getPermissionsByModule('security', ['read', 'manage'])
                ]
            },
            {
                name: 'Chief Human Resources Officer (CHRO)',
                description: 'HR oversight',
                category: 'executive',
                hierarchy: 930,
                isDefault: true,
                permissions: [
                    ...getReadOnlyPermissions(['hr']),
                    ...getPermissionsByModule('hr', ['read', 'approve'])
                ]
            },
            {
                name: 'Strategy Director',
                description: 'Strategic planning',
                category: 'executive',
                hierarchy: 900,
                isDefault: true,
                permissions: getReadOnlyPermissions(['analytics', 'sales', 'finance'])
            },

            // ========================================
            // 3. FINANCE, ACCOUNTING & TREASURY
            // ========================================
            {
                name: 'Finance Director',
                description: 'Financial governance',
                category: 'finance',
                hierarchy: 900,
                isDefault: true,
                permissions: [
                    ...getReadOnlyPermissions(['finance']),
                    ...getPermissionsByModule('finance', ['approve'])
                ]
            },
            {
                name: 'Finance Manager',
                description: 'Approvals, reports',
                category: 'finance',
                hierarchy: 850,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'finance' && 
                    ['create', 'read', 'update', 'approve'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Accountant (General Ledger)',
                description: 'Journals, ledgers',
                category: 'finance',
                hierarchy: 700,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'finance' && 
                    ['journal', 'ledger', 'account'].includes(p.resource) &&
                    ['create', 'read', 'update'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Accounts Payable Officer',
                description: 'Supplier invoices',
                category: 'finance',
                hierarchy: 600,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'finance' && 
                    ['ap_invoice', 'payment'].includes(p.resource) &&
                    ['create', 'read', 'update'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Accounts Receivable Officer',
                description: 'Customer invoices',
                category: 'finance',
                hierarchy: 600,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'finance' && 
                    ['ar_invoice', 'receipt'].includes(p.resource) &&
                    ['create', 'read', 'update'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Billing Officer',
                description: 'Invoice generation',
                category: 'finance',
                hierarchy: 550,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'finance' && 
                    ['invoice', 'billing'].includes(p.resource) &&
                    ['create', 'read'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Payroll Manager',
                description: 'Payroll processing',
                category: 'finance',
                hierarchy: 750,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'payroll' && 
                    ['create', 'read', 'update', 'approve'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Payroll Officer',
                description: 'Payslips',
                category: 'finance',
                hierarchy: 550,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'payroll' && 
                    ['create', 'read'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Tax Manager',
                description: 'Tax compliance',
                category: 'finance',
                hierarchy: 750,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'tax' && 
                    ['create', 'read', 'update', 'approve'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Cost Accountant',
                description: 'Cost tracking',
                category: 'finance',
                hierarchy: 650,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'cost' || p.resource === 'budget'
                ).map(p => p._id)
            },
            {
                name: 'Budget Officer',
                description: 'Budgeting',
                category: 'finance',
                hierarchy: 600,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'budget' && 
                    ['create', 'read', 'update'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Treasury Manager',
                description: 'Cash & banks',
                category: 'finance',
                hierarchy: 750,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    ['bank', 'cash'].includes(p.resource) &&
                    ['create', 'read', 'update', 'reconcile'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Financial Analyst',
                description: 'Forecasting',
                category: 'finance',
                hierarchy: 650,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'analytics' || 
                    (p.module === 'finance' && p.action === 'read')
                ).map(p => p._id)
            },
            {
                name: 'Fixed Assets Manager',
                description: 'Asset lifecycle',
                category: 'finance',
                hierarchy: 600,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'asset' && 
                    ['create', 'read', 'update'].includes(p.action)
                ).map(p => p._id)
            },

            // ========================================
            // 4. HUMAN RESOURCES (HCM)
            // ========================================
            {
                name: 'HR Director',
                description: 'HR strategy',
                category: 'hr',
                hierarchy: 900,
                isDefault: true,
                permissions: [
                    ...getReadOnlyPermissions(['hr']),
                    ...getPermissionsByModule('hr', ['approve'])
                ]
            },
            {
                name: 'HR Manager',
                description: 'Policies',
                category: 'hr',
                hierarchy: 800,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'hr' && 
                    ['create', 'read', 'update', 'approve'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'HR Officer',
                description: 'Employee records',
                category: 'hr',
                hierarchy: 600,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'hr' && 
                    p.resource === 'employees' &&
                    ['create', 'read', 'update'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Recruitment Manager',
                description: 'Hiring',
                category: 'hr',
                hierarchy: 700,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'hr' && 
                    ['job', 'application', 'interview'].includes(p.resource) &&
                    ['create', 'read', 'update', 'approve'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Recruiter',
                description: 'Candidate tracking',
                category: 'hr',
                hierarchy: 550,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'hr' && 
                    ['job', 'application'].includes(p.resource) &&
                    ['create', 'read', 'update'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Training Manager',
                description: 'Learning',
                category: 'hr',
                hierarchy: 650,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'training' && 
                    ['create', 'read', 'update', 'enroll'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Performance Manager',
                description: 'Appraisals',
                category: 'hr',
                hierarchy: 650,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'review' || p.resource === 'performance'
                ).map(p => p._id)
            },
            {
                name: 'Compensation & Benefits Manager',
                description: 'Salaries',
                category: 'hr',
                hierarchy: 700,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'compensation' || 
                    p.resource === 'benefits' ||
                    p.resource === 'payroll'
                ).map(p => p._id)
            },
            {
                name: 'Leave Administrator',
                description: 'Leave approvals',
                category: 'hr',
                hierarchy: 550,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'leave' && 
                    ['read', 'update', 'approve'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Time & Attendance Officer',
                description: 'Shifts',
                category: 'hr',
                hierarchy: 500,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'attendance' || p.resource === 'shift'
                ).map(p => p._id)
            },
            {
                name: 'Employee Self-Service User',
                description: 'Personal data',
                category: 'hr',
                hierarchy: 200,
                isDefault: true,
                permissions: [
                    ...allPermissions.filter(p => 
                        p.resource === 'leave' && p.action === 'apply'
                    ).map(p => p._id),
                    ...allPermissions.filter(p => 
                        p.resource === 'attendance' && p.action === 'mark'
                    ).map(p => p._id),
                    ...allPermissions.filter(p => 
                        p.resource === 'payslips' && p.action === 'view'
                    ).map(p => p._id),
                    ...allPermissions.filter(p => 
                        p.resource === 'employees' && p.action === 'view' && p.module === 'hr'
                    ).map(p => p._id)
                ]
            },

            // ========================================
            // 5. SALES, MARKETING & CRM
            // ========================================
            {
                name: 'Sales Director',
                description: 'Sales strategy',
                category: 'sales',
                hierarchy: 850,
                isDefault: true,
                permissions: [
                    ...getReadOnlyPermissions(['sales', 'crm']),
                    ...getPermissionsByModule('sales', ['approve'])
                ]
            },
            {
                name: 'Sales Manager',
                description: 'Sales approvals',
                category: 'sales',
                hierarchy: 750,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'sales' && 
                    ['create', 'read', 'update', 'approve'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Sales Executive',
                description: 'Orders',
                category: 'sales',
                hierarchy: 500,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'sales' && 
                    ['leads', 'customers', 'quotes', 'orders'].includes(p.resource) &&
                    ['create', 'read', 'update'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Account Manager',
                description: 'Client relationships',
                category: 'sales',
                hierarchy: 600,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'sales' && 
                    ['customers', 'accounts'].includes(p.resource)
                ).map(p => p._id)
            },
            {
                name: 'Business Development Manager',
                description: 'Partnerships',
                category: 'sales',
                hierarchy: 650,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'partners' || p.resource === 'opportunities'
                ).map(p => p._id)
            },
            {
                name: 'CRM Manager',
                description: 'Customer data',
                category: 'sales',
                hierarchy: 600,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'crm' || 
                    (p.module === 'sales' && p.resource === 'customers')
                ).map(p => p._id)
            },
            {
                name: 'Marketing Director',
                description: 'Marketing strategy',
                category: 'sales',
                hierarchy: 800,
                isDefault: true,
                permissions: getReadOnlyPermissions(['analytics', 'sales'])
            },
            {
                name: 'Marketing Manager',
                description: 'Campaigns',
                category: 'sales',
                hierarchy: 650,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'campaign' || p.resource === 'marketing'
                ).map(p => p._id)
            },
            {
                name: 'Digital Marketing Officer',
                description: 'Online marketing',
                category: 'sales',
                hierarchy: 500,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'campaign' || p.resource === 'digital'
                ).map(p => p._id)
            },
            {
                name: 'Pricing Manager',
                description: 'Pricing rules',
                category: 'sales',
                hierarchy: 600,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'pricing' || p.resource === 'price'
                ).map(p => p._id)
            },
            {
                name: 'Customer Support Manager',
                description: 'Support operations',
                category: 'sales',
                hierarchy: 600,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'support' || p.resource === 'ticket'
                ).map(p => p._id)
            },
            {
                name: 'Customer Support Agent',
                description: 'Tickets',
                category: 'sales',
                hierarchy: 400,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'ticket' && 
                    ['create', 'read', 'update'].includes(p.action)
                ).map(p => p._id)
            },

            // ========================================
            // 6. PROCUREMENT, INVENTORY & SUPPLY CHAIN
            // ========================================
            {
                name: 'Procurement Director',
                description: 'Procurement strategy',
                category: 'procurement',
                hierarchy: 850,
                isDefault: true,
                permissions: [
                    ...getReadOnlyPermissions(['procurement']),
                    ...getPermissionsByModule('procurement', ['approve'])
                ]
            },
            {
                name: 'Procurement Manager',
                description: 'Purchase approvals',
                category: 'procurement',
                hierarchy: 750,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'procurement' && 
                    ['create', 'read', 'update', 'approve'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Procurement Officer',
                description: 'Purchase orders',
                category: 'procurement',
                hierarchy: 550,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'procurement' && 
                    ['po', 'rfq'].includes(p.resource) &&
                    ['create', 'read', 'update'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Vendor Manager',
                description: 'Supplier management',
                category: 'procurement',
                hierarchy: 600,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'vendors' || p.resource === 'suppliers'
                ).map(p => p._id)
            },
            {
                name: 'Inventory Manager',
                description: 'Stock control',
                category: 'procurement',
                hierarchy: 700,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'inventory' || p.resource === 'stock'
                ).map(p => p._id)
            },
            {
                name: 'Storekeeper',
                description: 'Stock handling',
                category: 'procurement',
                hierarchy: 400,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'inventory' && 
                    ['read', 'adjust'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Warehouse Manager',
                description: 'Warehousing',
                category: 'procurement',
                hierarchy: 650,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'warehouse' || p.resource === 'inventory'
                ).map(p => p._id)
            },
            {
                name: 'Logistics Manager',
                description: 'Transport',
                category: 'procurement',
                hierarchy: 650,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'logistics' || p.resource === 'transport'
                ).map(p => p._id)
            },
            {
                name: 'Supply Chain Planner',
                description: 'Forecasting',
                category: 'procurement',
                hierarchy: 650,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'supply' || p.resource === 'demand'
                ).map(p => p._id)
            },
            {
                name: 'Demand Planner',
                description: 'Demand planning',
                category: 'procurement',
                hierarchy: 600,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'demand' || p.resource === 'forecast'
                ).map(p => p._id)
            },
            {
                name: 'Distribution Manager',
                description: 'Distribution',
                category: 'procurement',
                hierarchy: 600,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'distribution' || p.resource === 'shipping'
                ).map(p => p._id)
            },
            {
                name: 'Quality Control Officer',
                description: 'Inspections',
                category: 'procurement',
                hierarchy: 500,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'quality' || p.resource === 'inspection'
                ).map(p => p._id)
            },

            // ========================================
            // 7. MANUFACTURING & PRODUCTION
            // ========================================
            {
                name: 'Manufacturing Director',
                description: 'Manufacturing oversight',
                category: 'manufacturing',
                hierarchy: 850,
                isDefault: true,
                permissions: [
                    ...getReadOnlyPermissions(['manufacturing']),
                    ...getPermissionsByModule('manufacturing', ['approve'])
                ]
            },
            {
                name: 'Production Manager',
                description: 'Production planning',
                category: 'manufacturing',
                hierarchy: 750,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'manufacturing' && 
                    ['production', 'schedule'].includes(p.resource) &&
                    ['create', 'read', 'update', 'approve'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Factory Supervisor',
                description: 'Operations',
                category: 'manufacturing',
                hierarchy: 600,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'manufacturing' && 
                    ['production', 'quality'].includes(p.resource) &&
                    ['read', 'update', 'report'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Production Planner',
                description: 'Scheduling',
                category: 'manufacturing',
                hierarchy: 600,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'production' && 
                    ['schedule', 'plan'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Machine Operator',
                description: 'Production execution',
                category: 'manufacturing',
                hierarchy: 350,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'manufacturing' && 
                    p.resource === 'production' && 
                    ['read', 'report'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Maintenance Manager',
                description: 'Equipment maintenance',
                category: 'manufacturing',
                hierarchy: 650,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'maintenance' && 
                    ['schedule', 'perform', 'approve'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Maintenance Technician',
                description: 'Repairs',
                category: 'manufacturing',
                hierarchy: 400,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'maintenance' && 
                    ['read', 'perform'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Quality Assurance Manager',
                description: 'QA',
                category: 'manufacturing',
                hierarchy: 650,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'quality' && 
                    ['create', 'read', 'update', 'approve'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Quality Inspector',
                description: 'Inspections',
                category: 'manufacturing',
                hierarchy: 450,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'quality' && 
                    ['read', 'perform'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'BOM Manager',
                description: 'Bills of materials',
                category: 'manufacturing',
                hierarchy: 550,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'bom' && 
                    ['create', 'read', 'update'].includes(p.action)
                ).map(p => p._id)
            },

            // ========================================
            // 8. PROJECT & OPERATIONS MANAGEMENT
            // ========================================
            {
                name: 'Project Director',
                description: 'Project portfolio',
                category: 'projects',
                hierarchy: 800,
                isDefault: true,
                permissions: [
                    ...getReadOnlyPermissions(['projects']),
                    ...getPermissionsByModule('projects', ['approve'])
                ]
            },
            {
                name: 'Project Manager',
                description: 'Project execution',
                category: 'projects',
                hierarchy: 700,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'projects' && 
                    ['create', 'read', 'update', 'approve'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Project Coordinator',
                description: 'Task coordination',
                category: 'projects',
                hierarchy: 500,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.module === 'projects' && 
                    ['read', 'update'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Operations Manager',
                description: 'Process management',
                category: 'projects',
                hierarchy: 700,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'operations' || p.resource === 'process'
                ).map(p => p._id)
            },
            {
                name: 'Task Owner',
                description: 'Task execution',
                category: 'projects',
                hierarchy: 400,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'task' && 
                    ['read', 'update'].includes(p.action)
                ).map(p => p._id)
            },
            {
                name: 'Field Operations Officer',
                description: 'Field work',
                category: 'projects',
                hierarchy: 350,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'field' || p.resource === 'task'
                ).map(p => p._id)
            },
            {
                name: 'Service Delivery Manager',
                description: 'Service operations',
                category: 'projects',
                hierarchy: 650,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'service' || p.resource === 'delivery'
                ).map(p => p._id)
            },

            // ========================================
            // 9. POS (POINT OF SALE) ROLES
            // ========================================
            {
                name: 'POS Administrator',
                description: 'Full POS system management',
                category: 'pos',
                hierarchy: 700,
                isDefault: true,
                permissions: getPosPermissions() // All POS permissions
            },
            {
                name: 'Store Manager',
                description: 'Oversee store operations including POS',
                category: 'pos',
                hierarchy: 650,
                isDefault: true,
                permissions: [
                    ...getPosPermissions(['create', 'read', 'void', 'return']),
                    ...getPosPermissions(['report']),
                    ...getPosPermissions(['register_open', 'register_close', 'reconcile'])
                ]
            },
            {
                name: 'Shift Supervisor',
                description: 'Supervise cashiers and shifts',
                category: 'pos',
                hierarchy: 500,
                isDefault: true,
                permissions: [
                    ...getPosPermissions(['read']),
                    ...getPosPermissions(['register_open', 'register_close']),
                    ...getPosPermissions(['x_read', 'z_read']),
                    ...getPosPermissions(['discount_apply'])
                ]
            },
            {
                name: 'Senior Cashier',
                description: 'Process sales and handle returns',
                category: 'pos',
                hierarchy: 400,
                isDefault: true,
                permissions: [
                    ...getPosPermissions(['create', 'read']),
                    ...getPosPermissions(['return', 'void']),
                    ...getPosPermissions(['discount_apply']),
                    ...getPosPermissions(['customer_create']),
                    ...getPosPermissions(['loyalty_apply'])
                ]
            },
            {
                name: 'Cashier',
                description: 'Process basic sales transactions',
                category: 'pos',
                hierarchy: 300,
                isDefault: true,
                permissions: [
                    ...getPosPermissions(['create', 'read']),
                    ...getPosPermissions(['product_scan']),
                    ...getPosPermissions(['customer_create'])
                ]
            },
            {
                name: 'Inventory Clerk',
                description: 'Manage products and pricing',
                category: 'pos',
                hierarchy: 350,
                isDefault: true,
                permissions: [
                    ...getPosPermissions(['read']),
                    ...getPosPermissions(['product_scan']),
                    ...getPosPermissions(['report_product_view'])
                ]
            },

            // ========================================
            // 10. INDUSTRY-SPECIFIC - HEALTHCARE
            // ========================================
            {
                name: 'Hospital Administrator',
                description: 'Hospital operations',
                category: 'industry',
                hierarchy: 750,
                isDefault: true,
                permissions: getReadOnlyPermissions(['hr', 'finance', 'procurement'])
            },
            {
                name: 'Doctor',
                description: 'Medical practitioner',
                category: 'industry',
                hierarchy: 600,
                isDefault: true,
                permissions: [] // Will be populated with healthcare-specific permissions
            },
            {
                name: 'Nurse',
                description: 'Nursing staff',
                category: 'industry',
                hierarchy: 400,
                isDefault: true,
                permissions: []
            },
            {
                name: 'Pharmacist',
                description: 'Pharmacy management',
                category: 'industry',
                hierarchy: 500,
                isDefault: true,
                permissions: getReadOnlyPermissions(['procurement'])
            },
            {
                name: 'Lab Technician',
                description: 'Laboratory operations',
                category: 'industry',
                hierarchy: 400,
                isDefault: true,
                permissions: []
            },
            {
                name: 'Insurance Officer',
                description: 'Insurance claims',
                category: 'industry',
                hierarchy: 450,
                isDefault: true,
                permissions: getReadOnlyPermissions(['finance'])
            },

            // ========================================
            // 11. INDUSTRY-SPECIFIC - EDUCATION
            // ========================================
            {
                name: 'Registrar',
                description: 'Student records',
                category: 'industry',
                hierarchy: 650,
                isDefault: true,
                permissions: getReadOnlyPermissions(['hr'])
            },
            {
                name: 'Lecturer',
                description: 'Teaching staff',
                category: 'industry',
                hierarchy: 500,
                isDefault: true,
                permissions: []
            },
            {
                name: 'Student',
                description: 'Learner',
                category: 'industry',
                hierarchy: 100,
                isDefault: true,
                permissions: [] // Self-service only
            },
            {
                name: 'Exams Officer',
                description: 'Examination management',
                category: 'industry',
                hierarchy: 500,
                isDefault: true,
                permissions: []
            },

            // ========================================
            // 12. INDUSTRY-SPECIFIC - HOSPITALITY
            // ========================================
            {
                name: 'Hotel Manager',
                description: 'Hotel operations',
                category: 'industry',
                hierarchy: 700,
                isDefault: true,
                permissions: getReadOnlyPermissions(['sales', 'hr', 'procurement'])
            },
            {
                name: 'Receptionist',
                description: 'Front desk',
                category: 'industry',
                hierarchy: 350,
                isDefault: true,
                permissions: getReadOnlyPermissions(['sales'])
            },
            {
                name: 'Housekeeping',
                description: 'Cleaning staff',
                category: 'industry',
                hierarchy: 250,
                isDefault: true,
                permissions: []
            },
            {
                name: 'F&B Manager',
                description: 'Food & beverage',
                category: 'industry',
                hierarchy: 550,
                isDefault: true,
                permissions: getReadOnlyPermissions(['procurement', 'sales'])
            },
            {
                name: 'Waiter',
                description: 'Service staff',
                category: 'industry',
                hierarchy: 200,
                isDefault: true,
                permissions: []
            },
            {
                name: 'Chef',
                description: 'Kitchen operations',
                category: 'industry',
                hierarchy: 450,
                isDefault: true,
                permissions: getReadOnlyPermissions(['procurement'])
            },

            // ========================================
            // 13. INDUSTRY-SPECIFIC - RETAIL
            // ========================================
            {
                name: 'Store Manager',
                description: 'Store operations',
                category: 'industry',
                hierarchy: 600,
                isDefault: true,
                permissions: getReadOnlyPermissions(['sales', 'procurement', 'finance'])
            },
            {
                name: 'Cashier',
                description: 'Point of sale',
                category: 'industry',
                hierarchy: 300,
                isDefault: true,
                permissions: getReadOnlyPermissions(['sales'])
            },
            {
                name: 'Merchandiser',
                description: 'Product display',
                category: 'industry',
                hierarchy: 350,
                isDefault: true,
                permissions: getReadOnlyPermissions(['procurement'])
            },

            // ========================================
            // 14. EXTERNAL & PORTAL USERS
            // ========================================
            {
                name: 'Customer Portal User',
                description: 'Orders, invoices',
                category: 'external',
                hierarchy: 100,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    (p.module === 'sales' && ['orders', 'invoices', 'quotes'].includes(p.resource) && p.action === 'view') ||
                    (p.module === 'sales' && p.resource === 'orders' && p.action === 'create')
                ).map(p => p._id)
            },
            {
                name: 'Vendor Portal User',
                description: 'Supply management',
                category: 'external',
                hierarchy: 100,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    (p.module === 'procurement' && ['po', 'rfq'].includes(p.resource) && p.action === 'view') ||
                    (p.module === 'procurement' && p.resource === 'invoices' && p.action === 'view')
                ).map(p => p._id)
            },
            {
                name: 'Partner User',
                description: 'Partner data',
                category: 'external',
                hierarchy: 150,
                isDefault: true,
                permissions: getReadOnlyPermissions(['sales', 'crm'])
            },
            {
                name: 'Contractor',
                description: 'Assigned tasks',
                category: 'external',
                hierarchy: 120,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.resource === 'task' && p.action === 'read'
                ).map(p => p._id)
            },
            {
                name: 'Consultant',
                description: 'Restricted modules',
                category: 'external',
                hierarchy: 200,
                isDefault: true,
                permissions: getReadOnlyPermissions(['analytics', 'projects'])
            },
            {
                name: 'API / Integration User',
                description: 'System integration',
                category: 'external',
                hierarchy: 300,
                isDefault: true,
                permissions: allPermissions.filter(p => 
                    p.action === 'read' || p.action === 'create'
                ).map(p => p._id)
            }
        ];

        // Insert all roles
        await Role.insertMany(roles, { ordered: false });

        console.log(`✅ ${roles.length} roles seeded successfully`);
        
        // Count roles by category for summary
        const categoryCount = {};
        roles.forEach(role => {
            categoryCount[role.category] = (categoryCount[role.category] || 0) + 1;
        });
        
        console.log('\n📊 Roles by Category:');
        Object.entries(categoryCount).forEach(([category, count]) => {
            console.log(`   ${category}: ${count} roles`);
        });
        
    } catch (error) {
        console.error('Error seeding roles:', error);
        throw error;
    }
};

const seedRolesAndPermissions = async () => {
    try {
        console.log('🚀 Starting ERP roles and permissions seeding...');
        console.log('='.repeat(60));
        
        // Clear existing data (optional - comment out if you want to keep existing)
        // await Permission.deleteMany({});
        // await Role.deleteMany({});
        
        await seedPermissions();
        await seedRoles();
        
        console.log('='.repeat(60));
        console.log('✅ ERP Roles and Permissions seeding completed successfully');
        console.log('🎯 System ready for Phase 4 - Module Installation');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    }
};

// Run seeder if called directly
if (require.main === module) {
    require('dotenv').config();
    
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('📦 Connected to MongoDB');
            return seedRolesAndPermissions();
        })
        .then(() => {
            console.log('✨ Seeding complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seeding error:', error);
            process.exit(1);
        });
}

module.exports = seedRolesAndPermissions;