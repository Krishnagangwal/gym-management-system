const pool = require('../config/db');

async function mark({ employeeId, date, checkIn, checkOut, status }) {
  const result = await pool.query(
    `INSERT INTO staff_attendance (employee_id, date, check_in, check_out, status)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (employee_id, date) DO UPDATE SET check_in = $3, check_out = $4, status = $5
     RETURNING *`,
    [employeeId, date, checkIn || null, checkOut || null, status]
  );
  return result.rows[0];
}

async function findForMonth(year, month) {
  const result = await pool.query(
    `SELECT sa.*, e.employee_code, t.first_name, t.last_name
     FROM staff_attendance sa
     JOIN employees e ON e.id = sa.employee_id
     LEFT JOIN trainers t ON t.id = e.trainer_id
     WHERE EXTRACT(YEAR FROM sa.date) = $1 AND EXTRACT(MONTH FROM sa.date) = $2
     ORDER BY sa.date, e.id`,
    [year, month]
  );
  return result.rows;
}

async function findForEmployee(employeeId, { from, to } = {}) {
  const conditions = ['employee_id = $1'];
  const params = [employeeId];
  if (from) {
    params.push(from);
    conditions.push(`date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`date <= $${params.length}`);
  }
  const result = await pool.query(`SELECT * FROM staff_attendance WHERE ${conditions.join(' AND ')} ORDER BY date`, params);
  return result.rows;
}

// Used by payroll: 'present' counts as a full day, 'half_day' as half;
// 'absent' and 'leave' are unpaid (0) — see payrollController's comment on
// how this feeds base-salary pro-ration.
async function summaryForMonth(employeeId, year, month) {
  const result = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'present' THEN 1 WHEN status = 'half_day' THEN 0.5 ELSE 0 END), 0) AS days_present,
       COALESCE(SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END), 0) AS days_absent,
       COALESCE(SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END), 0) AS days_leave
     FROM staff_attendance
     WHERE employee_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3`,
    [employeeId, year, month]
  );
  return result.rows[0];
}

module.exports = { mark, findForMonth, findForEmployee, summaryForMonth };
