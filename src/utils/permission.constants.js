// src/utils/permission.constants.js
// Centralized permission definitions for the entire ERP system

const PERMISSIONS = {
    // 🔐 SYSTEM & SECURITY
    SYSTEM: {
        MANAGE_USERS: 'system.users_manage',
        VIEW_USERS: 'system.users_view',
        MANAGE_ROLES: 'system.roles_manage',
        VIEW_ROLES: 'system.roles_view',
        MANAGE_PERMISSIONS: 'system.permissions_manage',
        VIEW_AUDIT_LOGS: 'system.audit_view',
        MANAGE_BACKUPS: 'system.backups_manage',
        VIEW_SYSTEM_CONFIG: 'system.config_view',
        MANAGE_SYSTEM_CONFIG: 'system.config_manage',
        MANAGE_WORKFLOW: 'system.workflow_manage',
        VIEW_WORKFLOW: 'system.workflow_view',
        MANAGE_MODULES: 'system.modules_manage',
        VIEW_MODULES: 'system.modules_view'
    },
    
    SECURITY: {
        VIEW_SECURITY_POLICIES: 'security.policies_view',
        MANAGE_SECURITY_POLICIES: 'security.policies_manage',
        VIEW_AUDIT_TRAIL: 'security.audit_view',
        PERFORM_SECURITY_AUDIT: 'security.audit_perform',
        MANAGE_ENCRYPTION: 'security.encryption_manage',
        VIEW_COMPLIANCE: 'security.compliance_view',
        MANAGE_COMPLIANCE: 'security.compliance_manage',
        VIEW_RISK: 'security.risk_view',
        MANAGE_RISK: 'security.risk_manage',
        VIEW_MITIGATION: 'security.mitigation_view',
        MANAGE_MITIGATION: 'security.mitigation_manage',
        VIEW_PRIVACY: 'security.privacy_view',
        MANAGE_PRIVACY: 'security.privacy_manage',
        VIEW_DATA: 'security.data_view',
        MANAGE_DATA: 'security.data_manage'
    },

    // 💰 FINANCE MODULE
    FINANCE: {
        // General Ledger
        VIEW_CHART_OF_ACCOUNTS: 'finance.chart_of_accounts_view',
        MANAGE_CHART_OF_ACCOUNTS: 'finance.chart_of_accounts_manage',
        CREATE_JOURNAL_ENTRY: 'finance.journal_create',
        VIEW_JOURNAL_ENTRY: 'finance.journal_view',
        APPROVE_JOURNAL_ENTRY: 'finance.journal_approve',
        POST_JOURNAL_ENTRY: 'finance.journal_post',
        VIEW_LEDGER: 'finance.ledger_view',
        MANAGE_LEDGER: 'finance.ledger_manage',
        VIEW_ACCOUNT: 'finance.account_view',
        MANAGE_ACCOUNT: 'finance.account_manage',
        
        // Accounts Payable
        CREATE_SUPPLIER_INVOICE: 'finance.ap_invoice_create',
        VIEW_SUPPLIER_INVOICE: 'finance.ap_invoice_view',
        APPROVE_SUPPLIER_INVOICE: 'finance.ap_invoice_approve',
        PROCESS_PAYMENT: 'finance.payment_process',
        APPROVE_PAYMENT: 'finance.payment_approve',
        VIEW_PAYMENT: 'finance.payment_view',
        
        // Accounts Receivable
        CREATE_CUSTOMER_INVOICE: 'finance.ar_invoice_create',
        VIEW_CUSTOMER_INVOICE: 'finance.ar_invoice_view',
        APPROVE_CUSTOMER_INVOICE: 'finance.ar_invoice_approve',
        PROCESS_RECEIPT: 'finance.receipt_process',
        APPROVE_RECEIPT: 'finance.receipt_approve',
        VIEW_RECEIPT: 'finance.receipt_view',
        
        // Invoicing & Billing
        CREATE_INVOICE: 'finance.invoice_create',
        VIEW_INVOICE: 'finance.invoice_view',
        APPROVE_INVOICE: 'finance.invoice_approve',
        MANAGE_BILLING: 'finance.billing_manage',
        VIEW_BILLING: 'finance.billing_view',
        
        // Financial Reports
        VIEW_BALANCE_SHEET: 'finance.balance_sheet_view',
        VIEW_INCOME_STATEMENT: 'finance.income_statement_view',
        VIEW_CASH_FLOW: 'finance.cash_flow_view',
        VIEW_TAX_REPORTS: 'finance.tax_reports_view',
        EXPORT_FINANCIAL_REPORTS: 'finance.reports_export',
        
        // Budgeting
        VIEW_BUDGET: 'finance.budget_view',
        CREATE_BUDGET: 'finance.budget_create',
        APPROVE_BUDGET: 'finance.budget_approve',
        MANAGE_BUDGET: 'finance.budget_manage',
        
        // Treasury
        VIEW_BANK_ACCOUNTS: 'finance.bank_view',
        MANAGE_BANK_ACCOUNTS: 'finance.bank_manage',
        RECONCILE_BANK: 'finance.bank_reconcile',
        VIEW_CASH_POSITION: 'finance.cash_view',
        MANAGE_CASH: 'finance.cash_manage',
        
        // Assets
        VIEW_ASSET: 'finance.asset_view',
        CREATE_ASSET: 'finance.asset_create',
        UPDATE_ASSET: 'finance.asset_update',
        MANAGE_ASSET: 'finance.asset_manage',
        
        // Payroll
        VIEW_PAYROLL: 'finance.payroll_view',
        PROCESS_PAYROLL: 'finance.payroll_process',
        APPROVE_PAYROLL: 'finance.payroll_approve',
        MANAGE_PAYROLL: 'finance.payroll_manage',
        
        // Tax
        VIEW_TAX: 'finance.tax_view',
        MANAGE_TAX: 'finance.tax_manage',
        APPROVE_TAX: 'finance.tax_approve',
        
        // Cost & Budget
        VIEW_COST: 'finance.cost_view',
        MANAGE_COST: 'finance.cost_manage'
    },

    // 👥 HUMAN RESOURCES
    HR: {
        // Employee Management
        VIEW_EMPLOYEES: 'hr.employees_view',
        CREATE_EMPLOYEE: 'hr.employees_create',
        UPDATE_EMPLOYEE: 'hr.employees_update',
        DELETE_EMPLOYEE: 'hr.employees_delete',
        IMPORT_EMPLOYEES: 'hr.employees_import',
        EXPORT_EMPLOYEES: 'hr.employees_export',
        
        // Recruitment
        VIEW_JOBS: 'hr.jobs_view',
        CREATE_JOB: 'hr.jobs_create',
        MANAGE_APPLICATIONS: 'hr.applications_manage',
        INTERVIEW_SCHEDULE: 'hr.interview_schedule',
        
        // Attendance & Leave
        VIEW_ATTENDANCE: 'hr.attendance_view',
        MARK_ATTENDANCE: 'hr.attendance_mark',
        MANAGE_ATTENDANCE: 'hr.attendance_manage',
        VIEW_LEAVE: 'hr.leave_view',
        APPLY_LEAVE: 'hr.leave_apply',
        APPROVE_LEAVE: 'hr.leave_approve',
        MANAGE_SHIFT: 'hr.shift_manage',
        VIEW_SHIFT: 'hr.shift_view',
        
        // Payroll
        VIEW_PAYROLL: 'hr.payroll_view',
        PROCESS_PAYROLL: 'hr.payroll_process',
        APPROVE_PAYROLL: 'hr.payroll_approve',
        VIEW_PAYSLIPS: 'hr.payslips_view',
        GENERATE_PAYSLIP: 'hr.payslips_generate',
        
        // Performance
        VIEW_PERFORMANCE: 'hr.performance_view',
        CREATE_REVIEW: 'hr.review_create',
        SUBMIT_REVIEW: 'hr.review_submit',
        APPROVE_REVIEW: 'hr.review_approve',
        
        // Training
        VIEW_TRAINING: 'hr.training_view',
        CREATE_TRAINING: 'hr.training_create',
        ENROLL_EMPLOYEE: 'hr.training_enroll',
        TRACK_PROGRESS: 'hr.training_track',
        
        // Compensation & Benefits
        VIEW_COMPENSATION: 'hr.compensation_view',
        MANAGE_COMPENSATION: 'hr.compensation_manage',
        VIEW_BENEFITS: 'hr.benefits_view',
        MANAGE_BENEFITS: 'hr.benefits_manage'
    },

    // 🛒 SALES & CRM
    SALES: {
        // Leads & Opportunities
        VIEW_LEADS: 'sales.leads_view',
        CREATE_LEAD: 'sales.leads_create',
        UPDATE_LEAD: 'sales.leads_update',
        CONVERT_LEAD: 'sales.leads_convert',
        VIEW_OPPORTUNITIES: 'sales.opportunities_view',
        MANAGE_OPPORTUNITIES: 'sales.opportunities_manage',
        
        // Customers
        VIEW_CUSTOMERS: 'sales.customers_view',
        CREATE_CUSTOMER: 'sales.customers_create',
        UPDATE_CUSTOMER: 'sales.customers_update',
        VIEW_ACCOUNTS: 'sales.accounts_view',
        MANAGE_ACCOUNTS: 'sales.accounts_manage',
        
        // Quotes & Orders
        CREATE_QUOTE: 'sales.quote_create',
        VIEW_QUOTE: 'sales.quote_view',
        APPROVE_QUOTE: 'sales.quote_approve',
        CREATE_SALES_ORDER: 'sales.order_create',
        VIEW_SALES_ORDER: 'sales.order_view',
        APPROVE_SALES_ORDER: 'sales.order_approve',
        
        // Sales Reports
        VIEW_SALES_REPORTS: 'sales.reports_view',
        VIEW_COMMISSION: 'sales.commission_view',
        VIEW_TARGETS: 'sales.targets_view',
        
        // CRM
        VIEW_CRM: 'crm.data_view',
        MANAGE_CRM: 'crm.data_manage',
        
        // Partners
        VIEW_PARTNERS: 'sales.partners_view',
        MANAGE_PARTNERS: 'sales.partners_manage',
        
        // Pricing
        VIEW_PRICING: 'sales.pricing_view',
        MANAGE_PRICING: 'sales.pricing_manage',
        VIEW_PRICE: 'sales.price_view',
        MANAGE_PRICE: 'sales.price_manage',
        
        // Support
        VIEW_SUPPORT: 'sales.support_view',
        MANAGE_SUPPORT: 'sales.support_manage',
        VIEW_TICKET: 'sales.ticket_view',
        CREATE_TICKET: 'sales.ticket_create',
        UPDATE_TICKET: 'sales.ticket_update',
        
        // Marketing
        VIEW_CAMPAIGN: 'sales.campaign_view',
        MANAGE_CAMPAIGN: 'sales.campaign_manage',
        VIEW_MARKETING: 'sales.marketing_view',
        MANAGE_MARKETING: 'sales.marketing_manage',
        VIEW_DIGITAL: 'sales.digital_view',
        MANAGE_DIGITAL: 'sales.digital_manage'
    },

    // 📦 PROCUREMENT & INVENTORY
    PROCUREMENT: {
        // Vendors
        VIEW_VENDORS: 'procurement.vendors_view',
        CREATE_VENDOR: 'procurement.vendors_create',
        UPDATE_VENDOR: 'procurement.vendors_update',
        APPROVE_VENDOR: 'procurement.vendors_approve',
        VIEW_SUPPLIERS: 'procurement.suppliers_view',
        MANAGE_SUPPLIERS: 'procurement.suppliers_manage',
        
        // Purchase Orders
        CREATE_PO: 'procurement.po_create',
        VIEW_PO: 'procurement.po_view',
        APPROVE_PO: 'procurement.po_approve',
        RECEIVE_PO: 'procurement.po_receive',
        VIEW_RFQ: 'procurement.rfq_view',
        MANAGE_RFQ: 'procurement.rfq_manage',
        
        // Inventory
        VIEW_INVENTORY: 'procurement.inventory_view',
        ADJUST_INVENTORY: 'procurement.inventory_adjust',
        TRANSFER_INVENTORY: 'procurement.inventory_transfer',
        COUNT_INVENTORY: 'procurement.inventory_count',
        VIEW_STOCK: 'procurement.stock_view',
        MANAGE_STOCK: 'procurement.stock_manage',
        
        // Warehouse
        VIEW_WAREHOUSE: 'procurement.warehouse_view',
        MANAGE_WAREHOUSE: 'procurement.warehouse_manage',
        RECEIVE_GOODS: 'procurement.goods_receive',
        SHIP_GOODS: 'procurement.goods_ship',
        
        // Supply Chain
        VIEW_SUPPLY: 'procurement.supply_view',
        MANAGE_SUPPLY: 'procurement.supply_manage',
        VIEW_DEMAND: 'procurement.demand_view',
        MANAGE_DEMAND: 'procurement.demand_manage',
        VIEW_FORECAST: 'procurement.forecast_view',
        MANAGE_FORECAST: 'procurement.forecast_manage',
        
        // Distribution
        VIEW_DISTRIBUTION: 'procurement.distribution_view',
        MANAGE_DISTRIBUTION: 'procurement.distribution_manage',
        VIEW_SHIPPING: 'procurement.shipping_view',
        MANAGE_SHIPPING: 'procurement.shipping_manage',
        
        // Logistics
        VIEW_LOGISTICS: 'procurement.logistics_view',
        MANAGE_LOGISTICS: 'procurement.logistics_manage',
        VIEW_TRANSPORT: 'procurement.transport_view',
        MANAGE_TRANSPORT: 'procurement.transport_manage',
        
        // Quality
        VIEW_QUALITY: 'procurement.quality_view',
        MANAGE_QUALITY: 'procurement.quality_manage',
        VIEW_INSPECTION: 'procurement.inspection_view',
        PERFORM_INSPECTION: 'procurement.inspection_perform'
    },

    // 🏭 MANUFACTURING
    MANUFACTURING: {
        // Production
        VIEW_PRODUCTION_ORDERS: 'manufacturing.production_view',
        CREATE_PRODUCTION_ORDER: 'manufacturing.production_create',
        SCHEDULE_PRODUCTION: 'manufacturing.production_schedule',
        REPORT_PRODUCTION: 'manufacturing.production_report',
        VIEW_PRODUCTION: 'manufacturing.production_view',
        MANAGE_PRODUCTION: 'manufacturing.production_manage',
        
        // Bills of Materials
        VIEW_BOM: 'manufacturing.bom_view',
        CREATE_BOM: 'manufacturing.bom_create',
        UPDATE_BOM: 'manufacturing.bom_update',
        
        // Quality Control
        VIEW_QUALITY_CHECKS: 'manufacturing.quality_view',
        PERFORM_QUALITY_CHECK: 'manufacturing.quality_perform',
        APPROVE_QUALITY: 'manufacturing.quality_approve',
        
        // Maintenance
        VIEW_MAINTENANCE: 'manufacturing.maintenance_view',
        SCHEDULE_MAINTENANCE: 'manufacturing.maintenance_schedule',
        PERFORM_MAINTENANCE: 'manufacturing.maintenance_perform',
        
        // Planning
        VIEW_PLAN: 'manufacturing.plan_view',
        CREATE_PLAN: 'manufacturing.plan_create',
        MANAGE_SCHEDULE: 'manufacturing.schedule_manage'
    },

    // 📊 ANALYTICS & REPORTS
    ANALYTICS: {
        VIEW_DASHBOARDS: 'analytics.dashboards_view',
        CREATE_DASHBOARD: 'analytics.dashboards_create',
        VIEW_REPORTS: 'analytics.reports_view',
        CREATE_REPORT: 'analytics.reports_create',
        EXPORT_DATA: 'analytics.data_export',
        SCHEDULE_REPORTS: 'analytics.reports_schedule'
    },

    // 📋 PROJECTS
    PROJECTS: {
        VIEW_PROJECTS: 'projects.projects_view',
        CREATE_PROJECT: 'projects.projects_create',
        UPDATE_PROJECT: 'projects.projects_update',
        APPROVE_PROJECT: 'projects.projects_approve',
        VIEW_TASK: 'projects.task_view',
        CREATE_TASK: 'projects.task_create',
        UPDATE_TASK: 'projects.task_update',
        VIEW_OPERATIONS: 'projects.operations_view',
        MANAGE_OPERATIONS: 'projects.operations_manage',
        VIEW_PROCESS: 'projects.process_view',
        MANAGE_PROCESS: 'projects.process_manage',
        VIEW_FIELD: 'projects.field_view',
        MANAGE_FIELD: 'projects.field_manage',
        VIEW_SERVICE: 'projects.service_view',
        MANAGE_SERVICE: 'projects.service_manage',
        VIEW_DELIVERY: 'projects.delivery_view',
        MANAGE_DELIVERY: 'projects.delivery_manage'
    },

    // 🛒 POS (POINT OF SALE)
    POS: {
        // Transactions
        CREATE_SALE: 'pos.sale_create',
        VIEW_SALE: 'pos.sale_view',
        RETURN_SALE: 'pos.sale_return',
        VOID_SALE: 'pos.sale_void',
        
        // Cash Management
        OPEN_REGISTER: 'pos.register_open',
        CLOSE_REGISTER: 'pos.register_close',
        COUNT_CASH: 'pos.cash_count',
        RECONCILE_REGISTER: 'pos.register_reconcile',
        
        // Products & Pricing
        SCAN_PRODUCT: 'pos.product_scan',
        APPLY_DISCOUNT: 'pos.discount_apply',
        OVERRIDE_PRICE: 'pos.price_override',
        
        // Customers
        CREATE_CUSTOMER: 'pos.customer_create',
        APPLY_LOYALTY: 'pos.loyalty_apply',
        
        // Reports
        VIEW_SALES_REPORT: 'pos.report_sales_view',
        VIEW_CASH_REPORT: 'pos.report_cash_view',
        VIEW_PRODUCT_REPORT: 'pos.report_product_view',
        
        // End of Day
        RUN_X_READ: 'pos.x_read',
        RUN_Z_READ: 'pos.z_read',
        SUBMIT_END_OF_DAY: 'pos.end_of_day'
    },

    // 🏥 INDUSTRY - HEALTHCARE (Placeholder for future)
    HEALTHCARE: {
        // Will be expanded when healthcare module is built
        VIEW_PATIENT: 'healthcare.patient_view',
        MANAGE_PATIENT: 'healthcare.patient_manage',
        VIEW_MEDICAL_RECORD: 'healthcare.medical_record_view',
        MANAGE_MEDICAL_RECORD: 'healthcare.medical_record_manage'
    },

    // 🎓 INDUSTRY - EDUCATION (Placeholder for future)
    EDUCATION: {
        // Will be expanded when education module is built
        VIEW_STUDENT: 'education.student_view',
        MANAGE_STUDENT: 'education.student_manage',
        VIEW_COURSE: 'education.course_view',
        MANAGE_COURSE: 'education.course_manage'
    },

    // 🏨 INDUSTRY - HOSPITALITY (Placeholder for future)
    HOSPITALITY: {
        // Will be expanded when hospitality module is built
        VIEW_BOOKING: 'hospitality.booking_view',
        MANAGE_BOOKING: 'hospitality.booking_manage',
        VIEW_ROOM: 'hospitality.room_view',
        MANAGE_ROOM: 'hospitality.room_manage'
    },

    // 🛍️ INDUSTRY - RETAIL (Placeholder for future)
    RETAIL: {
        // Will be expanded when retail module is built
        VIEW_PRODUCT: 'retail.product_view',
        MANAGE_PRODUCT: 'retail.product_manage',
        VIEW_INVENTORY: 'retail.inventory_view',
        MANAGE_INVENTORY: 'retail.inventory_manage'
    },

    // 🔌 EXTERNAL ACCESS
    EXTERNAL: {
        VIEW_ORDERS: 'external.orders_view',
        CREATE_ORDER: 'external.orders_create',
        VIEW_INVOICES: 'external.invoices_view',
        VIEW_PO: 'external.po_view',
        VIEW_RFQ: 'external.rfq_view',
        VIEW_TASK: 'external.task_view',
        VIEW_DATA: 'external.data_view'
    }
};

// Permission categories for organization
const PERMISSION_CATEGORIES = {
    SYSTEM: 'system',
    SECURITY: 'security',
    FINANCE: 'finance',
    HR: 'hr',
    SALES: 'sales',
    CRM: 'crm',
    PROCUREMENT: 'procurement',
    MANUFACTURING: 'manufacturing',
    ANALYTICS: 'analytics',
    PROJECTS: 'projects',
    POS: 'pos',
    HEALTHCARE: 'healthcare',
    EDUCATION: 'education',
    HOSPITALITY: 'hospitality',
    RETAIL: 'retail',
    EXTERNAL: 'external'
};

// Helper function to get all permission strings
const getAllPermissionStrings = () => {
    const permissions = [];
    for (const module in PERMISSIONS) {
        for (const key in PERMISSIONS[module]) {
            permissions.push(PERMISSIONS[module][key]);
        }
    }
    return permissions;
};

// Helper function to get permissions by module
const getPermissionsByModule = (moduleName) => {
    const modulePermissions = [];
    for (const key in PERMISSIONS[moduleName]) {
        modulePermissions.push(PERMISSIONS[moduleName][key]);
    }
    return modulePermissions;
};

module.exports = {
    PERMISSIONS,
    PERMISSION_CATEGORIES,
    getAllPermissionStrings,
    getPermissionsByModule
};