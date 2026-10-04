const pool = require('../config/db');
const documentSequencesDb = require('./documentSequencesDb');

const GST_RATE = 18.00; // 9% CGST + 9% SGST, intra-state — split 50/50 at display time

// Called from membershipController inside the same transaction as the
// membership insert, so `db` is a checked-out client, not the pool, when
// invoked from there. due_date = issue_date: gym membership payment is
// expected on the spot, so anything unpaid starts aging from day one.
async function generateForMembership({ memberId, membershipId, subtotal, issueDate }, db = pool) {
  // node-postgres returns NUMERIC columns as strings (to avoid float
  // precision loss) — callers often pass a value straight from a query
  // (e.g. membership_plans.price), so this must not be trusted as a number
  // yet. Left uncoerced, `subtotal + taxAmount` string-concatenates instead
  // of adding, silently dropping the tax from the total.
  subtotal = Number(subtotal);
  const taxAmount = Math.round(subtotal * GST_RATE) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  const fiscalYear = documentSequencesDb.fiscalYearFor(issueDate);
  const seqNumber = await documentSequencesDb.nextNumber('INV', fiscalYear, db);
  const invoiceNumber = `INV/${fiscalYear}/${String(seqNumber).padStart(4, '0')}`;

  const result = await db.query(
    `INSERT INTO invoices (invoice_number, member_id, membership_id, subtotal, tax_rate, tax_amount, total, issue_date, due_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,'issued') RETURNING *`,
    [invoiceNumber, memberId, membershipId, subtotal, GST_RATE, taxAmount, total, issueDate]
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await pool.query(
    `SELECT i.*, m.first_name, m.last_name, m.email, m.phone, m.address,
            ms.start_date, ms.end_date, mp.name AS plan_name
     FROM invoices i
     JOIN members m ON m.id = i.member_id
     JOIN memberships ms ON ms.id = i.membership_id
     JOIN membership_plans mp ON mp.id = ms.plan_id
     WHERE i.id = $1`,
    [id]
  );
  return result.rows[0];
}

async function findByMembershipId(membershipId) {
  const result = await pool.query('SELECT * FROM invoices WHERE membership_id = $1', [membershipId]);
  return result.rows[0];
}

async function findAll({ status, search } = {}) {
  const conditions = [];
  const params = [];
  if (status) {
    params.push(status);
    conditions.push(`i.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(i.invoice_number ILIKE $${params.length} OR m.first_name ILIKE $${params.length} OR m.last_name ILIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT i.*, m.first_name, m.last_name
     FROM invoices i JOIN members m ON m.id = i.member_id
     ${where} ORDER BY i.issue_date DESC, i.id DESC`,
    params
  );
  return result.rows;
}

// Called from paymentController when a payment is recorded against an
// invoiced membership — this app records one payment per membership
// period, so any payment fully settles that period's invoice.
async function markPaid(id, db = pool) {
  const result = await db.query(`UPDATE invoices SET status = 'paid' WHERE id = $1 RETURNING *`, [id]);
  return result.rows[0];
}

async function receivablesAging() {
  const result = await pool.query(
    `SELECT i.id, i.invoice_number, i.member_id, i.total, i.due_date, i.status,
            m.first_name, m.last_name,
            GREATEST((CURRENT_DATE - i.due_date)::int, 0) AS days_overdue
     FROM invoices i JOIN members m ON m.id = i.member_id
     WHERE i.status IN ('issued', 'overdue')
     ORDER BY i.due_date ASC`
  );
  return result.rows;
}

module.exports = {
  generateForMembership, findById, findByMembershipId, findAll, markPaid, receivablesAging,
};
