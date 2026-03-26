// src/seeders/migrations/finance/018_add_asset_permissions.js
const mongoose = require('mongoose');
const Permission = require('../../../models/permission.model');
const Role = require('../../../models/role.model');
require('dotenv').config();

/**
 * Migration 018: Add Fixed Assets Permissions
 */
async function addAssetPermissions() {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        console.log('\n🚀 Migration 018: Adding Fixed Assets Permissions...');
        console.log('='.repeat(60));
        
        const assetPermissions = [
            { name: 'finance.asset_view', description: 'View fixed assets', module: 'finance', resource: 'asset', action: 'view', isActive: true },
            { name: 'finance.asset_create', description: 'Create fixed assets', module: 'finance', resource: 'asset', action: 'create', isActive: true },
            { name: 'finance.asset_update', description: 'Update fixed assets', module: 'finance', resource: 'asset', action: 'update', isActive: true },
            { name: 'finance.asset_delete', description: 'Delete/dispose fixed assets', module: 'finance', resource: 'asset', action: 'delete', isActive: true }
        ];
        
        const addedPermissions = [];
        
        for (const permData of assetPermissions) {
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
            const newPerms = await Permission.find({ name: { $in: assetPermissions.map(p => p.name) } }).session(session);
            const existingPermIds = superAdmin.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                superAdmin.permissions.push(...permsToAdd.map(p => p._id));
                await superAdmin.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Super Administrator`);
            }
        }
        
        // Add to Fixed Assets Manager role
        let assetManager = await Role.findOne({ name: 'Fixed Assets Manager' }).session(session);
        if (!assetManager) {
            console.log('   Creating Fixed Assets Manager role...');
            const assetPerms = await Permission.find({ 
                name: { $in: ['finance.asset_view', 'finance.asset_create', 'finance.asset_update'] } 
            }).session(session);
            assetManager = await Role.create([{
                name: 'Fixed Assets Manager',
                description: 'Asset lifecycle management',
                category: 'finance',
                hierarchy: 600,
                isDefault: true,
                permissions: assetPerms.map(p => p._id)
            }], { session });
            console.log('   ✅ Created Fixed Assets Manager role');
        } else {
            const newPerms = await Permission.find({ 
                name: { $in: ['finance.asset_view', 'finance.asset_create', 'finance.asset_update', 'finance.asset_delete'] } 
            }).session(session);
            const existingPermIds = assetManager.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                assetManager.permissions.push(...permsToAdd.map(p => p._id));
                await assetManager.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Fixed Assets Manager`);
            }
        }
        
        // Add to Finance Manager (view only)
        const financeManager = await Role.findOne({ name: 'Finance Manager' }).session(session);
        if (financeManager) {
            const viewPerm = await Permission.findOne({ name: 'finance.asset_view' }).session(session);
            if (viewPerm) {
                const existing = financeManager.permissions.map(id => id.toString());
                if (!existing.includes(viewPerm._id.toString())) {
                    financeManager.permissions.push(viewPerm._id);
                    await financeManager.save({ session });
                    console.log('   ✅ Added finance.asset_view to Finance Manager');
                }
            }
        }
        
        await session.commitTransaction();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration 018 completed successfully');
        console.log(`   Added ${addedPermissions.length} new permissions`);
        
    } catch (error) {
        await session.abortTransaction();
        console.error('\n❌ Migration 018 failed:', error);
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
            return addAssetPermissions();
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

module.exports = addAssetPermissions;
