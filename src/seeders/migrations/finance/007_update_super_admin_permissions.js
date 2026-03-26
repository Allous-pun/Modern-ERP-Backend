// src/seeders/migrations/007_update_super_admin_permissions.js
const mongoose = require('mongoose');
const Permission = require('../../models/permission.model');
const Role = require('../../models/role.model');
const { PERMISSIONS } = require('../../utils/permission.constants');
require('dotenv').config();

const updateSuperAdminPermissions = async () => {
    try {
        console.log('\n🚀 Updating Super Admin with all permissions...');
        
        // Get all permissions from database
        const allPermissions = await Permission.find();
        
        // Find Super Admin role
        const superAdminRole = await Role.findOne({ name: 'Super Administrator' });
        
        if (!superAdminRole) {
            console.log('❌ Super Administrator role not found!');
            return;
        }
        
        // Get all permission IDs
        const allPermissionIds = allPermissions.map(p => p._id);
        
        // Update Super Admin to have ALL permissions
        superAdminRole.permissions = allPermissionIds;
        await superAdminRole.save();
        
        console.log(`✅ Super Admin now has ${allPermissionIds.length} permissions`);
        console.log(`   Including: finance.account.create, finance.account.read, etc.`);
        
    } catch (error) {
        console.error('Error updating Super Admin:', error);
    }
};

if (require.main === module) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('📦 Connected to MongoDB');
            return updateSuperAdminPermissions();
        })
        .then(() => {
            console.log('✨ Update complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Error:', error);
            process.exit(1);
        });
}

module.exports = updateSuperAdminPermissions;
