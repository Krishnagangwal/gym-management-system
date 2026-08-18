const pool = require('../config/db');

async function create({ firstName, lastName, email, phone, dateOfBirth, gender, address }) {
  const result = await pool.query(
    `INSERT INTO members (first_name, last_name, email, phone, date_of_birth, gender, address)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [firstName, lastName, email, phone, dateOfBirth || null, gender || null, address || null]
  );
  return result.rows[0];
}

async function findAll({ search, isActive }) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`is_active = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(`SELECT * FROM members ${where} ORDER BY id DESC`, params);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
  return result.rows[0];
}

async function update(id, { firstName, lastName, email, phone, dateOfBirth, gender, address }) {
  const result = await pool.query(
    `UPDATE members SET first_name=$1, last_name=$2, email=$3, phone=$4,
       date_of_birth=$5, gender=$6, address=$7, updated_at=NOW()
     WHERE id=$8 RETURNING *`,
    [firstName, lastName, email, phone, dateOfBirth || null, gender || null, address || null, id]
  );
  return result.rows[0];
}

async function setActive(id, isActive) {
  const result = await pool.query(
    'UPDATE members SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [isActive, id]
  );
  return result.rows[0];
}

module.exports = { create, findAll, findById, update, setActive };
