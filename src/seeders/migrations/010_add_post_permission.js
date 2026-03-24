// src/seeders/migrations/010_add_post_permission.js
const mongoose = require('mongoose');
const Permission = require('../../models/permission.model');
const Role = require('../../models/role.model');
require('dotenv').config();

async function addPostPermission() {
    try {
        console.log('\n🚀 Adding post permission...');
        
        // Create or find the permission
        let postPerm = await Permission.findOne({ name: 'finance.journal_post' });
        
        if (!postPerm) {
            postPerm = await Permission.create({
                name: 'finance.journal_post',
                description: 'Post journal entries to ledger',
                module: 'finance',
                resource: 'journal',
                action: 'post',
                isActive: true
            });
            console.log('✅ Created permission: finance.journal_post');
        } else {
            console.log('⏭️ Permission already exists:', postPerm.name);
        }
        
        // Add to Super Admin
        const superAdmin = await Role.findOne({ name: 'Super Administrator' });
        if (superAdmin && !superAdmin.permissions.includes(postPerm._id)) {
            superAdmin.permissions.push(postPerm._id);
            await superAdmin.save();
            console.log('✅ Added permission to Super Admin');
        }
        
        console.log('✅ Done!');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('📦 Connected to MongoDB');
        return addPostPermission();
    })
    .then(() => {
        console.log('✨ Migration complete');
        process.exit(0);
    })
    .catch(console.error);
