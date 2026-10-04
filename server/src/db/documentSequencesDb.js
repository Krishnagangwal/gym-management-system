const pool = require('../config/db');

// India's fiscal year runs April-March, e.g. 2026-08-25 falls in '2026-27'.
function fiscalYearFor(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

// Atomic per-(doc_type, fiscal_year) counter via UPSERT-increment — safe
// under concurrent requests without a separate application-level lock.
async function nextNumber(docType, fiscalYear, db = pool) {
  const result = await db.query(
    `INSERT INTO document_sequences (doc_type, fiscal_year, last_number)
     VALUES ($1, $2, 1)
     ON CONFLICT (doc_type, fiscal_year)
     DO UPDATE SET last_number = document_sequences.last_number + 1
     RETURNING last_number`,
    [docType, fiscalYear]
  );
  return result.rows[0].last_number;
}

module.exports = { fiscalYearFor, nextNumber };
