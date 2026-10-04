const pool = require('../config/db');

// employee_code is derived from the new row's id (EMP0001, EMP0002, ...) so
// it's a two-step insert-then-update rather than computed up front.
async function create({ trainerId, userId, designation, department, dateOfJoining, employmentType, baseSalary, perSessionRate, bankAccountLast4 }) {
  const inserted = await pool.query(
    `INSERT INTO employees (trainer_id, user_id, employee_code, designation, department, date_of_joining, employment_type, base_salary, per_session_rate, bank_account_last4)
     VALUES ($1,$2,'PENDING',$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      trainerId || null, userId || null, designation || null, department || null,
      dateOfJoining || new Date().toISOString().slice(0, 10), employmentType || 'full_time',
      baseSalary, perSessionRate || 0, bankAccountLast4 || null,
    ]
  );
  const id = inserted.rows[0].id;
  const code = `EMP${String(id).padStart(4, '0')}`;
  const result = await pool.query('UPDATE employees SET employee_code = $1 WHERE id = $2 RETURNING *', [code, id]);
  return result.rows[0];
}

async function findAll() {
  const result = await pool.query(
    `SELECT e.*, t.first_name AS trainer_first_name, t.last_name AS trainer_last_name, t.specialization
     FROM employees e LEFT JOIN trainers t ON t.id = e.trainer_id
     ORDER BY e.id`
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT e.*, t.first_name AS trainer_first_name, t.last_name AS trainer_last_name
     FROM employees e LEFT JOIN trainers t ON t.id = e.trainer_id
     WHERE e.id = $1`,
    [id]
  );
  return result.rows[0];
}

async function findByTrainerId(trainerId) {
  const result = await pool.query('SELECT * FROM employees WHERE trainer_id = $1', [trainerId]);
  return result.rows[0];
}

async function update(id, { designation, department, dateOfJoining, employmentType, baseSalary, perSessionRate, bankAccountLast4 }) {
  const result = await pool.query(
    `UPDATE employees SET designation=$1, department=$2, date_of_joining=$3, employment_type=$4, base_salary=$5, per_session_rate=$6, bank_account_last4=$7
     WHERE id=$8 RETURNING *`,
    [designation || null, department || null, dateOfJoining, employmentType, baseSalary, perSessionRate || 0, bankAccountLast4 || null, id]
  );
  return result.rows[0];
}

async function setActive(id, isActive) {
  const result = await pool.query('UPDATE employees SET is_active = $1 WHERE id = $2 RETURNING *', [isActive, id]);
  return result.rows[0];
}

module.exports = { create, findAll, findById, findByTrainerId, update, setActive };
