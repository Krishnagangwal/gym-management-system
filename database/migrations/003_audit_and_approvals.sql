-- Migration 003: Audit trail + approval workflow
--
-- Purely additive: three new tables, no changes to existing ones.
--
-- Apply:   psql -d gym -f database/migrations/003_audit_and_approvals.sql
-- Rollback: see the commented block at the bottom of this file.

BEGIN;

-- entity_id has no FK: entity_type varies per row (member/trainer/membership/
-- payment/expense/invoice/plan), so no single table could be referenced.
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    user_name VARCHAR(100),
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- request_payload holds everything needed to execute the deferred action on
-- approval (e.g. the full expense-creation body). threshold_amount on the
-- matching approval_rules row is a plain NUMERIC and its unit depends on
-- request_type — currency for 'refund'/'expense', a percentage for
-- 'discount' (e.g. 20 = 20%) — since the schema carries one generic
-- threshold column, not a per-type unit.
CREATE TABLE approval_requests (
    id SERIAL PRIMARY KEY,
    request_type VARCHAR(30) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    requested_by INTEGER NOT NULL REFERENCES users(id),
    request_payload JSONB NOT NULL,
    reason VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_note VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_requester ON approval_requests(requested_by);

CREATE TABLE approval_rules (
    id SERIAL PRIMARY KEY,
    request_type VARCHAR(30) NOT NULL UNIQUE,
    threshold_amount NUMERIC(10,2),
    required_role VARCHAR(20) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

COMMIT;

-- Rollback (run manually if needed):
-- BEGIN;
-- DROP TABLE approval_rules;
-- DROP TABLE approval_requests;
-- DROP TABLE audit_log;
-- COMMIT;
