const pool = require('../config/db');

async function create({ memberId, date, weight, bodyFat, chest, waist, arms, thighs, notes }) {
  const result = await pool.query(
    `INSERT INTO member_progress (member_id, date, weight, body_fat, chest, waist, arms, thighs, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [memberId, date || new Date().toISOString().slice(0, 10), weight || null, bodyFat || null, chest || null, waist || null, arms || null, thighs || null, notes || null]
  );
  return result.rows[0];
}

async function findForMember(memberId) {
  const result = await pool.query('SELECT * FROM member_progress WHERE member_id = $1 ORDER BY date ASC', [memberId]);
  return result.rows;
}

module.exports = { create, findForMember };
