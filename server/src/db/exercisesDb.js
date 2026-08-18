const pool = require('../config/db');

async function create({ name, description, muscleGroup }) {
  const result = await pool.query(
    'INSERT INTO exercises (name, description, muscle_group) VALUES ($1,$2,$3) RETURNING *',
    [name, description || null, muscleGroup || null]
  );
  return result.rows[0];
}

async function findAll() {
  const result = await pool.query('SELECT * FROM exercises ORDER BY id');
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM exercises WHERE id = $1', [id]);
  return result.rows[0];
}

module.exports = { create, findAll, findById };
