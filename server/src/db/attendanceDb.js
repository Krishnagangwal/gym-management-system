const pool = require('../config/db');

async function checkIn(memberId) {
  const result = await pool.query(
    'INSERT INTO attendance (member_id) VALUES ($1) RETURNING *',
    [memberId]
  );
  return result.rows[0];
}

async function checkOut(id) {
  const result = await pool.query(
    'UPDATE attendance SET check_out_time = NOW() WHERE id = $1 AND check_out_time IS NULL RETURNING *',
    [id]
  );
  return result.rows[0];
}

async function findAll({ memberId, date, month }) {
  const conditions = [];
  const params = [];

  if (memberId) {
    params.push(memberId);
    conditions.push(`a.member_id = $${params.length}`);
  }
  if (date) {
    params.push(date);
    conditions.push(`a.check_in_time::date = $${params.length}`);
  }
  if (month) {
    params.push(month);
    conditions.push(`to_char(a.check_in_time, 'YYYY-MM') = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT a.*, m.first_name, m.last_name
     FROM attendance a JOIN members m ON m.id = a.member_id
     ${where} ORDER BY a.check_in_time DESC`,
    params
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM attendance WHERE id = $1', [id]);
  return result.rows[0];
}

async function countForDate(date) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM attendance WHERE check_in_time::date = $1`,
    [date]
  );
  return result.rows[0].count;
}

module.exports = { checkIn, checkOut, findAll, findById, countForDate };
