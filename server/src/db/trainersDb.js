const pool = require('../config/db');

async function create({ firstName, lastName, email, phone, specialization, availability }) {
  const result = await pool.query(
    `INSERT INTO trainers (first_name, last_name, email, phone, specialization, availability)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [firstName, lastName, email, phone || null, specialization || null, availability || null]
  );
  return result.rows[0];
}

async function findAll() {
  const result = await pool.query('SELECT * FROM trainers ORDER BY id');
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM trainers WHERE id = $1', [id]);
  return result.rows[0];
}

async function update(id, { firstName, lastName, email, phone, specialization, availability }) {
  const result = await pool.query(
    `UPDATE trainers SET first_name=$1, last_name=$2, email=$3, phone=$4, specialization=$5, availability=$6 WHERE id=$7 RETURNING *`,
    [firstName, lastName, email, phone || null, specialization || null, availability || null, id]
  );
  return result.rows[0];
}

async function setActive(id, isActive) {
  const result = await pool.query('UPDATE trainers SET is_active=$1 WHERE id=$2 RETURNING *', [isActive, id]);
  return result.rows[0];
}

async function deactivateAssignments(memberId) {
  await pool.query('UPDATE trainer_member_assignments SET is_active = FALSE WHERE member_id = $1 AND is_active = TRUE', [memberId]);
}

async function assign(trainerId, memberId) {
  const result = await pool.query(
    `INSERT INTO trainer_member_assignments (trainer_id, member_id) VALUES ($1,$2) RETURNING *`,
    [trainerId, memberId]
  );
  return result.rows[0];
}

async function currentTrainerForMember(memberId) {
  const result = await pool.query(
    `SELECT t.* FROM trainer_member_assignments tma
     JOIN trainers t ON t.id = tma.trainer_id
     WHERE tma.member_id = $1 AND tma.is_active = TRUE
     ORDER BY tma.assigned_date DESC LIMIT 1`,
    [memberId]
  );
  return result.rows[0];
}

module.exports = { create, findAll, findById, update, setActive, deactivateAssignments, assign, currentTrainerForMember };
