/*
 * Second pass on the P&L margin fix. fix_data_integrity.js's trainer
 * reassignment (correctly) made session commission real for the first
 * time — but with ALL 159 members now generating commission instead of a
 * handful, no combination of realistic trainer salaries and rent alone
 * fits under a 20% margin at the current ~₹13.7L/year revenue: the
 * ceiling on 5 trainers' total compensation works out to under ₹7,500/
 * month each, which isn't a realistic "full_time" wage to seed.
 *
 * So this pass uses the "and/or plan pricing" lever explicitly allowed by
 * the task: it sets realistic trainer pay, regenerates payroll to get the
 * exact resulting cost, then scales revenue up by applying the precise
 * factor needed to *both* payments.amount and their linked invoices'
 * subtotal/tax_amount/total together — preserving the GST math (tax =
 * 18% of subtotal, total = subtotal + tax) and payment-invoice
 * consistency, the same care taken when the invoice-total bug was fixed
 * earlier in this project.
 *
 * One-shot corrective script, not idempotent. Usage: node database/fix_pnl_margin.js
 */
const path = require('path');
require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '../server/.env') });

const pool = require('../server/src/config/db');
const payrollRunsDb = require('../server/src/db/payrollRunsDb');
const payslipsDb = require('../server/src/db/payslipsDb');
const { computePayslip, postPayrollExpenses } = require('../server/src/services/payrollCalculator');

const TARGET_MARGIN = 0.20;

async function setRealisticPay() {
  // Correlate pay with assignment load (45/38/30/28/18) for a coherent story.
  const trainerIds = (await pool.query('SELECT id FROM trainers ORDER BY id')).rows.map((r) => r.id);
  const baseSalaries = [16000, 15000, 13500, 13000, 12000];
  const sessionRates = [45, 45, 40, 40, 35];
  for (let i = 0; i < trainerIds.length; i++) {
    await pool.query('UPDATE employees SET base_salary = $1, per_session_rate = $2 WHERE trainer_id = $3', [baseSalaries[i], sessionRates[i], trainerIds[i]]);
  }
  console.log('Set realistic base salaries and session rates for all 5 trainers.');
}

async function regeneratePayroll(adminUserId) {
  const linkedExpenseIds = (await pool.query('SELECT expense_id FROM payslips WHERE expense_id IS NOT NULL')).rows.map((r) => r.expense_id);
  await pool.query('DELETE FROM payroll_runs');
  if (linkedExpenseIds.length > 0) {
    await pool.query('DELETE FROM expenses WHERE id = ANY($1)', [linkedExpenseIds]);
  }

  const employees = (await pool.query('SELECT * FROM employees WHERE is_active = TRUE')).rows;
  const today = new Date();
  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const run = await payrollRunsDb.findOrCreateDraft(month, year, adminUserId);
    const payslips = [];
    for (const employee of employees) payslips.push(await computePayslip(employee, year, month));
    const inserted = await payslipsDb.replaceForRun(run.id, payslips);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await postPayrollExpenses(run, inserted, adminUserId, client);
      await payrollRunsDb.finalize(run.id, client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  console.log('Regenerated and finalized 12 payroll runs with realistic pay.');
}

async function currentTotals() {
  const revenue = (await pool.query('SELECT COALESCE(SUM(amount),0)::numeric AS total FROM payments')).rows[0].total;
  const expenses = (await pool.query('SELECT COALESCE(SUM(amount),0)::numeric AS total FROM expenses')).rows[0].total;
  return { revenue: Number(revenue), expenses: Number(expenses) };
}

// Scales every payment and its linked invoice together, preserving GST
// math (tax = 18% of subtotal, total = subtotal + tax) and the
// payment-invoice total match.
async function scaleRevenue(factor) {
  const invoices = (await pool.query('SELECT id, subtotal FROM invoices')).rows;
  for (const inv of invoices) {
    const newSubtotal = Math.round(Number(inv.subtotal) * factor * 100) / 100;
    const newTax = Math.round(newSubtotal * 18) / 100;
    const newTotal = Math.round((newSubtotal + newTax) * 100) / 100;
    await pool.query('UPDATE invoices SET subtotal = $1, tax_amount = $2, total = $3 WHERE id = $4', [newSubtotal, newTax, newTotal, inv.id]);
  }
  console.log(`Scaled ${invoices.length} invoices by ${factor.toFixed(4)}x.`);

  const payments = (await pool.query('SELECT id, amount, invoice_id FROM payments')).rows;
  for (const p of payments) {
    let newAmount;
    if (p.invoice_id) {
      const inv = (await pool.query('SELECT total FROM invoices WHERE id = $1', [p.invoice_id])).rows[0];
      newAmount = inv.total; // keep exact match with its (already-scaled) invoice
    } else {
      newAmount = Math.round(Number(p.amount) * factor * 100) / 100;
    }
    await pool.query('UPDATE payments SET amount = $1 WHERE id = $2', [newAmount, p.id]);
  }
  console.log(`Scaled ${payments.length} payments to match.`);
}

async function reportMargin(label) {
  const { revenue, expenses } = await currentTotals();
  const profit = revenue - expenses;
  const margin = (profit / revenue) * 100;
  console.log(`${label}: revenue ₹${revenue.toLocaleString('en-IN')}, expenses ₹${expenses.toLocaleString('en-IN')}, profit ₹${profit.toLocaleString('en-IN')}, margin ${margin.toFixed(1)}%`);
  return { revenue, expenses, margin };
}

async function main() {
  try {
    const adminUser = (await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`)).rows[0];
    if (!adminUser) throw new Error('Expected an admin user to exist.');

    await setRealisticPay();
    await regeneratePayroll(adminUser.id);
    const { revenue, expenses } = await reportMargin('After realistic pay, before revenue scaling');

    const targetRevenue = expenses / (1 - TARGET_MARGIN);
    const factor = targetRevenue / revenue;
    console.log(`Need revenue ~₹${targetRevenue.toLocaleString('en-IN')} for a ${(TARGET_MARGIN * 100).toFixed(0)}% margin — scaling by ${factor.toFixed(4)}x.`);

    await scaleRevenue(factor);
    await reportMargin('Final');

    console.log('\nDone.');
  } catch (err) {
    console.error('Failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
