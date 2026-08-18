const pool = require('../config/db');

async function create({ memberId, membershipId, amount, paymentDate, paymentMethod }) {
  const result = await pool.query(
    `INSERT INTO payments (member_id, membership_id, amount, payment_date, payment_method)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [memberId, membershipId, amount, paymentDate, paymentMethod]
  );
  return result.rows[0];
}

async function findAll({ memberId }) {
  const params = [];
  let where = '';
  if (memberId) {
    params.push(memberId);
    where = 'WHERE p.member_id = $1';
  }
  const result = await pool.query(
    `SELECT p.*, m.first_name, m.last_name
     FROM payments p JOIN members m ON m.id = p.member_id
     ${where} ORDER BY p.payment_date DESC`,
    params
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT p.*, m.first_name, m.last_name, m.email, ms.start_date, ms.end_date, mp.name AS plan_name
     FROM payments p
     JOIN members m ON m.id = p.member_id
     JOIN memberships ms ON ms.id = p.membership_id
     JOIN membership_plans mp ON mp.id = ms.plan_id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0];
}

async function sumForMonth(month) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM payments WHERE to_char(payment_date, 'YYYY-MM') = $1`,
    [month]
  );
  return result.rows[0].total;
}

async function findRecent(limit) {
  const result = await pool.query(
    `SELECT p.*, m.first_name, m.last_name
     FROM payments p JOIN members m ON m.id = p.member_id
     ORDER BY p.payment_date DESC, p.id DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

module.exports = { create, findAll, findById, sumForMonth, findRecent };
