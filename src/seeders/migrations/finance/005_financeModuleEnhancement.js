// src/seeders/migrations/005_financeModuleEnhancement.js
const mongoose = require('mongoose');
const Permission = require('../../models/permission.model');
const Role = require('../../models/role.model');
require('dotenv').config();

/**
 * Migration 005: Finance Module Enhancement - Cross-Module Inheritance
 * 
 * This migration:
 * 1. Updates finance roles with new permissions (from 004)
 * 2. Adds cross-module payroll permissions to finance roles
 * 3. Updates budget and CFO roles with enhanced permissions
 * 
 * DEPENDS ON: 004_enhanceFinanceModule.js (run that first)
 * Safe to run multiple times - only adds missing permissions
 */
const enhanceFinanceModuleCross = async () => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        console.log('\n🚀 Starting Finance Module Cross-Module Enhancement (005)...');
        console.log('='.repeat(60));
        
        // Get all permissions for reference
        const allPermissions = await Permission.find({}).session(session);
        
        // Helper functions
        const getPermissionIdsByNames = (names) => {
            return allPermissions
                .filter(p => names.includes(p.name))
                .map(p => p._id);
        };
        
        const getPayrollPermissionsByActions = (actions) => {
            return allPermissions
                .filter(p => p.resource === 'payroll' && actions.includes(p.action))
                .map(p => p._id);
        };
        
        const getFinancePermissionsByResourceAndActions = (resource, actions) => {
            return allPermissions
                .filter(p => p.module === 'finance' && p.resource === resource && actions.includes(p.action))
                .map(p => p._id);
        };
        
        // ============================================
        // STEP 1: Update Finance Director Role
        // ============================================
        console.log('\n👔 STEP 1: Updating Finance Director role with cross-module permissions...');
        
        const financeDirector = await Role.findOne({ name: 'Finance Director' }).session(session);
        if (financeDirector) {
            const newPermissions = getPermissionIdsByNames([
                'finance.reports_export',
                'finance.reports_schedule',
                'finance.analysis_read',
                'finance.analysis_export'
            ]);
            
            const payrollPermissions = getPayrollPermissionsByActions(['approve', 'reports_export']);
            
            const permissionsToAdd = [...newPermissions, ...payrollPermissions];
            const existingPermissions = financeDirector.permissions.map(id => id.toString());
            const permissionsToAddIds = permissionsToAdd.filter(id => 
                !existingPermissions.includes(id.toString())
            );
            
            if (permissionsToAddIds.length > 0) {
                financeDirector.permissions.push(...permissionsToAddIds);
                await financeDirector.save({ session });
                console.log(`   ✅ Added ${permissionsToAddIds.length} permissions to Finance Director`);
                console.log(`      - Reports: export, schedule`);
                console.log(`      - Analysis: read, export`);
                console.log(`      - Payroll: approve, reports_export`);
            } else {
                console.log('   ⏭️  Finance Director already has all new permissions');
            }
        } else {
            console.log('   ⚠️  Finance Director role not found');
        }
        
        // ============================================
        // STEP 2: Update Finance Manager Role
        // ============================================
        console.log('\n👔 STEP 2: Updating Finance Manager role...');
        
        const financeManager = await Role.findOne({ name: 'Finance Manager' }).session(session);
        if (financeManager) {
            const newPermissions = getPermissionIdsByNames([
                'finance.reports_export',
                'finance.reports_read'
            ]);
            
            // Get budget approve permission
            const budgetApprove = allPermissions.find(p => 
                p.resource === 'budget' && p.action === 'approve'
            );
            
            const payrollRead = getPayrollPermissionsByActions(['read']);
            
            const permissionsToAdd = [...newPermissions];
            if (budgetApprove) permissionsToAdd.push(budgetApprove._id);
            permissionsToAdd.push(...payrollRead);
            
            const existingPermissions = financeManager.permissions.map(id => id.toString());
            const permissionsToAddIds = permissionsToAdd.filter(id => 
                !existingPermissions.includes(id.toString())
            );
            
            if (permissionsToAddIds.length > 0) {
                financeManager.permissions.push(...permissionsToAddIds);
                await financeManager.save({ session });
                console.log(`   ✅ Added ${permissionsToAddIds.length} permissions to Finance Manager`);
                console.log(`      - Reports: read, export`);
                console.log(`      - Budget: approve`);
                console.log(`      - Payroll: read`);
            } else {
                console.log('   ⏭️  Finance Manager already has all new permissions');
            }
        } else {
            console.log('   ⚠️  Finance Manager role not found');
        }
        
        // ============================================
        // STEP 3: Update Financial Analyst Role
        // ============================================
        console.log('\n📊 STEP 3: Updating Financial Analyst role with full forecasting...');
        
        const financialAnalyst = await Role.findOne({ name: 'Financial Analyst' }).session(session);
        if (financialAnalyst) {
            const newPermissions = getPermissionIdsByNames([
                'finance.forecast_create',
                'finance.forecast_read',
                'finance.forecast_update',
                'finance.forecast_delete',
                'finance.forecast_export',
                'finance.analysis_read',
                'finance.analysis_export',
                'finance.analysis_create'
            ]);
            
            const existingPermissions = financialAnalyst.permissions.map(id => id.toString());
            const permissionsToAdd = newPermissions.filter(id => 
                !existingPermissions.includes(id.toString())
            );
            
            if (permissionsToAdd.length > 0) {
                financialAnalyst.permissions.push(...permissionsToAdd);
                await financialAnalyst.save({ session });
                console.log(`   ✅ Added ${permissionsToAdd.length} permissions to Financial Analyst`);
                console.log(`      - Full forecast permissions (CRUD + export)`);
                console.log(`      - Analysis: read, export, create`);
            } else {
                console.log('   ⏭️  Financial Analyst already has all new permissions');
            }
        } else {
            console.log('   ⚠️  Financial Analyst role not found');
        }
        
        // ============================================
        // STEP 4: Update Payroll Manager (ensure export)
        // ============================================
        console.log('\n💰 STEP 4: Updating Payroll Manager with export permissions...');
        
        const payrollManager = await Role.findOne({ name: 'Payroll Manager' }).session(session);
        if (payrollManager) {
            const reportExport = allPermissions.find(p => 
                p.resource === 'payroll' && p.action === 'reports_export'
            );
            
            if (reportExport) {
                const existingPermissions = payrollManager.permissions.map(id => id.toString());
                if (!existingPermissions.includes(reportExport._id.toString())) {
                    payrollManager.permissions.push(reportExport._id);
                    await payrollManager.save({ session });
                    console.log(`   ✅ Added payroll.reports_export to Payroll Manager`);
                } else {
                    console.log('   ⏭️  Payroll Manager already has reports_export');
                }
            }
        } else {
            console.log('   ⚠️  Payroll Manager role not found');
        }
        
        // ============================================
        // STEP 5: Update Budget Officer (add approve)
        // ============================================
        console.log('\n📋 STEP 5: Updating Budget Officer with approve permission...');
        
        const budgetOfficer = await Role.findOne({ name: 'Budget Officer' }).session(session);
        if (budgetOfficer) {
            const budgetApprove = allPermissions.find(p => 
                p.resource === 'budget' && p.action === 'approve'
            );
            
            if (budgetApprove) {
                const existingPermissions = budgetOfficer.permissions.map(id => id.toString());
                if (!existingPermissions.includes(budgetApprove._id.toString())) {
                    budgetOfficer.permissions.push(budgetApprove._id);
                    await budgetOfficer.save({ session });
                    console.log('   ✅ Added budget.approve to Budget Officer');
                } else {
                    console.log('   ⏭️  Budget Officer already has budget approve');
                }
            }
        } else {
            console.log('   ⚠️  Budget Officer role not found');
        }
        
        // ============================================
        // STEP 6: Update CFO (ensure export)
        // ============================================
        console.log('\n👔 STEP 6: Updating CFO with export permissions...');
        
        const cfo = await Role.findOne({ name: 'Chief Financial Officer (CFO)' }).session(session);
        if (cfo) {
            const reportExport = allPermissions.find(p => 
                p.name === 'finance.reports_export'
            );
            
            if (reportExport) {
                const existingPermissions = cfo.permissions.map(id => id.toString());
                if (!existingPermissions.includes(reportExport._id.toString())) {
                    cfo.permissions.push(reportExport._id);
                    await cfo.save({ session });
                    console.log('   ✅ Added finance.reports_export to CFO');
                } else {
                    console.log('   ⏭️  CFO already has reports_export');
                }
            }
            
            // Also add analysis permissions for CFO
            const analysisRead = allPermissions.find(p => 
                p.name === 'finance.analysis_read'
            );
            
            if (analysisRead) {
                const existingPermissions = cfo.permissions.map(id => id.toString());
                if (!existingPermissions.includes(analysisRead._id.toString())) {
                    cfo.permissions.push(analysisRead._id);
                    await cfo.save({ session });
                    console.log('   ✅ Added finance.analysis_read to CFO');
                }
            }
        } else {
            console.log('   ⚠️  CFO role not found');
        }
        
        // ============================================
        // STEP 7: Update Accountant (General Ledger) - ensure forecast read
        // ============================================
        console.log('\n📚 STEP 7: Updating Accountant with forecast read...');
        
        const accountant = await Role.findOne({ name: 'Accountant (General Ledger)' }).session(session);
        if (accountant) {
            const forecastRead = allPermissions.find(p => 
                p.name === 'finance.forecast_read'
            );
            
            if (forecastRead) {
                const existingPermissions = accountant.permissions.map(id => id.toString());
                if (!existingPermissions.includes(forecastRead._id.toString())) {
                    accountant.permissions.push(forecastRead._id);
                    await accountant.save({ session });
                    console.log('   ✅ Added finance.forecast_read to Accountant');
                } else {
                    console.log('   ⏭️  Accountant already has forecast_read');
                }
            }
        } else {
            console.log('   ⚠️  Accountant role not found');
        }
        
        // ============================================
        // SUMMARY
        // ============================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ Finance Module Cross-Module Enhancement (005) Complete!');
        console.log('='.repeat(60));
        console.log('\n📊 Updated Roles:');
        console.log('   - Finance Director (added reports_export, schedule, analysis, payroll)');
        console.log('   - Finance Manager (added reports_export, budget approve, payroll read)');
        console.log('   - Financial Analyst (added full forecast CRUD, analysis)');
        console.log('   - Payroll Manager (added reports_export)');
        console.log('   - Budget Officer (added approve)');
        console.log('   - CFO (added reports_export, analysis_read)');
        console.log('   - Accountant (added forecast_read)');
        console.log('\n🎯 Cross-Module Inheritance Implemented:');
        console.log('   - Finance roles now have payroll permissions');
        console.log('   - Budget approvals extended to Finance Manager');
        console.log('   - Forecasting enabled for Financial Analyst');
        
        await session.commitTransaction();
        console.log('\n✨ Migration 005 committed successfully!');
        
    } catch (error) {
        await session.abortTransaction();
        console.error('\n❌ Migration 005 failed:', error);
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
            return enhanceFinanceModuleCross();
        })
        .then(() => {
            console.log('\n✨ Migration 005 complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration error:', error);
            process.exit(1);
        });
}

module.exports = enhanceFinanceModuleCross;
