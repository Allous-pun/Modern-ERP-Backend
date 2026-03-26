// src/seeders/migrations/004_enhanceFinanceModule.js
const mongoose = require('mongoose');
const Permission = require('../../models/permission.model');
const Role = require('../../models/role.model');
const Module = require('../../models/module.model');
require('dotenv').config();

/**
 * Migration 004: Enhance Finance Module - Base Structure
 * 
 * This migration:
 * 1. Adds core finance permissions (reports_export, forecast_*, analysis_*)
 * 2. Creates base finance role updates
 * 3. Updates Finance module features structure
 * 
 * Safe to run multiple times - only adds missing data
 */
const enhanceFinanceModule = async () => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        console.log('\n🚀 Starting Finance Module Enhancement Migration (004)...');
        console.log('='.repeat(60));
        
        // ============================================
        // STEP 1: Add New Finance Permissions
        // ============================================
        console.log('\n📝 STEP 1: Adding new finance permissions...');
        
        const newPermissions = [
            // Reports permissions
            {
                name: 'finance.reports_export',
                description: 'Export financial reports',
                module: 'finance',
                resource: 'reports',
                action: 'export',
                isActive: true
            },
            {
                name: 'finance.reports_schedule',
                description: 'Schedule financial reports',
                module: 'finance',
                resource: 'reports',
                action: 'schedule',
                isActive: true
            },
            {
                name: 'finance.reports_read',
                description: 'Read financial reports',
                module: 'finance',
                resource: 'reports',
                action: 'read',
                isActive: true
            },
            
            // Forecasting permissions
            {
                name: 'finance.forecast_create',
                description: 'Create financial forecasts',
                module: 'finance',
                resource: 'forecast',
                action: 'create',
                isActive: true
            },
            {
                name: 'finance.forecast_read',
                description: 'Read financial forecasts',
                module: 'finance',
                resource: 'forecast',
                action: 'read',
                isActive: true
            },
            {
                name: 'finance.forecast_update',
                description: 'Update financial forecasts',
                module: 'finance',
                resource: 'forecast',
                action: 'update',
                isActive: true
            },
            {
                name: 'finance.forecast_delete',
                description: 'Delete financial forecasts',
                module: 'finance',
                resource: 'forecast',
                action: 'delete',
                isActive: true
            },
            {
                name: 'finance.forecast_export',
                description: 'Export financial forecasts',
                module: 'finance',
                resource: 'forecast',
                action: 'export',
                isActive: true
            },
            
            // Analysis permissions
            {
                name: 'finance.analysis_read',
                description: 'Read financial analysis',
                module: 'finance',
                resource: 'analysis',
                action: 'read',
                isActive: true
            },
            {
                name: 'finance.analysis_export',
                description: 'Export financial analysis',
                module: 'finance',
                resource: 'analysis',
                action: 'export',
                isActive: true
            },
            {
                name: 'finance.analysis_create',
                description: 'Create financial analysis',
                module: 'finance',
                resource: 'analysis',
                action: 'create',
                isActive: true
            }
        ];
        
        const addedPermissions = [];
        for (const permData of newPermissions) {
            const existing = await Permission.findOne({ name: permData.name });
            if (!existing) {
                const newPerm = await Permission.create([permData], { session });
                addedPermissions.push(permData.name);
                console.log(`   ✅ Added permission: ${permData.name}`);
            } else {
                console.log(`   ⏭️  Already exists: ${permData.name}`);
            }
        }
        
        if (addedPermissions.length === 0) {
            console.log('   ℹ️  No new permissions added');
        } else {
            console.log(`   📊 Added ${addedPermissions.length} new permissions`);
        }
        
        // ============================================
        // STEP 2: Update Finance Module Features
        // ============================================
        console.log('\n📦 STEP 2: Updating Finance & Accounting module features...');
        
        const financeModule = await Module.findOne({ slug: 'finance' }).session(session);
        if (financeModule) {
            let featuresUpdated = false;
            
            // Update existing "Financial Reports" feature with permissions
            const reportsFeature = financeModule.features.find(f => f.key === 'reports');
            if (reportsFeature) {
                if (!reportsFeature.permissions) {
                    reportsFeature.permissions = [
                        'finance.reports_read',
                        'finance.reports_export',
                        'finance.reports_schedule'
                    ];
                    featuresUpdated = true;
                    console.log('   ✅ Added permissions to Financial Reports feature');
                } else {
                    console.log('   ⏭️  Financial Reports feature already has permissions');
                }
            }
            
            // Check if forecasting feature already exists
            const forecastExists = financeModule.features.some(f => f.key === 'forecast');
            if (!forecastExists) {
                financeModule.features.push({
                    name: 'Financial Forecasting',
                    key: 'forecast',
                    description: 'Budget forecasting and financial projections',
                    permissions: [
                        'finance.forecast_create',
                        'finance.forecast_read',
                        'finance.forecast_update',
                        'finance.forecast_delete',
                        'finance.forecast_export'
                    ]
                });
                featuresUpdated = true;
                console.log('   ✅ Added Financial Forecasting feature');
            } else {
                console.log('   ⏭️  Financial Forecasting feature already exists');
            }
            
            // Check if analysis feature already exists
            const analysisExists = financeModule.features.some(f => f.key === 'analysis');
            if (!analysisExists) {
                financeModule.features.push({
                    name: 'Financial Analysis',
                    key: 'analysis',
                    description: 'Advanced financial analytics and insights',
                    permissions: [
                        'finance.analysis_read',
                        'finance.analysis_export',
                        'finance.analysis_create'
                    ]
                });
                featuresUpdated = true;
                console.log('   ✅ Added Financial Analysis feature');
            } else {
                console.log('   ⏭️  Financial Analysis feature already exists');
            }
            
            if (featuresUpdated) {
                await financeModule.save({ session });
                console.log('   ✅ Finance module features updated');
            } else {
                console.log('   ℹ️  No changes needed to Finance module features');
            }
        } else {
            console.log('   ⚠️  Finance module not found');
        }
        
        // ============================================
        // SUMMARY
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ Finance Module Enhancement Migration (004) Complete!');
        console.log('='.repeat(60));
        console.log('\n📊 Summary:');
        console.log(`   - Added ${addedPermissions.length} new permissions`);
        console.log('   - Enhanced Finance module features');
        console.log('\n📌 Next: Run migration 005 for cross-module role updates');
        
        await session.commitTransaction();
        console.log('\n✨ Migration 004 committed successfully!');
        
    } catch (error) {
        await session.abortTransaction();
        console.error('\n❌ Migration 004 failed:', error);
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
            return enhanceFinanceModule();
        })
        .then(() => {
            console.log('\n✨ Migration 004 complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration error:', error);
            process.exit(1);
        });
}

module.exports = enhanceFinanceModule;
