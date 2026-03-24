// src/seeders/migrations/008_add_journal_post_permission.js
const mongoose = require('mongoose');
const Permission = require('../../models/permission.model');
const Role = require('../../models/role.model');
require('dotenv').config();

/**
 * Migration 008: Add Journal Post Permission
 * 
 * This migration ensures finance.journal_approve permission exists
 * and is added to Super Admin role
 */
async function addJournalPostPermission() {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        console.log('\n🚀 Migration 008: Adding Journal Post Permission...');
        console.log('='.repeat(60));
        
        // Check if permission exists (using approve action since post isn't in enum)
        let journalPost = await Permission.findOne({ 
            $or: [
                { name: 'finance.journal_post' },
                { name: 'finance.journal_approve' }
            ]
        }).session(session);
        
        if (!journalPost) {
            console.log('   Creating finance.journal_approve permission...');
            journalPost = await Permission.create([{
                name: 'finance.journal_approve',
                description: 'Post journal entries to ledger',
                module: 'finance',
                resource: 'journal',
                action: 'approve',
                isActive: true
            }], { session });
            journalPost = journalPost[0];
            console.log('   ✅ Created permission: finance.journal_approve');
        } else {
            console.log('   ⏭️  Permission already exists:', journalPost.name);
        }
        
        // Update Super Admin with all permissions
        const superAdmin = await Role.findOne({ name: 'Super Administrator' }).session(session);
        
        if (superAdmin) {
            const allPermissions = await Permission.find({}).session(session);
            const allPermissionIds = allPermissions.map(p => p._id);
            
            const existingCount = superAdmin.permissions.length;
            superAdmin.permissions = allPermissionIds;
            await superAdmin.save({ session });
            
            console.log(`   ✅ Updated Super Admin: ${existingCount} → ${allPermissionIds.length} permissions`);
        } else {
            console.log('   ⚠️  Super Administrator role not found');
        }
        
        // Also update Finance Manager role with journal permissions
        const financeManager = await Role.findOne({ name: 'Finance Manager' }).session(session);
        if (financeManager) {
            const journalPerms = await Permission.find({
                name: { $in: ['finance.journal_create', 'finance.journal_view', 'finance.journal_approve'] }
            }).session(session);
            
            const journalPermIds = journalPerms.map(p => p._id);
            const existingManagerPerms = financeManager.permissions.map(id => id.toString());
            const newPerms = journalPermIds.filter(id => !existingManagerPerms.includes(id.toString()));
            
            if (newPerms.length > 0) {
                financeManager.permissions.push(...newPerms);
                await financeManager.save({ session });
                console.log(`   ✅ Added ${newPerms.length} journal permissions to Finance Manager`);
            } else {
                console.log('   ⏭️  Finance Manager already has journal permissions');
            }
        }
        
        // Update Accountant role with journal view
        const accountant = await Role.findOne({ name: 'Accountant (General Ledger)' }).session(session);
        if (accountant) {
            const journalView = await Permission.findOne({ name: 'finance.journal_view' }).session(session);
            if (journalView) {
                const existing = accountant.permissions.map(id => id.toString());
                if (!existing.includes(journalView._id.toString())) {
                    accountant.permissions.push(journalView._id);
                    await accountant.save({ session });
                    console.log('   ✅ Added finance.journal_view to Accountant');
                }
            }
        }
        
        await session.commitTransaction();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration 008 completed successfully');
        console.log('   - finance.journal_approve permission added');
        console.log('   - Super Admin has all permissions');
        console.log('   - Finance Manager has journal permissions');
        console.log('   - Accountant has journal view');
        
    } catch (error) {
        await session.abortTransaction();
        console.error('\n❌ Migration 008 failed:', error);
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
            return addJournalPostPermission();
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

module.exports = addJournalPostPermission;
