/*
 * Seeds the Finance module with 12 months of realistic expenses, backfills
 * GST invoices for every existing membership (both seed.sql's original 7
 * and seed_demo.js's ~150), and creates a batch of deliberately-unpaid
 * renewal invoices so the Receivables Aging report has real 0-30/31-60/61+
 * buckets to show.
 *
 * Reuses the actual server/src/db modules rather than reimplementing their
 * logic, so seeded invoices go through the exact same tax/numbering code
 * the live app uses (their own require('pg') etc. still resolve correctly
 * from here, since Node resolves relative to each file's own location).
 * Safe to re-run — each part below is independently idempotent.
 *
 * Usage: node database/seed_finance.js
 */
const path = require('path');
require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '../server/.env') });

const pool = require('../server/src/config/db');
const expenseCategoriesDb = require('../server/src/db/expenseCategoriesDb');
const expensesDb = require('../server/src/db/expensesDb');
const invoicesDb = require('../server/src/db/invoicesDb');

// ---------------------------------------------------------------------
// Random helpers (same UTC-shift-safe date formatting as seed_demo.js)
// ---------------------------------------------------------------------

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randChoice(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function toDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------
// Expense categories + 12 months of expenses
// ---------------------------------------------------------------------

const CATEGORY_NAMES = ['Rent', 'Trainer Salaries', 'Electricity', 'Equipment', 'Maintenance', 'Marketing', 'Other'];
const EQUIPMENT_VENDORS = ['FitPro Equipments', 'IronWorks Supplies', 'Cardio Solutions Inc'];
const MARKETING_VENDORS = ['Social Ads Co', 'Local Print Media', 'Influencer Partnership'];

async function ensureCategories() {
  const categories = {};
  for (const name of CATEGORY_NAMES) {
    const existing = await pool.query('SELECT * FROM expense_categories WHERE name = $1', [name]);
    categories[name] = existing.rows[0] || await expenseCategoriesDb.create({ name });
  }
  return categories;
}

async function seedExpenses(categories) {
  const already = await pool.query('SELECT COUNT(*)::int AS count FROM expenses');
  if (already.rows[0].count > 0) {
    console.log('Expenses already seeded, skipping.');
    return;
  }

  const trainers = (await pool.query('SELECT id, first_name, last_name FROM trainers ORDER BY id')).rows;

  let count = 0;
  const today = new Date();
  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);

    await expensesDb.create({
      categoryId: categories.Rent.id, amount: 40000, expenseDate: toDateStr(addDays(monthDate, randInt(0, 4))),
      vendorName: 'Property Owner', paymentMethod: 'bank_transfer', description: 'Monthly gym premises rent',
    });
    count++;

    for (const t of trainers) {
      await expensesDb.create({
        categoryId: categories['Trainer Salaries'].id, amount: randInt(15000, 22000),
        expenseDate: toDateStr(addDays(monthDate, randInt(0, 5))),
        vendorName: `${t.first_name} ${t.last_name}`, paymentMethod: 'bank_transfer', description: 'Monthly salary',
      });
      count++;
    }

    await expensesDb.create({
      categoryId: categories.Electricity.id, amount: randInt(8000, 15000),
      expenseDate: toDateStr(addDays(monthDate, randInt(3, 10))),
      vendorName: 'State Electricity Board', paymentMethod: randChoice(['bank_transfer', 'upi']), description: 'Electricity bill',
    });
    count++;

    if (Math.random() < 0.85) {
      await expensesDb.create({
        categoryId: categories.Maintenance.id, amount: randInt(2000, 8000),
        expenseDate: toDateStr(addDays(monthDate, randInt(5, 20))),
        vendorName: 'Facility Maintenance Co', paymentMethod: randChoice(['cash', 'upi']), description: 'Equipment/facility upkeep',
      });
      count++;
    }

    if (Math.random() < 0.33) {
      await expensesDb.create({
        categoryId: categories.Equipment.id, amount: randInt(15000, 80000),
        expenseDate: toDateStr(addDays(monthDate, randInt(0, 25))),
        vendorName: randChoice(EQUIPMENT_VENDORS), paymentMethod: randChoice(['bank_transfer', 'card']), description: 'Gym equipment purchase',
      });
      count++;
    }

    if (monthsAgo % 3 === 0) {
      await expensesDb.create({
        categoryId: categories.Marketing.id, amount: randInt(5000, 20000),
        expenseDate: toDateStr(addDays(monthDate, randInt(0, 15))),
        vendorName: randChoice(MARKETING_VENDORS), paymentMethod: randChoice(['card', 'upi']), description: 'Marketing campaign',
      });
      count++;
    }
  }
  console.log(`Seeded ${count} expenses across 12 months.`);
}

// ---------------------------------------------------------------------
// Backfill invoices for memberships created before this module existed
// ---------------------------------------------------------------------

async function backfillInvoices() {
  const pending = await pool.query(
    `SELECT m.id AS membership_id, m.member_id, m.plan_id, m.start_date, p.price
     FROM memberships m
     JOIN membership_plans p ON p.id = m.plan_id
     LEFT JOIN invoices i ON i.membership_id = m.id
     WHERE i.id IS NULL
     ORDER BY m.start_date ASC`
  );

  if (pending.rows.length === 0) {
    console.log('No memberships need invoice backfill.');
    return;
  }

  console.log(`Backfilling invoices for ${pending.rows.length} memberships...`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let count = 0;
    for (const row of pending.rows) {
      const invoice = await invoicesDb.generateForMembership({
        memberId: row.member_id, membershipId: row.membership_id, subtotal: row.price, issueDate: row.start_date,
      }, client);

      // Every seeded membership already has exactly one matching payment
      // (both seed.sql and seed_demo.js insert 1:1) — link and settle it.
      const payment = await client.query('SELECT id FROM payments WHERE membership_id = $1 LIMIT 1', [row.membership_id]);
      if (payment.rows[0]) {
        await client.query('UPDATE payments SET invoice_id = $1 WHERE id = $2', [invoice.id, payment.rows[0].id]);
        await client.query(`UPDATE invoices SET status = 'paid' WHERE id = $1`, [invoice.id]);
      }
      count++;
      if (count % 100 === 0) console.log(`  ...${count}/${pending.rows.length} invoices backfilled`);
    }
    await client.query('COMMIT');
    console.log(`Backfilled ${count} invoices.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------
// A handful of unpaid renewal invoices, spread across the aging buckets,
// so the Receivables Aging report has something real to show. Picks
// members whose latest membership has already lapsed and gives them one
// new (unpaid) renewal period — doesn't touch any existing paid history.
// ---------------------------------------------------------------------

async function seedPendingInvoices() {
  const already = await pool.query(`SELECT COUNT(*)::int AS count FROM invoices WHERE status = 'issued'`);
  if (already.rows[0].count > 0) {
    console.log('Pending/unpaid invoices already exist, skipping.');
    return;
  }

  const candidates = await pool.query(
    `SELECT m.id AS member_id,
            (SELECT plan_id FROM memberships WHERE member_id = m.id ORDER BY start_date DESC LIMIT 1) AS plan_id
     FROM members m
     JOIN memberships ms ON ms.member_id = m.id
     GROUP BY m.id
     HAVING MAX(ms.end_date) < CURRENT_DATE
     ORDER BY random()
     LIMIT 24`
  );

  if (candidates.rows.length === 0) {
    console.log('No lapsed members available to seed pending invoices for.');
    return;
  }

  // 0-30 / 31-60 / 61+ days overdue — cycled across the candidate list.
  const BUCKET_RANGES = [[5, 25], [35, 55], [65, 90]];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let count = 0;
    for (let i = 0; i < candidates.rows.length; i++) {
      const { member_id: memberId, plan_id: planId } = candidates.rows[i];
      const planResult = await client.query('SELECT duration_days, price FROM membership_plans WHERE id = $1', [planId]);
      const plan = planResult.rows[0];
      if (!plan) continue;

      const [minDays, maxDays] = BUCKET_RANGES[i % BUCKET_RANGES.length];
      const startDate = addDays(new Date(), -randInt(minDays, maxDays));
      const endDate = addDays(startDate, plan.duration_days);

      const membershipResult = await client.query(
        `INSERT INTO memberships (member_id, plan_id, start_date, end_date, status)
         VALUES ($1,$2,$3,$4,'active') RETURNING id`,
        [memberId, planId, toDateStr(startDate), toDateStr(endDate)]
      );

      await invoicesDb.generateForMembership({
        memberId, membershipId: membershipResult.rows[0].id, subtotal: plan.price, issueDate: toDateStr(startDate),
      }, client);
      count++;
    }
    await client.query('COMMIT');
    console.log(`Seeded ${count} unpaid renewal invoices for the receivables aging report.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------

async function main() {
  try {
    const categories = await ensureCategories();
    await seedExpenses(categories);
    await backfillInvoices();
    await seedPendingInvoices();
    console.log('\nDone.');
  } catch (err) {
    console.error('Failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
