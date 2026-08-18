const pool = require('../config/db');

async function create({ name, description, durationDays, price }) {
  const result = await pool.query(
    `INSERT INTO membership_plans (name, description, duration_days, price) VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, description || null, durationDays, price]
  );
  return result.rows[0];
}

async function findAll() {
  const result = await pool.query('SELECT * FROM membership_plans ORDER BY id');
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM membership_plans WHERE id = $1', [id]);
  return result.rows[0];
}

async function update(id, { name, description, durationDays, price, isActive }) {
  const result = await pool.query(
    `UPDATE membership_plans SET name=$1, description=$2, duration_days=$3, price=$4, is_active=$5 WHERE id=$6 RETURNING *`,
    [name, description || null, durationDays, price, isActive, id]
  );
  return result.rows[0];
}

module.exports = { create, findAll, findById, update };
