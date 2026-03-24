const mongoose = require('mongoose');
const FinanceBudget = require('./src/models/finance/budget.model');
const { Account } = require('./src/models/finance/account.model');
require('dotenv').config();

async function checkBudget() {
  await mongoose.connect(process.env.MONGODB_URI);
  const budget = await FinanceBudget.findOne({ fiscalYear: 2026 });
  if (budget) {
    console.log('Budget found:');
    console.log('  Number:', budget.budgetNumber);
    console.log('  Status:', budget.status);
    console.log('  Organization:', budget.organization.toString());
    console.log('  Line items count:', budget.lineItems.length);
    console.log('  Line items:');
    for (let i = 0; i < budget.lineItems.length; i++) {
      const item = budget.lineItems[i];
      const account = await Account.findById(item.account);
      console.log(`    ${i + 1}. Account ID: ${item.account}`);
      console.log(`       Account Name: ${account ? account.name : 'Not found'}`);
      console.log(`       Budget Amount: ${item.amount}`);
      console.log(`       Actual Amount: ${item.actualAmount || 0}`);
    }
  } else {
    console.log('No budget found for 2026');
  }
  await mongoose.disconnect();
}

checkBudget().catch(console.error);
