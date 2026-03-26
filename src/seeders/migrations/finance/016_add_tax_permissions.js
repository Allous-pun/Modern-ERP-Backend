// src/seeders/migrations/finance/016_add_tax_permissions.js
const mongoose = require('mongoose');
const Permission = require('../../../models/permission.model');
const Role = require('../../../models/role.model');
require('dotenv').config();

/**
 * Migration 016: Add Tax Management Permissions
 */
async function addTaxPermissions() {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        console.log('\n🚀 Migration 016: Adding Tax Management Permissions...');
        console.log('='.repeat(60));
        
        const taxPermissions = [
            { name: 'finance.tax_view', description: 'View tax rates and returns', module: 'finance', resource: 'tax', action: 'view', isActive: true },
            { name: 'finance.tax_create', description: 'Create tax rates and returns', module: 'finance', resource: 'tax', action: 'create', isActive: true },
            { name: 'finance.tax_update', description: 'Update tax rates', module: 'finance', resource: 'tax', action: 'update', isActive: true },
            { name: 'finance.tax_approve', description: 'Approve/file tax returns', module: 'finance', resource: 'tax', action: 'approve', isActive: true }
        ];
        
        const addedPermissions = [];
        
        for (const permData of taxPermissions) {
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
            const newPerms = await Permission.find({ name: { $in: taxPermissions.map(p => p.name) } }).session(session);
            const existingPermIds = superAdmin.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                superAdmin.permissions.push(...permsToAdd.map(p => p._id));
                await superAdmin.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Super Administrator`);
            }
        }
        
        // Add to Tax Manager role
        let taxManager = await Role.findOne({ name: 'Tax Manager' }).session(session);
        if (!taxManager) {
            console.log('   Creating Tax Manager role...');
            const taxPerms = await Permission.find({ 
                name: { $in: ['finance.tax_view', 'finance.tax_create', 'finance.tax_update', 'finance.tax_approve'] } 
            }).session(session);
            taxManager = await Role.create([{
                name: 'Tax Manager',
                description: 'Tax compliance and reporting',
                category: 'finance',
                hierarchy: 750,
                isDefault: true,
                permissions: taxPerms.map(p => p._id)
            }], { session });
            console.log('   ✅ Created Tax Manager role');
        } else {
            const newPerms = await Permission.find({ 
                name: { $in: ['finance.tax_view', 'finance.tax_create', 'finance.tax_update', 'finance.tax_approve'] } 
            }).session(session);
            const existingPermIds = taxManager.permissions.map(id => id.toString());
            const permsToAdd = newPerms.filter(p => !existingPermIds.includes(p._id.toString()));
            
            if (permsToAdd.length > 0) {
                taxManager.permissions.push(...permsToAdd.map(p => p._id));
                await taxManager.save({ session });
                console.log(`   ✅ Added ${permsToAdd.length} permissions to Tax Manager`);
            }
        }
        
        await session.commitTransaction();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration 016 completed successfully');
        console.log(`   Added ${addedPermissions.length} new permissions`);
        
    } catch (error) {
        await session.abortTransaction();
        console.error('\n❌ Migration 016 failed:', error);
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
            return addTaxPermissions();
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

module.exports = addTaxPermissions;
