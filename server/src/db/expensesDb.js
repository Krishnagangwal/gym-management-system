const pool = require('../config/db');

// `db` defaults to the pool but accepts a checked-out client — used when an
// approved approval_request executes this inside a transaction.
async function create({ categoryId, amount, expenseDate, vendorName, paymentMethod, description, recordedBy }, db = pool) {
  const result = await db.query(
    `INSERT INTO expenses (category_id, amount, expense_date, vendor_name, payment_method, description, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [categoryId, amount, expenseDate, vendorName || null, paymentMethod, description || null, recordedBy || null]
  );
  return result.rows[0];
}

async function findAll({ categoryId, from, to } = {}) {
  const conditions = [];
  const params = [];
  if (categoryId) {
    params.push(categoryId);
    conditions.push(`e.category_id = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`e.expense_date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`e.expense_date <= $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT e.*, c.name AS category_name
     FROM expenses e JOIN expense_categories c ON c.id = e.category_id
     ${where} ORDER BY e.expense_date DESC, e.id DESC`,
    params
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
  return result.rows[0];
}

async function update(id, { categoryId, amount, expenseDate, vendorName, paymentMethod, description }) {
  const result = await pool.query(
    `UPDATE expenses SET category_id=$1, amount=$2, expense_date=$3, vendor_name=$4, payment_method=$5, description=$6
     WHERE id=$7 RETURNING *`,
    [categoryId, amount, expenseDate, vendorName || null, paymentMethod, description || null, id]
  );
  return result.rows[0];
}

async function remove(id) {
  await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
}

async function sumForRange(from, to) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM expenses WHERE expense_date BETWEEN $1 AND $2`,
    [from, to]
  );
  return result.rows[0].total;
}

module.exports = { create, findAll, findById, update, remove, sumForRange };
