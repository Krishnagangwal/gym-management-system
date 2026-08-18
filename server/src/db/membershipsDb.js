const pool = require('../config/db');

async function hasActiveMembership(memberId) {
  const result = await pool.query(
    `SELECT 1 FROM memberships WHERE member_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE LIMIT 1`,
    [memberId]
  );
  return result.rowCount > 0;
}

async function create({ memberId, planId, startDate, durationDays }) {
  const result = await pool.query(
    `INSERT INTO memberships (member_id, plan_id, start_date, end_date, status)
     VALUES ($1, $2, $3, $3::date + ($4 || ' days')::interval, 'active') RETURNING *`,
    [memberId, planId, startDate, durationDays]
  );
  return result.rows[0];
}

async function findByMember(memberId) {
  const result = await pool.query(
    `SELECT m.*, p.name AS plan_name, p.price AS plan_price
     FROM memberships m JOIN membership_plans p ON p.id = m.plan_id
     WHERE m.member_id = $1 ORDER BY m.start_date DESC`,
    [memberId]
  );
  return result.rows;
}

async function findAll({ status }) {
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = 'WHERE m.status = $1';
  }
  const result = await pool.query(
    `SELECT m.*, mem.first_name, mem.last_name, p.name AS plan_name
     FROM memberships m
     JOIN members mem ON mem.id = m.member_id
     JOIN membership_plans p ON p.id = m.plan_id
     ${where} ORDER BY m.end_date ASC`,
    params
  );
  return result.rows;
}

module.exports = { hasActiveMembership, create, findByMember, findAll };
