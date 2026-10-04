-- Migration 001: extend auth to trainer/member portal logins
--
-- Purely additive: widens the users.role CHECK to allow 'trainer' and
-- 'member' alongside the existing 'admin'/'staff', and links a users row
-- to a members/trainers row so a portal account resolves to a person.
-- Existing admin/staff rows are untouched (both new FK columns stay NULL
-- for them, which the new consistency CHECK explicitly allows).
--
-- Apply:   psql -d gym -f database/migrations/001_add_portal_roles.sql
-- Rollback: see the commented block at the bottom of this file.

BEGIN;

ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'staff', 'trainer', 'member'));

ALTER TABLE users ADD COLUMN member_id INTEGER REFERENCES members(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN trainer_id INTEGER REFERENCES trainers(id) ON DELETE CASCADE;

ALTER TABLE users ADD CONSTRAINT users_member_id_unique UNIQUE (member_id);
ALTER TABLE users ADD CONSTRAINT users_trainer_id_unique UNIQUE (trainer_id);

-- Keeps role and the linked-entity columns from drifting out of sync:
-- admin/staff must have neither FK set, member must have member_id only,
-- trainer must have trainer_id only.
ALTER TABLE users ADD CONSTRAINT users_role_link_check CHECK (
  (role IN ('admin', 'staff') AND member_id IS NULL AND trainer_id IS NULL) OR
  (role = 'member' AND member_id IS NOT NULL AND trainer_id IS NULL) OR
  (role = 'trainer' AND trainer_id IS NOT NULL AND member_id IS NULL)
);

COMMIT;

-- Rollback (run manually if needed):
-- BEGIN;
-- ALTER TABLE users DROP CONSTRAINT users_role_link_check;
-- ALTER TABLE users DROP CONSTRAINT users_trainer_id_unique;
-- ALTER TABLE users DROP CONSTRAINT users_member_id_unique;
-- ALTER TABLE users DROP COLUMN trainer_id;
-- ALTER TABLE users DROP COLUMN member_id;
-- ALTER TABLE users DROP CONSTRAINT users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'staff'));
-- COMMIT;
