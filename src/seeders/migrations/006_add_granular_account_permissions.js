// src/seeders/migrations/006_add_granular_account_permissions.js
const mongoose = require('mongoose');
const Permission = require('../../models/permission.model');
const Role = require('../../models/role.model');
require('dotenv').config();

/**
 * Migration 006: Add Granular Account Permissions
 * 
 * This migration adds create, read, update, delete permissions for accounts
 * to match the granular permission checks in the account controller.
 */
const addGranularAccountPermissions = async () => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        console.log('\n🚀 Adding granular account permissions...');
        console.log('='.repeat(60));
        
        // Define granular account permissions
        const granularPermissions = [
            {
                name: 'finance.account.create',
                description: 'Create new accounts',
                module: 'finance',
                resource: 'account',
                action: 'create',
                isActive: true
            },
            {
                name: 'finance.account.read',
                description: 'View accounts',
                module: 'finance',
                resource: 'account',
                action: 'read',
                isActive: true
            },
            {
                name: 'finance.account.update',
                description: 'Update accounts',
                module: 'finance',
                resource: 'account',
                action: 'update',
                isActive: true
            },
            {
                name: 'finance.account.delete',
                description: 'Delete accounts',
                module: 'finance',
                resource: 'account',
                action: 'delete',
                isActive: true
            }
        ];
        
        // Add permissions if they don't exist
        const addedPermissions = [];
        for (const permData of granularPermissions) {
            const existing = await Permission.findOne({ name: permData.name });
            if (!existing) {
                const newPerm = await Permission.create([permData], { session });
                addedPermissions.push(permData.name);
                console.log(`   ✅ Added permission: ${permData.name}`);
            } else {
                console.log(`   ⏭️  Already exists: ${permData.name}`);
            }
        }
        
        // Get all permissions for role updates
        const allPermissions = await Permission.find({}).session(session);
        
        // Find or create Super Admin role
        let superAdminRole = await Role.findOne({ name: 'Super Administrator' }).session(session);
        
        if (!superAdminRole) {
            console.log('   ⚠️ Super Administrator role not found, creating...');
            superAdminRole = await Role.create([{
                name: 'Super Administrator',
                description: 'Full unrestricted system access',
                category: 'system',
                hierarchy: 1000,
                isDefault: true,
                permissions: []
            }], { session });
        }
        
        // Add new permissions to Super Admin if not already present
        const newPermissionIds = allPermissions
            .filter(p => granularPermissions.some(gp => gp.name === p.name))
            .map(p => p._id);
        
        const existingPermIds = superAdminRole.permissions.map(id => id.toString());
        const permsToAdd = newPermissionIds.filter(id => !existingPermIds.includes(id.toString()));
        
        if (permsToAdd.length > 0) {
            superAdminRole.permissions.push(...permsToAdd);
            await superAdminRole.save({ session });
            console.log(`   ✅ Added ${permsToAdd.length} permissions to Super Administrator`);
        } else {
            console.log('   ⏭️  Super Administrator already has all granular permissions');
        }
        
        // Also update Finance Manager role with these permissions
        const financeManager = await Role.findOne({ name: 'Finance Manager' }).session(session);
        if (financeManager) {
            const financeManagerExisting = financeManager.permissions.map(id => id.toString());
            const fmPermsToAdd = newPermissionIds.filter(id => !financeManagerExisting.includes(id.toString()));
            
            if (fmPermsToAdd.length > 0) {
                financeManager.permissions.push(...fmPermsToAdd);
                await financeManager.save({ session });
                console.log(`   ✅ Added ${fmPermsToAdd.length} permissions to Finance Manager`);
            } else {
                console.log('   ⏭️  Finance Manager already has granular permissions');
            }
        }
        
        // Update Finance Director role
        const financeDirector = await Role.findOne({ name: 'Finance Director' }).session(session);
        if (financeDirector) {
            const fdExisting = financeDirector.permissions.map(id => id.toString());
            const fdPermsToAdd = newPermissionIds.filter(id => !fdExisting.includes(id.toString()));
            
            if (fdPermsToAdd.length > 0) {
                financeDirector.permissions.push(...fdPermsToAdd);
                await financeDirector.save({ session });
                console.log(`   ✅ Added ${fdPermsToAdd.length} permissions to Finance Director`);
            } else {
                console.log('   ⏭️  Finance Director already has granular permissions');
            }
        }
        
        await session.commitTransaction();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Granular account permissions added successfully!');
        console.log(`   Added ${addedPermissions.length} new permissions`);
        console.log('   Updated Super Admin, Finance Manager, and Finance Director roles');
        
    } catch (error) {
        await session.abortTransaction();
        console.error('\n❌ Migration failed:', error);
        throw error;
    } finally {
        session.endSession();
    }
};

// Run migration if called directly
if (require.main === module) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('📦 Connected to MongoDB');
            return addGranularAccountPermissions();
        })
        .then(() => {
            console.log('\n✨ Migration 006 complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration error:', error);
            process.exit(1);
        });
}

module.exports = addGranularAccountPermissions;
