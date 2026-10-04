const pool = require('../config/db');

async function create({ employeeId, leaveType, fromDate, toDate, days, reason }) {
  const result = await pool.query(
    `INSERT INTO leave_requests (employee_id, leave_type, from_date, to_date, days, reason)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [employeeId, leaveType, fromDate, toDate, days, reason || null]
  );
  return result.rows[0];
}

async function findAll() {
  const result = await pool.query(
    `SELECT lr.*, e.employee_code, t.first_name, t.last_name
     FROM leave_requests lr
     JOIN employees e ON e.id = lr.employee_id
     LEFT JOIN trainers t ON t.id = e.trainer_id
     ORDER BY lr.created_at DESC`
  );
  return result.rows;
}

async function findByEmployee(employeeId) {
  const result = await pool.query('SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC', [employeeId]);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
  return result.rows[0];
}

// Called from approvalsController's leave ON_APPROVE/ON_REJECT handlers,
// inside the same transaction as the approval_requests status update.
async function setStatus(id, status, approvedBy, db = pool) {
  const result = await db.query(
    'UPDATE leave_requests SET status = $1, approved_by = $2 WHERE id = $3 RETURNING *',
    [status, approvedBy || null, id]
  );
  return result.rows[0];
}

module.exports = { create, findAll, findByEmployee, findById, setStatus };
