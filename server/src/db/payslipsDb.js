const pool = require('../config/db');

// A draft run must be recomputable — wipe and reinsert rather than upsert,
// so a changed attendance record or salary edit is fully reflected.
async function replaceForRun(payrollRunId, payslips, db = pool) {
  await db.query('DELETE FROM payslips WHERE payroll_run_id = $1', [payrollRunId]);
  const inserted = [];
  for (const p of payslips) {
    const result = await db.query(
      `INSERT INTO payslips (payroll_run_id, employee_id, base_salary, session_commission, allowances, deductions, gross, net, days_present, days_absent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [payrollRunId, p.employeeId, p.baseSalary, p.sessionCommission, p.allowances, p.deductions, p.gross, p.net, p.daysPresent, p.daysAbsent]
    );
    inserted.push(result.rows[0]);
  }
  return inserted;
}

async function findForRun(payrollRunId) {
  const result = await pool.query(
    `SELECT ps.*, e.employee_code, t.first_name, t.last_name
     FROM payslips ps
     JOIN employees e ON e.id = ps.employee_id
     LEFT JOIN trainers t ON t.id = e.trainer_id
     WHERE ps.payroll_run_id = $1
     ORDER BY e.id`,
    [payrollRunId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT ps.*, e.employee_code, e.designation, e.bank_account_last4, t.first_name, t.last_name,
            pr.month, pr.year, pr.status AS run_status
     FROM payslips ps
     JOIN employees e ON e.id = ps.employee_id
     LEFT JOIN trainers t ON t.id = e.trainer_id
     JOIN payroll_runs pr ON pr.id = ps.payroll_run_id
     WHERE ps.id = $1`,
    [id]
  );
  return result.rows[0];
}

async function setExpenseId(id, expenseId, db = pool) {
  await db.query('UPDATE payslips SET expense_id = $1 WHERE id = $2', [expenseId, id]);
}

module.exports = { replaceForRun, findForRun, findById, setExpenseId };
