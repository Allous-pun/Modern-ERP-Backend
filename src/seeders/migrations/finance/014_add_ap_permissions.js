// src/seeders/migrations/finance/014_add_ap_permissions.js
const mongoose = require('mongoose');
const Permission = require('../../../models/permission.model');
const Role = require('../../../models/role.model');
require('dotenv').config();

/**
 * Migration 014: Add Accounts Payable Permissions
 */
async function addAPPermissions() {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        console.log('\n🚀 Migration 014: Adding Accounts Payable Permissions...');
        console.log('='.repeat(60));
        
        const apPermissions = [
            { name: 'finance.ap_invoice_view', description: 'View supplier invoices', module: 'finance', resource: 'ap_invoice', action: 'view', isActive: true },
            { name: 'finance.ap_invoice_create', description: 'Create supplier invoices', module: 'finance', resource: 'ap_invoice', action: 'create', isActive: true },
            { name: 'finance.ap_invoice_update', description: 'Update supplier invoices', module: 'finance', resource: 'ap_invoice', action: 'update', isActive: true },
            { name: 'finance.ap_invoice_approve', description: 'Approve supplier invoices', module: 'finance', resource: 'ap_invoice', action: 'approve', isActive: true },
            { name: 'finance.payment_create', description: 'Create payments', module: 'finance', resource: 'payment', action: 'create', isActive: true },
            { name: 'finance.payment_view', description: 'View payments', module: 'finance', resource: 'payment', action: 'view', isActive: true }
        ];
        
        const addedPermissions = [];
        
        for (const permData of apPermissions) {
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
            const newPerms = await Permission.find({ name: { $in: apPermissions.map(p => p.name) } }).session(session);
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
                name: { $in: ['finance.ap_invoice_view', 'finance.ap_invoice_create', 'finance.ap_invoice_update', 'finance.payment_view'] } 
            }).session(session);
            const existingPermIds = financeManager.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                financeManager.permissions.push(...permsToAdd.map(p => p._id));
                await financeManager.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Finance Manager`);
            }
        }
        
        // Add to Accounts Payable Officer role
        let apOfficer = await Role.findOne({ name: 'Accounts Payable Officer' }).session(session);
        if (!apOfficer) {
            console.log('   Creating Accounts Payable Officer role...');
            const apPerms = await Permission.find({ 
                name: { $in: ['finance.ap_invoice_view', 'finance.ap_invoice_create', 'finance.ap_invoice_update', 'finance.payment_create', 'finance.payment_view'] } 
            }).session(session);
            apOfficer = await Role.create([{
                name: 'Accounts Payable Officer',
                description: 'Supplier invoices and payments',
                category: 'finance',
                hierarchy: 600,
                isDefault: true,
                permissions: apPerms.map(p => p._id)
            }], { session });
            console.log('   ✅ Created Accounts Payable Officer role');
        } else {
            const newPerms = await Permission.find({ 
                name: { $in: ['finance.ap_invoice_view', 'finance.ap_invoice_create', 'finance.ap_invoice_update', 'finance.payment_create', 'finance.payment_view'] } 
            }).session(session);
            const existingPermIds = apOfficer.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                apOfficer.permissions.push(...permsToAdd.map(p => p._id));
                await apOfficer.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Accounts Payable Officer`);
            }
        }
        
        await session.commitTransaction();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration 014 completed successfully');
        console.log(`   Added ${addedPermissions.length} new permissions`);
        
    } catch (error) {
        await session.abortTransaction();
        console.error('\n❌ Migration 014 failed:', error);
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
            return addAPPermissions();
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

module.exports = addAPPermissions;
