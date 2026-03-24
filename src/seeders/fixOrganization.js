// src/seeders/fixOrganization.js
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Organization = require('../models/organization.model');
const Module = require('../models/module.model');
const InstalledModule = require('../models/installedModule.model');
require('dotenv').config();

const fixOrganization = async () => {
    try {
        console.log('🔧 Fixing organization for Super Admin...');
        
        // Find Super Admin user
        const superAdmin = await User.findOne({ email: 'super.admin@erp.com' });
        
        if (!superAdmin) {
            console.log('❌ Super Admin user not found!');
            return;
        }
        
        console.log(`✅ Found Super Admin: ${superAdmin.email}`);
        
        // Check if user already has organization
        if (superAdmin.organization) {
            console.log('⚠️ User already has organization. Checking if valid...');
            const existingOrg = await Organization.findById(superAdmin.organization);
            if (existingOrg) {
                console.log(`✅ Organization exists: ${existingOrg.name}`);
                
                // Install core modules if not already installed
                const coreModules = await Module.find({ isCore: true });
                console.log(`📦 Checking ${coreModules.length} core modules...`);
                
                for (const module of coreModules) {
                    const alreadyInstalled = await InstalledModule.findOne({
                        organization: existingOrg._id,
                        module: module._id
                    });
                    
                    if (!alreadyInstalled) {
                        await InstalledModule.create({
                            organization: existingOrg._id,
                            module: module._id,
                            moduleSlug: module.slug,
                            installedBy: superAdmin._id,
                            status: 'active',
                            settings: {},
                            enabledFeatures: module.features.map(f => f.key)
                        });
                        console.log(`   ✅ Installed: ${module.name}`);
                    } else {
                        console.log(`   ⏭️ Already installed: ${module.name}`);
                    }
                }
                
                console.log('🎉 Organization already set up correctly!');
                return;
            }
        }
        
        // Check if organization with same name exists but user not linked
        const existingOrgByName = await Organization.findOne({ 
            name: `${superAdmin.firstName}'s Organization` 
        });
        
        if (existingOrgByName) {
            console.log('⚠️ Found organization with same name, linking user...');
            
            // Link user to existing organization
            superAdmin.organization = existingOrgByName._id;
            await superAdmin.save();
            console.log(`✅ Linked user to existing organization: ${existingOrgByName.name}`);
            
            // Install core modules
            const coreModules = await Module.find({ isCore: true });
            for (const module of coreModules) {
                const alreadyInstalled = await InstalledModule.findOne({
                    organization: existingOrgByName._id,
                    module: module._id
                });
                
                if (!alreadyInstalled) {
                    await InstalledModule.create({
                        organization: existingOrgByName._id,
                        module: module._id,
                        moduleSlug: module.slug,
                        installedBy: superAdmin._id,
                        status: 'active',
                        settings: {},
                        enabledFeatures: module.features.map(f => f.key)
                    });
                    console.log(`   ✅ Installed: ${module.name}`);
                }
            }
            
            console.log('🎉 Organization linking complete!');
            return;
        }
        
        // Create new organization with unique name
        const timestamp = Date.now();
        const organization = await Organization.create({
            name: `${superAdmin.firstName}'s Organization ${timestamp}`,
            slug: `${superAdmin.firstName.toLowerCase()}-org-${timestamp}`,
            email: superAdmin.email,
            createdBy: superAdmin._id,
            settings: {
                timezone: "UTC",
                dateFormat: "DD/MM/YYYY",
                currency: "USD",
                language: "en"
            },
            isActive: true,
            isVerified: true,
            subscription: {
                plan: "enterprise",
                status: "active",
                startDate: new Date()
            }
        });
        
        console.log(`✅ Created organization: ${organization.name} (${organization._id})`);
        
        // Update user with organization
        superAdmin.organization = organization._id;
        await superAdmin.save();
        console.log(`✅ Updated Super Admin with organization`);
        
        // Install core modules automatically
        const coreModules = await Module.find({ isCore: true });
        console.log(`📦 Found ${coreModules.length} core modules to install`);
        
        for (const module of coreModules) {
            await InstalledModule.create({
                organization: organization._id,
                module: module._id,
                moduleSlug: module.slug,
                installedBy: superAdmin._id,
                status: 'active',
                settings: {},
                enabledFeatures: module.features.map(f => f.key)
            });
            console.log(`   ✅ Installed: ${module.name}`);
        }
        
        console.log('🎉 Organization fix complete!');
        
    } catch (error) {
        console.error('Error fixing organization:', error);
    } finally {
        mongoose.disconnect();
    }
};

// Run the fix
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('📦 Connected to MongoDB');
        return fixOrganization();
    })
    .then(() => {
        console.log('✨ Fix script complete');
        process.exit(0);
    })
    .catch(console.error);