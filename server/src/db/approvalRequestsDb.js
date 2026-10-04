const pool = require('../config/db');

async function create({ requestType, entityType, entityId, requestedBy, requestPayload, reason }) {
  const result = await pool.query(
    `INSERT INTO approval_requests (request_type, entity_type, entity_id, requested_by, request_payload, reason)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [requestType, entityType || null, entityId || null, requestedBy, JSON.stringify(requestPayload), reason || null]
  );
  return result.rows[0];
}

async function findAll({ status } = {}) {
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = 'WHERE ar.status = $1';
  }
  const result = await pool.query(
    `SELECT ar.*, u.name AS requester_name, rv.name AS reviewer_name
     FROM approval_requests ar
     JOIN users u ON u.id = ar.requested_by
     LEFT JOIN users rv ON rv.id = ar.reviewed_by
     ${where} ORDER BY ar.created_at DESC`,
    params
  );
  return result.rows;
}

async function findByRequester(userId) {
  const result = await pool.query(
    `SELECT ar.*, u.name AS requester_name, rv.name AS reviewer_name
     FROM approval_requests ar
     JOIN users u ON u.id = ar.requested_by
     LEFT JOIN users rv ON rv.id = ar.reviewed_by
     WHERE ar.requested_by = $1
     ORDER BY ar.created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM approval_requests WHERE id = $1', [id]);
  return result.rows[0];
}

async function setStatus(id, { status, reviewedBy, reviewNote }, db = pool) {
  const result = await db.query(
    `UPDATE approval_requests SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3
     WHERE id = $4 RETURNING *`,
    [status, reviewedBy, reviewNote || null, id]
  );
  return result.rows[0];
}

async function pendingCount() {
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM approval_requests WHERE status = 'pending'`);
  return result.rows[0].count;
}

// Used by the member portal to show "renewal already requested" instead of
// letting a member queue up duplicate requests.
async function findPendingForEntity(entityType, entityId) {
  const result = await pool.query(
    `SELECT * FROM approval_requests WHERE entity_type = $1 AND entity_id = $2 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
    [entityType, entityId]
  );
  return result.rows[0];
}

module.exports = { create, findAll, findByRequester, findById, setStatus, pendingCount, findPendingForEntity };
