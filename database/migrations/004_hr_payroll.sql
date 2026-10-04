-- Migration 004: HR & Payroll for trainers/staff
--
-- Purely additive: five new tables, no changes to existing ones.
--
-- payslips.expense_id (not in the original column list, added here) links
-- a payslip to the expenses row it posts on finalization — without it,
-- there's no way to find-and-replace that row on a draft recompute or to
-- avoid double-counting it, which the module explicitly requires.
--
-- Apply:   psql -d gym -f database/migrations/004_hr_payroll.sql
-- Rollback: see the commented block at the bottom of this file.

BEGIN;

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER REFERENCES trainers(id),
    user_id INTEGER REFERENCES users(id),
    employee_code VARCHAR(20) UNIQUE NOT NULL,
    designation VARCHAR(100),
    department VARCHAR(100),
    date_of_joining DATE NOT NULL DEFAULT CURRENT_DATE,
    employment_type VARCHAR(20) NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract')),
    base_salary NUMERIC(10,2) NOT NULL CHECK (base_salary >= 0),
    per_session_rate NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (per_session_rate >= 0),
    bank_account_last4 VARCHAR(4),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_employees_trainer ON employees(trainer_id);

CREATE TABLE staff_attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
    UNIQUE (employee_id, date)
);
CREATE INDEX idx_staff_attendance_date ON staff_attendance(date);

CREATE TABLE leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(30) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    days INTEGER NOT NULL CHECK (days > 0),
    reason VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);

CREATE TABLE payroll_runs (
    id SERIAL PRIMARY KEY,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
    generated_by INTEGER REFERENCES users(id),
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (month, year)
);

CREATE TABLE payslips (
    id SERIAL PRIMARY KEY,
    payroll_run_id INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    base_salary NUMERIC(10,2) NOT NULL,
    session_commission NUMERIC(10,2) NOT NULL DEFAULT 0,
    allowances NUMERIC(10,2) NOT NULL DEFAULT 0,
    deductions NUMERIC(10,2) NOT NULL DEFAULT 0,
    gross NUMERIC(10,2) NOT NULL,
    net NUMERIC(10,2) NOT NULL,
    days_present NUMERIC(4,1) NOT NULL DEFAULT 0,
    days_absent NUMERIC(4,1) NOT NULL DEFAULT 0,
    expense_id INTEGER REFERENCES expenses(id),
    UNIQUE (payroll_run_id, employee_id)
);

COMMIT;

-- Rollback (run manually if needed):
-- BEGIN;
-- DROP TABLE payslips;
-- DROP TABLE payroll_runs;
-- DROP TABLE leave_requests;
-- DROP TABLE staff_attendance;
-- DROP TABLE employees;
-- COMMIT;
