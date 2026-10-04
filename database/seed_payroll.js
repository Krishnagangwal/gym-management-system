/*
 * Seeds the HR & Payroll module: an employee record for each of the 5
 * existing trainers, 12 months of their staff attendance, and 12 finalized
 * payroll runs computed from that attendance via the exact same
 * server/src/services/payrollCalculator.js the live app uses.
 *
 * Reconciliation: seed_finance.js already posted ~60 ad-hoc "Trainer
 * Salaries" expense rows (one per trainer per month) directly into
 * `expenses`, before this module existed. Finalizing 12 real payroll runs
 * for the same 5 trainers x 12 months would double-count that category in
 * the P&L, so this script deletes those old ad-hoc rows first and lets the
 * new payroll-computed ones (linked via payslips.expense_id) replace them.
 *
 * Reuses the real server/src modules (see seed_finance.js for why the
 * cross-directory require works). Safe to re-run — each part below is
 * independently idempotent.
 *
 * Usage: node database/seed_payroll.js
 */
const path = require('path');
require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '../server/.env') });

const pool = require('../server/src/config/db');
const employeesDb = require('../server/src/db/employeesDb');
const payrollRunsDb = require('../server/src/db/payrollRunsDb');
const payslipsDb = require('../server/src/db/payslipsDb');
const { computePayslip, postPayrollExpenses } = require('../server/src/services/payrollCalculator');

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
function toTimeStr(hour, minute) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

// ---------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------

async function ensureEmployees() {
  const already = await pool.query('SELECT COUNT(*)::int AS count FROM employees');
  if (already.rows[0].count > 0) {
    console.log('Employees already seeded, skipping.');
    return (await pool.query('SELECT * FROM employees')).rows;
  }

  const trainers = (await pool.query('SELECT * FROM trainers ORDER BY id')).rows;
  const employees = [];
  for (const t of trainers) {
    const employee = await employeesDb.create({
      trainerId: t.id,
      designation: t.specialization ? `${t.specialization} Trainer` : 'Trainer',
      department: 'Fitness',
      dateOfJoining: toDateStr(addDays(new Date(), -randInt(200, 1000))),
      employmentType: 'full_time',
      baseSalary: randInt(18000, 25000),
      perSessionRate: randInt(50, 150),
      bankAccountLast4: String(randInt(1000, 9999)),
    });
    employees.push(employee);
  }
  console.log(`Seeded ${employees.length} employee records for existing trainers.`);
  return employees;
}

// ---------------------------------------------------------------------
// 12 months of staff attendance
// ---------------------------------------------------------------------

async function batchInsertAttendance(rows) {
  const columns = ['employee_id', 'date', 'check_in', 'check_out', 'status'];
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = [];
    const placeholders = chunk.map((row, r) => {
      const offset = r * columns.length;
      columns.forEach((col) => values.push(row[col]));
      return `(${columns.map((_, c) => `$${offset + c + 1}`).join(',')})`;
    });
    await pool.query(`INSERT INTO staff_attendance (${columns.join(',')}) VALUES ${placeholders.join(',')}`, values);
  }
}

async function seedAttendance(employees) {
  const already = await pool.query('SELECT COUNT(*)::int AS count FROM staff_attendance');
  if (already.rows[0].count > 0) {
    console.log('Staff attendance already seeded, skipping.');
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = addDays(today, -365);

  const rows = [];
  for (const employee of employees) {
    let cursor = new Date(start);
    while (cursor <= today) {
      const r = Math.random();
      let status;
      if (r < 0.85) status = 'present';
      else if (r < 0.90) status = 'half_day';
      else if (r < 0.95) status = 'absent';
      else status = 'leave';

      let checkIn = null;
      let checkOut = null;
      if (status === 'present') {
        const inHour = randInt(6, 8);
        const inMinute = randInt(0, 59);
        checkIn = toTimeStr(inHour, inMinute);
        checkOut = toTimeStr(inHour + randInt(8, 10), inMinute);
      } else if (status === 'half_day') {
        const inHour = randInt(6, 8);
        const inMinute = randInt(0, 59);
        checkIn = toTimeStr(inHour, inMinute);
        checkOut = toTimeStr(inHour + randInt(3, 5), inMinute);
      }

      rows.push({ employee_id: employee.id, date: toDateStr(cursor), check_in: checkIn, check_out: checkOut, status });
      cursor = addDays(cursor, 1);
    }
  }

  await batchInsertAttendance(rows);
  console.log(`Seeded ${rows.length} staff attendance records across 12 months.`);
}

// ---------------------------------------------------------------------
// Reconcile: remove the ad-hoc "Trainer Salaries" expenses seed_finance.js
// created, before payroll starts posting the real ones.
// ---------------------------------------------------------------------

async function reconcileOldSalaryExpenses(employees) {
  const trainerNames = (await pool.query(
    `SELECT t.first_name, t.last_name FROM trainers t JOIN employees e ON e.trainer_id = t.id WHERE e.id = ANY($1)`,
    [employees.map((e) => e.id)]
  )).rows.map((r) => `${r.first_name} ${r.last_name}`);

  const result = await pool.query(
    `DELETE FROM expenses
     WHERE category_id = (SELECT id FROM expense_categories WHERE name = 'Trainer Salaries')
       AND vendor_name = ANY($1)
     RETURNING id`,
    [trainerNames]
  );
  console.log(`Reconciled (removed) ${result.rows.length} ad-hoc trainer-salary expense rows from seed_finance.js.`);
}

// ---------------------------------------------------------------------
// 12 finalized payroll runs
// ---------------------------------------------------------------------

async function seedPayrollRuns(employees, adminUserId) {
  const already = await pool.query('SELECT COUNT(*)::int AS count FROM payroll_runs');
  if (already.rows[0].count > 0) {
    console.log('Payroll runs already seeded, skipping.');
    return;
  }

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
  console.log(`Generated and finalized ${runCount} payroll runs.`);
}

// ---------------------------------------------------------------------

async function main() {
  try {
    const adminUser = (await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`)).rows[0];
    if (!adminUser) throw new Error('Expected an admin user to exist (run database/seed.sql first).');

    const employees = await ensureEmployees();
    await seedAttendance(employees);
    await reconcileOldSalaryExpenses(employees);
    await seedPayrollRuns(employees, adminUser.id);

    console.log('\nDone.');
  } catch (err) {
    console.error('Failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
