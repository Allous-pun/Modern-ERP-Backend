// src/seeders/migrations/011_add_budget_permissions.js
const mongoose = require('mongoose');
const Permission = require('../../models/permission.model');
const Role = require('../../models/role.model');
require('dotenv').config();

/**
 * Migration 011: Add Budget Permissions
 * 
 * This migration adds budget-specific permissions to the system
 */
async function addBudgetPermissions() {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        console.log('\n🚀 Migration 011: Adding Budget Permissions...');
        console.log('='.repeat(60));
        
        const budgetPermissions = [
            { name: 'finance.budget_view', description: 'View budgets', module: 'finance', resource: 'budget', action: 'view', isActive: true },
            { name: 'finance.budget_create', description: 'Create budgets', module: 'finance', resource: 'budget', action: 'create', isActive: true },
            { name: 'finance.budget_update', description: 'Update budgets', module: 'finance', resource: 'budget', action: 'update', isActive: true },
            { name: 'finance.budget_approve', description: 'Approve budgets', module: 'finance', resource: 'budget', action: 'approve', isActive: true }
        ];
        
        const addedPermissions = [];
        
        for (const permData of budgetPermissions) {
            const existing = await Permission.findOne({ name: permData.name }).session(session);
            if (!existing) {
                const newPerm = await Permission.create([permData], { session });
                addedPermissions.push(permData.name);
                console.log(`   ✅ Added permission: ${permData.name}`);
            } else {
                console.log(`   ⏭️  Already exists: ${permData.name}`);
            }
        }
        
        // Add permissions to Super Admin
        const superAdmin = await Role.findOne({ name: 'Super Administrator' }).session(session);
        if (superAdmin) {
            const newPerms = await Permission.find({ name: { $in: budgetPermissions.map(p => p.name) } }).session(session);
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
            const newPerms = await Permission.find({ name: { $in: ['finance.budget_view', 'finance.budget_create', 'finance.budget_update'] } }).session(session);
            const existingPermIds = financeManager.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                financeManager.permissions.push(...permsToAdd.map(p => p._id));
                await financeManager.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Finance Manager`);
            }
        }
        
        // Add to Budget Officer
        const budgetOfficer = await Role.findOne({ name: 'Budget Officer' }).session(session);
        if (budgetOfficer) {
            const newPerms = await Permission.find({ name: { $in: ['finance.budget_view', 'finance.budget_create', 'finance.budget_update'] } }).session(session);
            const existingPermIds = budgetOfficer.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                budgetOfficer.permissions.push(...permsToAdd.map(p => p._id));
                await budgetOfficer.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Budget Officer`);
            }
        }
        
        await session.commitTransaction();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration 011 completed successfully');
        console.log(`   Added ${addedPermissions.length} new permissions`);
        
    } catch (error) {
        await session.abortTransaction();
        console.error('\n❌ Migration 011 failed:', error);
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
            return addBudgetPermissions();
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

module.exports = addBudgetPermissions;
