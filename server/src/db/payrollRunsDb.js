const pool = require('../config/db');

async function findOrCreateDraft(month, year, generatedBy) {
  const existing = await pool.query('SELECT * FROM payroll_runs WHERE month = $1 AND year = $2', [month, year]);
  if (existing.rows[0]) return existing.rows[0];

  const result = await pool.query(
    `INSERT INTO payroll_runs (month, year, status, generated_by) VALUES ($1,$2,'draft',$3) RETURNING *`,
    [month, year, generatedBy]
  );
  return result.rows[0];
}

async function findAll() {
  const result = await pool.query(
    `SELECT pr.*, u.name AS generated_by_name
     FROM payroll_runs pr LEFT JOIN users u ON u.id = pr.generated_by
     ORDER BY pr.year DESC, pr.month DESC`
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM payroll_runs WHERE id = $1', [id]);
  return result.rows[0];
}

async function finalize(id, db = pool) {
  const result = await db.query(`UPDATE payroll_runs SET status = 'finalized' WHERE id = $1 RETURNING *`, [id]);
  return result.rows[0];
}

module.exports = { findOrCreateDraft, findAll, findById, finalize };
