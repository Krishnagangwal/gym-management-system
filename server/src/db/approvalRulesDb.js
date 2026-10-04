const pool = require('../config/db');

async function findActiveByType(requestType) {
  const result = await pool.query(
    'SELECT * FROM approval_rules WHERE request_type = $1 AND is_active = TRUE',
    [requestType]
  );
  return result.rows[0];
}

async function findAll() {
  const result = await pool.query('SELECT * FROM approval_rules ORDER BY request_type');
  return result.rows;
}

module.exports = { findActiveByType, findAll };
