const pool = require('../config/db');

async function hasActiveMembership(memberId) {
  const result = await pool.query(
    `SELECT 1 FROM memberships WHERE member_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE LIMIT 1`,
    [memberId]
  );
  return result.rowCount > 0;
}

// `db` defaults to the pool but accepts a checked-out client so callers
// (e.g. membershipController, which also inserts the auto-generated
// invoice) can run both inserts in one transaction.
async function create({ memberId, planId, startDate, durationDays }, db = pool) {
  const result = await db.query(
    `INSERT INTO memberships (member_id, plan_id, start_date, end_date, status)
     VALUES ($1, $2, $3, $3::date + ($4 || ' days')::interval, 'active') RETURNING *`,
    [memberId, planId, startDate, durationDays]
  );
  return result.rows[0];
}

async function findByMember(memberId) {
  const result = await pool.query(
    `SELECT m.*, p.name AS plan_name, p.price AS plan_price, i.id AS invoice_id, i.invoice_number
     FROM memberships m
     JOIN membership_plans p ON p.id = m.plan_id
     LEFT JOIN invoices i ON i.membership_id = m.id
     WHERE m.member_id = $1 ORDER BY m.start_date DESC`,
    [memberId]
  );
  return result.rows;
}

async function findAll({ status }) {
  // "active"/"expired" are derived from end_date, not the stored status column:
  // nothing in this app flips status to 'expired' over time, so filtering on
  // the literal column would always return an empty "expired" list.
  let where = '';
  if (status === 'active') {
    where = "WHERE m.status = 'active' AND m.end_date >= CURRENT_DATE";
  } else if (status === 'expired') {
    where = 'WHERE m.end_date < CURRENT_DATE';
  }
  const result = await pool.query(
    `SELECT m.*, mem.first_name, mem.last_name, p.name AS plan_name
     FROM memberships m
     JOIN members mem ON mem.id = m.member_id
     JOIN membership_plans p ON p.id = m.plan_id
     ${where} ORDER BY m.end_date ASC`
  );
  return result.rows;
}

async function findCurrentForMember(memberId) {
  const result = await pool.query(
    `SELECT m.*, p.name AS plan_name, p.price AS plan_price,
            (m.end_date - CURRENT_DATE) AS days_remaining
     FROM memberships m JOIN membership_plans p ON p.id = m.plan_id
     WHERE m.member_id = $1 AND m.status = 'active' AND m.end_date >= CURRENT_DATE
     ORDER BY m.end_date DESC LIMIT 1`,
    [memberId]
  );
  return result.rows[0];
}

// Same rows as findByMember, plus a DB-computed is_expired flag — used by
// the member portal, which (unlike the admin history view) needs an
// accurate expired/active label rather than the literal status column
// (see the comment on findAll: nothing in this app ever flips status to
// 'expired' over time).
async function findByMemberWithStatus(memberId) {
  const result = await pool.query(
    `SELECT m.*, p.name AS plan_name, p.price AS plan_price,
            (m.end_date < CURRENT_DATE) AS is_expired
     FROM memberships m JOIN membership_plans p ON p.id = m.plan_id
     WHERE m.member_id = $1 ORDER BY m.start_date DESC`,
    [memberId]
  );
  return result.rows;
}

module.exports = {
  hasActiveMembership, create, findByMember, findAll,
  findCurrentForMember, findByMemberWithStatus,
};
