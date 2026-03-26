// src/seeders/migrations/finance/015_add_ar_permissions.js
const mongoose = require('mongoose');
const Permission = require('../../../models/permission.model');
const Role = require('../../../models/role.model');
require('dotenv').config();

/**
 * Migration 015: Add Accounts Receivable Permissions
 */
async function addARPermissions() {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        console.log('\n🚀 Migration 015: Adding Accounts Receivable Permissions...');
        console.log('='.repeat(60));
        
        const arPermissions = [
            { name: 'finance.ar_invoice_view', description: 'View customer invoices', module: 'finance', resource: 'ar_invoice', action: 'view', isActive: true },
            { name: 'finance.ar_invoice_create', description: 'Create customer invoices', module: 'finance', resource: 'ar_invoice', action: 'create', isActive: true },
            { name: 'finance.ar_invoice_update', description: 'Update customer invoices', module: 'finance', resource: 'ar_invoice', action: 'update', isActive: true },
            { name: 'finance.ar_invoice_approve', description: 'Approve customer invoices', module: 'finance', resource: 'ar_invoice', action: 'approve', isActive: true },
            { name: 'finance.receipt_create', description: 'Create receipts', module: 'finance', resource: 'receipt', action: 'create', isActive: true },
            { name: 'finance.receipt_view', description: 'View receipts', module: 'finance', resource: 'receipt', action: 'view', isActive: true }
        ];
        
        const addedPermissions = [];
        
        for (const permData of arPermissions) {
            const existing = await Permission.findOne({ name: permData.name }).session(session);
            if (!existing) {
                await Permission.create([permData], { session });
                addedPermissions.push(permData.name);
                console.log(`   ✅ Added permission: ${permData.name}`);
            } else {
                console.log(`   ⏭️  Already exists: ${permData.name}`);
            }
        }
        
        // Add to Super Admin
        const superAdmin = await Role.findOne({ name: 'Super Administrator' }).session(session);
        if (superAdmin) {
            const newPerms = await Permission.find({ name: { $in: arPermissions.map(p => p.name) } }).session(session);
            const existingPermIds = superAdmin.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                superAdmin.permissions.push(...permsToAdd.map(p => p._id));
                await superAdmin.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Super Administrator`);
            }
        }
        
        // Add to Finance Manager
        const financeManager = await Role.findOne({ name: 'Finance Manager' }).session(session);
        if (financeManager) {
            const newPerms = await Permission.find({ 
                name: { $in: ['finance.ar_invoice_view', 'finance.ar_invoice_create', 'finance.ar_invoice_update', 'finance.receipt_view'] } 
            }).session(session);
            const existingPermIds = financeManager.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                financeManager.permissions.push(...permsToAdd.map(p => p._id));
                await financeManager.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Finance Manager`);
            }
        }
        
        // Add to Accounts Receivable Officer role
        let arOfficer = await Role.findOne({ name: 'Accounts Receivable Officer' }).session(session);
        if (!arOfficer) {
            console.log('   Creating Accounts Receivable Officer role...');
            const arPerms = await Permission.find({ 
                name: { $in: ['finance.ar_invoice_view', 'finance.ar_invoice_create', 'finance.ar_invoice_update', 'finance.receipt_create', 'finance.receipt_view'] } 
            }).session(session);
            arOfficer = await Role.create([{
                name: 'Accounts Receivable Officer',
                description: 'Customer invoices and receipts',
                category: 'finance',
                hierarchy: 600,
                isDefault: true,
                permissions: arPerms.map(p => p._id)
            }], { session });
            console.log('   ✅ Created Accounts Receivable Officer role');
        } else {
            const newPerms = await Permission.find({ 
                name: { $in: ['finance.ar_invoice_view', 'finance.ar_invoice_create', 'finance.ar_invoice_update', 'finance.receipt_create', 'finance.receipt_view'] } 
            }).session(session);
            const existingPermIds = arOfficer.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                arOfficer.permissions.push(...permsToAdd.map(p => p._id));
                await arOfficer.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Accounts Receivable Officer`);
            }
        }
        
        await session.commitTransaction();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration 015 completed successfully');
        console.log(`   Added ${addedPermissions.length} new permissions`);
        
    } catch (error) {
        await session.abortTransaction();
        console.error('\n❌ Migration 015 failed:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

// Run if called directly
if (require.main === module) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('📦 Connected to MongoDB');
            return addARPermissions();
        })
        .then(() => {
            console.log('\n✨ Migration complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration error:', error);
            process.exit(1);
        });
}

module.exports = addARPermissions;
