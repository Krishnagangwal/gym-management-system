const pool = require('../config/db');

async function create({ name }) {
  const result = await pool.query(
    'INSERT INTO expense_categories (name) VALUES ($1) RETURNING *',
    [name]
  );
  return result.rows[0];
}

async function findAll() {
  const result = await pool.query('SELECT * FROM expense_categories ORDER BY name');
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM expense_categories WHERE id = $1', [id]);
  return result.rows[0];
}

async function update(id, { name, isActive }) {
  const result = await pool.query(
    'UPDATE expense_categories SET name = $1, is_active = $2 WHERE id = $3 RETURNING *',
    [name, isActive, id]
  );
  return result.rows[0];
}

module.exports = { create, findAll, findById, update };
