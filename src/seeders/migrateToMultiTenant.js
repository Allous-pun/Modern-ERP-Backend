// src/seeders/migrateToMultiTenant.js
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Organization = require('../models/organization.model');
const OrganizationMember = require('../models/organizationMember.model');
const OrganizationSettings = require('../models/organizationSettings.model');
const OrganizationSubscription = require('../models/organizationSubscription.model');
const InstalledModule = require('../models/installedModule.model');
const Role = require('../models/role.model');
const Module = require('../models/module.model');
require('dotenv').config();

const migrateToMultiTenant = async () => {
    try {
        console.log('🔄 Starting migration to multi-tenant architecture...');
        console.log('='.repeat(60));

        // Find all existing users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users`);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const user of users) {
            console.log(`\n👤 Processing user: ${user.email}`);

            try {
                // Check if user already has organizations
                if (user.organizations && user.organizations.length > 0) {
                    console.log(`   ⏭️ User already has ${user.organizations.length} organization(s), skipping`);
                    skippedCount++;
                    continue;
                }

                // Find or create organization
                const orgName = `${user.firstName}'s Organization`;
                let organization = await Organization.findOne({ name: orgName });
                
                if (!organization) {
                    // Create new organization
                    const timestamp = Date.now();
                    const slug = `${user.firstName.toLowerCase()}-org-${timestamp}`;

                    organization = await Organization.create({
                        name: orgName,
                        slug: slug,
                        email: user.email,
                        createdBy: user._id,
                        status: 'active',
                        currency: 'USD',
                        timezone: 'UTC',
                        language: 'en'
                    });

                    console.log(`   ✅ Created organization: ${organization.name}`);

                    // Create settings
                    await OrganizationSettings.create({
                        organization: organization._id,
                        timezone: 'UTC',
                        dateFormat: 'DD/MM/YYYY',
                        baseCurrency: 'USD',
                        defaultLanguage: 'en'
                    });

                    // Create subscription
                    const isSuperAdmin = user.email === 'super.admin@erp.com';
                    await OrganizationSubscription.create({
                        organization: organization._id,
                        planName: isSuperAdmin ? 'enterprise' : 'trial',
                        maxUsers: isSuperAdmin ? 1000 : 10,
                        maxStorage: isSuperAdmin ? 10240 : 1024,
                        maxModules: isSuperAdmin ? 100 : 10,
                        startDate: new Date(),
                        trialEndsAt: isSuperAdmin ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                        status: isSuperAdmin ? 'active' : 'trial',
                        autoRenew: !isSuperAdmin
                    });

                    // Install core modules
                    const coreModules = await Module.find({ isCore: true });
                    for (const module of coreModules) {
                        await InstalledModule.create({
                            organization: organization._id,
                            module: module._id,
                            moduleSlug: module.slug,
                            installedBy: user._id,
                            status: 'active',
                            enabledFeatures: module.features.map(f => f.key)
                        });
                    }
                } else {
                    console.log(`   ⏭️ Organization already exists: ${orgName}`);
                }

                // Get or create admin role
                let adminRole = await Role.findOne({ name: 'Organization Admin' });
                if (!adminRole) {
                    console.log(`   ⚠️ Organization Admin role not found, creating it...`);
                    adminRole = await Role.create({
                        name: 'Organization Admin',
                        description: 'Can manage organization settings and members',
                        category: 'system',
                        hierarchy: 800,
                        isDefault: true
                    });
                }

                // Check if user is already a member
                const existingMember = await OrganizationMember.findOne({
                    user: user._id,
                    organization: organization._id
                });
                
                if (!existingMember) {
                    // Add user as member
                    await OrganizationMember.create({
                        user: user._id,
                        organization: organization._id,
                        roles: adminRole ? [adminRole._id] : [],
                        status: 'active',
                        isDefault: true,
                        joinedAt: new Date(),
                        jobTitle: user.email === 'super.admin@erp.com' ? 'Super Administrator' : 'Organization Admin'
                    });
                    console.log(`   ✅ Added user as organization member`);
                } else {
                    console.log(`   ⏭️ User already a member of organization`);
                }

                // Update user with organization (using updateOne to bypass validation)
                await User.updateOne(
                    { _id: user._id },
                    { 
                        $set: { 
                            defaultOrganization: organization._id 
                        },
                        $addToSet: { 
                            organizations: organization._id 
                        }
                    }
                );
                
                console.log(`   ✅ Updated user with organization reference`);

                migratedCount++;
                console.log(`   ✅ Successfully migrated user: ${user.email}`);

            } catch (err) {
                console.error(`   ❌ Error migrating user ${user.email}:`, err.message);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 Migration completed!');
        console.log('📊 Summary:');
        console.log(`   - Total users: ${users.length}`);
        console.log(`   - Migrated/Linked: ${migratedCount}`);
        console.log(`   - Skipped: ${skippedCount}`);
        console.log(`   - Errors: ${errorCount}`);
        
        // Show final status
        const finalUsers = await User.find({}).populate('organizations');
        console.log('\n📊 Final User Status:');
        for (const user of finalUsers) {
            console.log(`   - ${user.email}: ${user.organizations?.length || 0} organizations`);
        }
        
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('📦 Disconnected from MongoDB');
    }
};

// Run the migration
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('📦 Connected to MongoDB');
        return migrateToMultiTenant();
    })
    .then(() => {
        console.log('✨ Migration script complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });