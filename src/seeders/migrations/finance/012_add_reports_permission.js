// src/seeders/migrations/012_add_reports_permission.js
const mongoose = require('mongoose');
const Permission = require('../../models/permission.model');
const Role = require('../../models/role.model');
require('dotenv').config();

/**
 * Migration 012: Add Reports Permissions
 */
async function addReportsPermissions() {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        console.log('\n🚀 Migration 012: Adding Reports Permissions...');
        console.log('='.repeat(60));
        
        const reportPermissions = [
            { name: 'finance.reports_view', description: 'View financial reports', module: 'finance', resource: 'reports', action: 'view', isActive: true },
            { name: 'finance.reports_export', description: 'Export financial reports', module: 'finance', resource: 'reports', action: 'export', isActive: true }
        ];
        
        const addedPermissions = [];
        
        for (const permData of reportPermissions) {
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
            const newPerms = await Permission.find({ name: { $in: reportPermissions.map(p => p.name) } }).session(session);
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
            const viewPerm = await Permission.findOne({ name: 'finance.reports_view' }).session(session);
            if (viewPerm) {
                const existing = financeManager.permissions.map(id => id.toString());
                if (!existing.includes(viewPerm._id.toString())) {
                    financeManager.permissions.push(viewPerm._id);
                    await financeManager.save({ session });
                    console.log('   ✅ Added finance.reports_view to Finance Manager');
                }
            }
        }
        
        // Add to Finance Director
        const financeDirector = await Role.findOne({ name: 'Finance Director' }).session(session);
        if (financeDirector) {
            const viewPerm = await Permission.findOne({ name: 'finance.reports_view' }).session(session);
            if (viewPerm) {
                const existing = financeDirector.permissions.map(id => id.toString());
                if (!existing.includes(viewPerm._id.toString())) {
                    financeDirector.permissions.push(viewPerm._id);
                    await financeDirector.save({ session });
                    console.log('   ✅ Added finance.reports_view to Finance Director');
                }
            }
        }
        
        await session.commitTransaction();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration 012 completed successfully');
        console.log(`   Added ${addedPermissions.length} new permissions`);
        
    } catch (error) {
        await session.abortTransaction();
        console.error('\n❌ Migration 012 failed:', error);
        throw error;
    } finally {
        session.endSession();
    }
}

if (require.main === module) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('📦 Connected to MongoDB');
            return addReportsPermissions();
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

module.exports = addReportsPermissions;
