// Shared by payrollController (live runs) and database/seed_payroll.js (the
// 12-month seed) so both go through the exact same math — no risk of the
// seed's numbers drifting from what the app itself would compute.
const pool = require('../config/db');
const staffAttendanceDb = require('../db/staffAttendanceDb');
const payslipsDb = require('../db/payslipsDb');

const PF_RATE = 0.12;
// Simplified, illustrative TDS: 5% on the portion of annualized gross above
// a flat exemption. Real Indian income tax is slab-based and
// regime-dependent — this is deliberately not a tax engine, just enough to
// make payslips look realistic for a capstone P&L.
const TDS_ANNUAL_EXEMPTION = 250000;
const TDS_RATE = 0.05;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// Commission = per_session_rate x how many times this trainer's currently
// assigned members checked in during the month. Only trainers (employees
// with a linked trainer_id and a nonzero rate) earn this.
async function sessionCommissionFor(trainerId, year, month, rate) {
  if (!trainerId || !rate) return 0;
  const result = await pool.query(
    `SELECT COUNT(*)::int AS sessions
     FROM attendance a
     JOIN trainer_member_assignments tma ON tma.member_id = a.member_id AND tma.is_active = TRUE
     WHERE tma.trainer_id = $1
       AND EXTRACT(YEAR FROM a.check_in_time) = $2
       AND EXTRACT(MONTH FROM a.check_in_time) = $3`,
    [trainerId, year, month]
  );
  return round2(result.rows[0].sessions * Number(rate));
}

async function computePayslip(employee, year, month) {
  const totalDays = daysInMonth(year, month);
  const summary = await staffAttendanceDb.summaryForMonth(employee.id, year, month);
  const daysPresent = Number(summary.days_present);
  const daysAbsent = Number(summary.days_absent);

  const proratedBase = round2((Number(employee.base_salary) * daysPresent) / totalDays);
  const sessionCommission = await sessionCommissionFor(employee.trainer_id, year, month, employee.per_session_rate);
  const allowances = 0;
  const gross = round2(proratedBase + sessionCommission + allowances);

  const pf = round2(proratedBase * PF_RATE);
  const annualizedGross = gross * 12;
  const tds = annualizedGross > TDS_ANNUAL_EXEMPTION
    ? round2(((annualizedGross - TDS_ANNUAL_EXEMPTION) * TDS_RATE) / 12)
    : 0;
  const deductions = round2(pf + tds);
  const net = round2(gross - deductions);

  return {
    employeeId: employee.id, baseSalary: proratedBase, sessionCommission, allowances,
    deductions, gross, net, daysPresent, daysAbsent,
  };
}

// Posts one expense per payslip (category 'Trainer Salaries', amount =
// gross — the employer's full cost, not net-to-employee, since PF/TDS
// withheld from gross are still money the business spent) and links it
// back via payslips.expense_id. Shared by the live finalize endpoint and
// the 12-month seed so both post expenses identically.
async function postPayrollExpenses(run, payslips, recordedByUserId, db = pool) {
  const categoryResult = await db.query(`SELECT id FROM expense_categories WHERE name = 'Trainer Salaries' LIMIT 1`);
  const categoryId = categoryResult.rows[0]?.id;
  if (!categoryId) throw new Error("Expected a 'Trainer Salaries' expense category to exist");

  const lastDay = new Date(run.year, run.month, 0).toISOString().slice(0, 10);
  const createdExpenses = [];
  for (const p of payslips) {
    const name = p.first_name ? `${p.first_name} ${p.last_name}` : p.employee_code;
    const expenseResult = await db.query(
      `INSERT INTO expenses (category_id, amount, expense_date, vendor_name, payment_method, description, recorded_by)
       VALUES ($1,$2,$3,$4,'bank_transfer',$5,$6) RETURNING *`,
      [categoryId, p.gross, lastDay, name, `Payroll — ${run.month}/${run.year}`, recordedByUserId]
    );
    const expense = expenseResult.rows[0];
    await payslipsDb.setExpenseId(p.id, expense.id, db);
    createdExpenses.push(expense);
  }
  return createdExpenses;
}

module.exports = { computePayslip, sessionCommissionFor, daysInMonth, round2, postPayrollExpenses };
