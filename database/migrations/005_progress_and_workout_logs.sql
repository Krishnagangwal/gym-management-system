-- Migration 005: Member progress tracking, workout logging, trainer notes
--
-- Two new tables plus one additive column. trainer_notes isn't in the
-- original two-table list, but the trainer portal's "private trainer_notes
-- field" needs a home — trainer_member_assignments is the natural one
-- (it's already the per-relationship record, and it's private to the
-- trainer/admin by construction: members never see this table).
--
-- Apply:   psql -d gym -f database/migrations/005_progress_and_workout_logs.sql
-- Rollback: see the commented block at the bottom of this file.

BEGIN;

CREATE TABLE member_progress (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight NUMERIC(5,2),
    body_fat NUMERIC(4,1),
    chest NUMERIC(5,1),
    waist NUMERIC(5,1),
    arms NUMERIC(5,1),
    thighs NUMERIC(5,1),
    notes VARCHAR(255)
);
CREATE INDEX idx_member_progress_member ON member_progress(member_id, date);

CREATE TABLE workout_logs (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES workout_plans(id),
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    sets_done INTEGER NOT NULL CHECK (sets_done >= 0),
    reps_done INTEGER NOT NULL CHECK (reps_done >= 0),
    weight_used NUMERIC(6,2)
);
CREATE INDEX idx_workout_logs_member ON workout_logs(member_id, date);

ALTER TABLE trainer_member_assignments ADD COLUMN trainer_notes TEXT;

COMMIT;

-- Rollback (run manually if needed):
-- BEGIN;
-- ALTER TABLE trainer_member_assignments DROP COLUMN trainer_notes;
-- DROP TABLE workout_logs;
-- DROP TABLE member_progress;
-- COMMIT;
