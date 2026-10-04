const pool = require('../config/db');

// Never throws — a failed audit write must never take down the request
// that triggered it. Errors are logged to the server console only.
async function log({ userId, userName, action, entityType, entityId, oldValues, newValues, ipAddress }) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, user_name, action, entity_type, entity_id, old_values, new_values, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        userId || null, userName || null, action, entityType, entityId || null,
        oldValues != null ? JSON.stringify(oldValues) : null,
        newValues != null ? JSON.stringify(newValues) : null,
        ipAddress || null,
      ]
    );
  } catch (err) {
    console.error('[audit] failed to record entry:', err.message);
  }
}

// Convenience wrapper for controllers — pulls the acting user and IP off
// the request so call sites only need to state what happened.
function logFromRequest(req, { action, entityType, entityId, oldValues, newValues }) {
  return log({
    userId: req.user?.id,
    userName: req.user?.name,
    ipAddress: req.ip,
    action, entityType, entityId, oldValues, newValues,
  });
}

async function findAll({ userId, entityType, action, from, to } = {}) {
  const conditions = [];
  const params = [];
  if (userId) {
    params.push(userId);
    conditions.push(`user_id = $${params.length}`);
  }
  if (entityType) {
    params.push(entityType);
    conditions.push(`entity_type = $${params.length}`);
  }
  if (action) {
    params.push(action);
    conditions.push(`action = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`created_at::date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`created_at::date <= $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT 500`,
    params
  );
  return result.rows;
}

async function findForEntity(entityType, entityId) {
  const result = await pool.query(
    `SELECT * FROM audit_log WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC`,
    [entityType, entityId]
  );
  return result.rows;
}

module.exports = { log, logFromRequest, findAll, findForEntity };
