// src/seeders/migrations/finance/017_add_cost_permissions.js
const mongoose = require('mongoose');
const Permission = require('../../../models/permission.model');
const Role = require('../../../models/role.model');
require('dotenv').config();

/**
 * Migration 017: Add Cost Accounting Permissions
 */
async function addCostPermissions() {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        console.log('\n🚀 Migration 017: Adding Cost Accounting Permissions...');
        console.log('='.repeat(60));
        
        const costPermissions = [
            { name: 'finance.cost_view', description: 'View cost centers and allocations', module: 'finance', resource: 'cost', action: 'view', isActive: true },
            { name: 'finance.cost_create', description: 'Create cost centers and allocations', module: 'finance', resource: 'cost', action: 'create', isActive: true },
            { name: 'finance.cost_update', description: 'Update cost centers', module: 'finance', resource: 'cost', action: 'update', isActive: true }
        ];
        
        const addedPermissions = [];
        
        for (const permData of costPermissions) {
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
            const newPerms = await Permission.find({ name: { $in: costPermissions.map(p => p.name) } }).session(session);
            const existingPermIds = superAdmin.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                superAdmin.permissions.push(...permsToAdd.map(p => p._id));
                await superAdmin.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Super Administrator`);
            }
        }
        
        // Add to Cost Accountant role
        let costAccountant = await Role.findOne({ name: 'Cost Accountant' }).session(session);
        if (!costAccountant) {
            console.log('   Creating Cost Accountant role...');
            const costPerms = await Permission.find({ 
                name: { $in: ['finance.cost_view', 'finance.cost_create', 'finance.cost_update'] } 
            }).session(session);
            costAccountant = await Role.create([{
                name: 'Cost Accountant',
                description: 'Cost tracking and allocation',
                category: 'finance',
                hierarchy: 650,
                isDefault: true,
                permissions: costPerms.map(p => p._id)
            }], { session });
            console.log('   ✅ Created Cost Accountant role');
        } else {
            const newPerms = await Permission.find({ 
                name: { $in: ['finance.cost_view', 'finance.cost_create', 'finance.cost_update'] } 
            }).session(session);
            const existingPermIds = costAccountant.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                costAccountant.permissions.push(...permsToAdd.map(p => p._id));
                await costAccountant.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Cost Accountant`);
            }
        }
        
        // Add to Finance Manager
        const financeManager = await Role.findOne({ name: 'Finance Manager' }).session(session);
        if (financeManager) {
            const viewPerm = await Permission.findOne({ name: 'finance.cost_view' }).session(session);
            if (viewPerm) {
                const existing = financeManager.permissions.map(id => id.toString());
                if (!existing.includes(viewPerm._id.toString())) {
                    financeManager.permissions.push(viewPerm._id);
                    await financeManager.save({ session });
                    console.log('   ✅ Added finance.cost_view to Finance Manager');
                }
            }
        }
        
        await session.commitTransaction();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration 017 completed successfully');
        console.log(`   Added ${addedPermissions.length} new permissions`);
        
    } catch (error) {
        await session.abortTransaction();
        console.error('\n❌ Migration 017 failed:', error);
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
            return addCostPermissions();
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

module.exports = addCostPermissions;
