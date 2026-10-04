const pool = require('../config/db');

async function findByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

async function findByMemberId(memberId) {
  const result = await pool.query('SELECT id, name, email, role FROM users WHERE member_id = $1', [memberId]);
  return result.rows[0];
}

async function findByTrainerId(trainerId) {
  const result = await pool.query('SELECT id, name, email, role FROM users WHERE trainer_id = $1', [trainerId]);
  return result.rows[0];
}

async function createForMember({ name, email, passwordHash, memberId }) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, member_id)
     VALUES ($1,$2,$3,'member',$4) RETURNING id, name, email, role, member_id`,
    [name, email, passwordHash, memberId]
  );
  return result.rows[0];
}

async function createForTrainer({ name, email, passwordHash, trainerId }) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, trainer_id)
     VALUES ($1,$2,$3,'trainer',$4) RETURNING id, name, email, role, trainer_id`,
    [name, email, passwordHash, trainerId]
  );
  return result.rows[0];
}

module.exports = { findByEmail, findByMemberId, findByTrainerId, createForMember, createForTrainer };
