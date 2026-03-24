// src/seeders/migrations/013_add_treasury_permissions.js
const mongoose = require('mongoose');
const Permission = require('../../models/permission.model');
const Role = require('../../models/role.model');
require('dotenv').config();

/**
 * Migration 013: Add Treasury Management Permissions
 */
async function addTreasuryPermissions() {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        console.log('\n🚀 Migration 013: Adding Treasury Permissions...');
        console.log('='.repeat(60));
        
        const treasuryPermissions = [
            { name: 'finance.bank_view', description: 'View bank accounts and transactions', module: 'finance', resource: 'bank', action: 'view', isActive: true },
            { name: 'finance.bank_create', description: 'Create bank accounts', module: 'finance', resource: 'bank', action: 'create', isActive: true },
            { name: 'finance.bank_update', description: 'Update bank accounts', module: 'finance', resource: 'bank', action: 'update', isActive: true },
            { name: 'finance.bank_reconcile', description: 'Reconcile bank accounts', module: 'finance', resource: 'bank', action: 'reconcile', isActive: true }
        ];
        
        const addedPermissions = [];
        
        for (const permData of treasuryPermissions) {
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
            const newPerms = await Permission.find({ name: { $in: treasuryPermissions.map(p => p.name) } }).session(session);
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
            const newPerms = await Permission.find({ name: { $in: ['finance.bank_view', 'finance.bank_create'] } }).session(session);
            const existingPermIds = financeManager.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                financeManager.permissions.push(...permsToAdd.map(p => p._id));
                await financeManager.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Finance Manager`);
            }
        }
        
        // Add to Treasurer role (if exists)
        let treasurer = await Role.findOne({ name: 'Treasury Manager' }).session(session);
        if (!treasurer) {
            // Create Treasury Manager role if it doesn't exist
            console.log('   Creating Treasury Manager role...');
            const treasuryPerms = await Permission.find({ name: { $in: treasuryPermissions.map(p => p.name) } }).session(session);
            treasurer = await Role.create([{
                name: 'Treasury Manager',
                description: 'Cash & banks management',
                category: 'finance',
                hierarchy: 750,
                isDefault: true,
                permissions: treasuryPerms.map(p => p._id)
            }], { session });
            console.log('   ✅ Created Treasury Manager role');
        } else {
            const newPerms = await Permission.find({ name: { $in: treasuryPermissions.map(p => p.name) } }).session(session);
            const existingPermIds = treasurer.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                treasurer.permissions.push(...permsToAdd.map(p => p._id));
                await treasurer.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Treasury Manager`);
            }
        }
        
        await session.commitTransaction();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration 013 completed successfully');
        console.log(`   Added ${addedPermissions.length} new treasury permissions`);
        
    } catch (error) {
        await session.abortTransaction();
        console.error('\n❌ Migration 013 failed:', error);
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
            return addTreasuryPermissions();
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

module.exports = addTreasuryPermissions;
