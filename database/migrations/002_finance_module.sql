-- Migration 002: Finance module (expenses, GST invoices, document numbering)
--
-- Purely additive: new tables plus one nullable FK column on the existing
-- payments table. No existing data is touched.
--
-- Apply:   psql -d gym -f database/migrations/002_finance_module.sql
-- Rollback: see the commented block at the bottom of this file.

BEGIN;

CREATE TABLE expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES expense_categories(id),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor_name VARCHAR(150),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','card','upi','bank_transfer')),
    description VARCHAR(255),
    recorded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- One invoice per membership period. tax_rate/tax_amount store the combined
-- GST rate (CGST+SGST split 50/50 at display time, not stored separately,
-- since India's intra-state GST is always an even split of one rate).
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(30) UNIQUE NOT NULL,
    member_id INTEGER NOT NULL REFERENCES members(id),
    membership_id INTEGER NOT NULL REFERENCES memberships(id),
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    tax_amount NUMERIC(10,2) NOT NULL CHECK (tax_amount >= 0),
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'issued' CHECK (status IN ('draft','issued','paid','overdue')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_invoices_member ON invoices(member_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

ALTER TABLE payments ADD COLUMN invoice_id INTEGER REFERENCES invoices(id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

-- Atomic per-fiscal-year counters for document numbering, e.g. invoice
-- "INV/2026-27/0001". One row per (doc_type, fiscal_year); nextval logic
-- lives in documentSequencesDb.js as an UPSERT-increment.
CREATE TABLE document_sequences (
    doc_type VARCHAR(20) NOT NULL,
    fiscal_year VARCHAR(10) NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (doc_type, fiscal_year)
);

COMMIT;

-- Rollback (run manually if needed):
-- BEGIN;
-- ALTER TABLE payments DROP COLUMN invoice_id;
-- DROP TABLE document_sequences;
-- DROP TABLE invoices;
-- DROP TABLE expenses;
-- DROP TABLE expense_categories;
-- COMMIT;
