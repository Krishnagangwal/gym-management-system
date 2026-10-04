/*
 * Corrective re-seed addressing two entangled bugs from the earlier finance
 * and payroll seeding:
 *
 * 1. Trainer-member assignments only ever covered the 5 original seed.sql
 *    members, so trainer analytics/session-commission were near-empty.
 *    This redistributes all 159 members across the 5 trainers unevenly
 *    (45/38/30/28/18) — deactivating the old sparse assignments first.
 *
 * 2. The P&L showed a ~34% net LOSS. With revenue fixed (touching already-
 *    consistent historical payments/invoices is far riskier than adjusting
 *    the expense side, which the task explicitly sanctions), rent and
 *    trainer base salaries are brought down to a level that yields a
 *    healthy margin. Because fix #1 also means trainers now earn real
 *    session commission for the first time, payroll is regenerated from
 *    scratch afterward so the numbers reflect both changes together —
 *    hand-calculating the exact result upfront isn't reliable since
 *    commission's contribution is unknown until real assignments exist.
 *
 * This is a one-shot corrective script, not idempotent like the other
 * seed_*.js scripts — it's meant to be run once to fix already-seeded data.
 *
 * Usage: node database/fix_data_integrity.js
 */
const path = require('path');
require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '../server/.env') });

const pool = require('../server/src/config/db');
const payrollRunsDb = require('../server/src/db/payrollRunsDb');
const payslipsDb = require('../server/src/db/payslipsDb');
const { computePayslip, postPayrollExpenses } = require('../server/src/services/payrollCalculator');

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------
// 1. Redistribute trainer-member assignments
// ---------------------------------------------------------------------

async function redistributeAssignments() {
  const members = shuffle((await pool.query('SELECT id FROM members ORDER BY id')).rows.map((r) => r.id));
  const trainers = (await pool.query('SELECT id FROM trainers ORDER BY id')).rows.map((r) => r.id);
  const distribution = [45, 38, 30, 28, 18];

  if (members.length !== distribution.reduce((a, b) => a + b, 0)) {
    console.warn(`Warning: ${members.length} members but distribution sums to ${distribution.reduce((a, b) => a + b, 0)} — adjusting the last bucket to cover everyone.`);
    distribution[distribution.length - 1] += members.length - distribution.reduce((a, b) => a + b, 0);
  }

  await pool.query(`UPDATE trainer_member_assignments SET is_active = FALSE WHERE is_active = TRUE`);

  let cursor = 0;
  for (let i = 0; i < trainers.length; i++) {
    const count = distribution[i];
    const slice = members.slice(cursor, cursor + count);
    cursor += count;
    for (const memberId of slice) {
      await pool.query(
        `INSERT INTO trainer_member_assignments (trainer_id, member_id, is_active) VALUES ($1,$2,TRUE)`,
        [trainers[i], memberId]
      );
    }
    console.log(`  Trainer ${trainers[i]}: ${slice.length} members assigned`);
  }
}

// ---------------------------------------------------------------------
// 2. Rebalance expenses: lower rent, lower trainer base salaries
// ---------------------------------------------------------------------

async function rebalanceRent(newMonthlyRent) {
  const result = await pool.query(
    `UPDATE expenses SET amount = $1 WHERE category_id = (SELECT id FROM expense_categories WHERE name = 'Rent') RETURNING id`,
    [newMonthlyRent]
  );
  console.log(`  Updated ${result.rows.length} rent expense rows to ₹${newMonthlyRent}/month.`);
}

async function rebalanceSalaries(salaryByTrainerId) {
  for (const [trainerId, baseSalary] of Object.entries(salaryByTrainerId)) {
    await pool.query('UPDATE employees SET base_salary = $1 WHERE trainer_id = $2', [baseSalary, Number(trainerId)]);
  }
  console.log(`  Updated base salaries for ${Object.keys(salaryByTrainerId).length} employees.`);
}

// ---------------------------------------------------------------------
// 3. Wipe and regenerate all 12 payroll runs from scratch
// ---------------------------------------------------------------------

async function regeneratePayroll(adminUserId) {
  // payslips.expense_id -> expenses has no ON DELETE action, so the
  // referencing payslips must go first (via the payroll_runs cascade)
  // before the expense rows they point to can be deleted.
  const linkedExpenseIds = (await pool.query('SELECT expense_id FROM payslips WHERE expense_id IS NOT NULL')).rows.map((r) => r.expense_id);
  await pool.query('DELETE FROM payroll_runs'); // cascades to payslips
  if (linkedExpenseIds.length > 0) {
    await pool.query('DELETE FROM expenses WHERE id = ANY($1)', [linkedExpenseIds]);
  }
  console.log(`  Cleared all payroll runs and ${linkedExpenseIds.length} old payroll-linked expenses.`);

  const employees = (await pool.query('SELECT * FROM employees WHERE is_active = TRUE')).rows;
  const today = new Date();
  let runCount = 0;
  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    const run = await payrollRunsDb.findOrCreateDraft(month, year, adminUserId);
    const payslips = [];
    for (const employee of employees) {
      payslips.push(await computePayslip(employee, year, month));
    }
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
    runCount++;
  }
  console.log(`  Regenerated and finalized ${runCount} payroll runs.`);
}

// ---------------------------------------------------------------------

async function reportMargin() {
  const to = new Date().toISOString().slice(0, 10);
  const fromD = new Date();
  fromD.setMonth(fromD.getMonth() - 12);
  const from = fromD.toISOString().slice(0, 10);

  const revenue = (await pool.query('SELECT COALESCE(SUM(amount),0)::numeric AS total FROM payments WHERE payment_date BETWEEN $1 AND $2', [from, to])).rows[0].total;
  const expenses = (await pool.query('SELECT COALESCE(SUM(amount),0)::numeric AS total FROM expenses WHERE expense_date BETWEEN $1 AND $2', [from, to])).rows[0].total;
  const profit = Number(revenue) - Number(expenses);
  const margin = (profit / Number(revenue)) * 100;
  console.log(`\nFinal P&L (trailing 12 months): revenue ₹${Number(revenue).toLocaleString('en-IN')}, expenses ₹${Number(expenses).toLocaleString('en-IN')}, profit ₹${profit.toLocaleString('en-IN')}, margin ${margin.toFixed(1)}%`);
  return margin;
}

async function main() {
  try {
    const adminUser = (await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`)).rows[0];
    if (!adminUser) throw new Error('Expected an admin user to exist.');

    console.log('Redistributing trainer-member assignments...');
    await redistributeAssignments();

    console.log('Rebalancing rent...');
    await rebalanceRent(22000);

    console.log('Rebalancing trainer base salaries...');
    const trainerIds = (await pool.query('SELECT id FROM trainers ORDER BY id')).rows.map((r) => r.id);
    const salaries = [14000, 13000, 11000, 10500, 9000]; // correlated with assignment load (45/38/30/28/18)
    const salaryMap = {};
    trainerIds.forEach((id, i) => { salaryMap[id] = salaries[i]; });
    await rebalanceSalaries(salaryMap);

    console.log('Regenerating payroll from scratch...');
    await regeneratePayroll(adminUser.id);

    await reportMargin();
    console.log('\nDone.');
  } catch (err) {
    console.error('Failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
