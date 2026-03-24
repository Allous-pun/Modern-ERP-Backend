// src/seeders/fixSuperAdminPermissions.js
const mongoose = require('mongoose');
const Permission = require('../models/permission.model');
const Role = require('../models/role.model');
require('dotenv').config();

const fixSuperAdminPermissions = async () => {
    try {
        console.log('🔧 Fixing Super Administrator permissions...');
        
        // Get all permissions
        const allPermissions = await Permission.find();
        console.log(`📊 Found ${allPermissions.length} total permissions`);
        
        // Find Super Admin role
        const superAdminRole = await Role.findOne({ name: 'Super Administrator' });
        
        if (!superAdminRole) {
            console.log('❌ Super Administrator role not found!');
            return;
        }
        
        console.log(`👑 Found Super Admin role with ${superAdminRole.permissions.length} permissions`);
        
        // Check if "system.permissions_view" exists
        const permViewPermission = await Permission.findOne({ name: 'system.permissions_view' });
        
        if (!permViewPermission) {
            console.log('⚠️ system.permissions_view permission not found! Creating it...');
            
            // Create the missing permission
            const newPermission = await Permission.create({
                name: 'system.permissions_view',
                description: 'view permissions in system module',
                module: 'system',
                resource: 'permissions',
                action: 'view',
                isActive: true
            });
            
            console.log('✅ Created system.permissions_view permission');
            
            // Add to all permissions array
            allPermissions.push(newPermission);
        }
        
        // Assign ALL permissions to Super Admin
        superAdminRole.permissions = allPermissions.map(p => p._id);
        await superAdminRole.save();
        
        console.log(`✅ Super Admin role updated with ${superAdminRole.permissions.length} permissions`);
        console.log('🎉 Fix complete!');
        
    } catch (error) {
        console.error('Error fixing permissions:', error);
    }
};

// Run the fix
if (require.main === module) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('📦 Connected to MongoDB');
            return fixSuperAdminPermissions();
        })
        .then(() => {
            console.log('✨ Fix script complete');
            process.exit(0);
        })
        .catch(console.error);
}

module.exports = fixSuperAdminPermissions;