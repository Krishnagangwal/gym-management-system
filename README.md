# Gym & Fitness Center Management System

A full-stack gym management system: members & memberships, trainers & workout plans, attendance & payments, plus an admin dashboard. Built with React (Vite), Express, and PostgreSQL.

See `docs/superpowers/specs/2026-08-19-gym-management-system-design.md` for the full design (ER diagram, business rules, architecture).

## Prerequisites

- Node.js
- PostgreSQL (running locally)

## Setup

1. Create the database and load the schema + seed data:
   ```bash
   createdb gym_management
   psql -d gym_management -f database/schema.sql
   psql -d gym_management -f database/seed.sql
   ```
2. Install and configure the backend:
   ```bash
   cd server
   npm install
   cp .env.example .env   # fill in DB_USER/DB_PASSWORD for your local Postgres role, and set a real JWT_SECRET
   npm run dev             # runs on http://localhost:4000
   ```
3. Install and configure the frontend (in a separate terminal):
   ```bash
   cd client
   npm install
   npm run dev             # runs on http://localhost:5173
   ```

## Default login

- Email: `admin@gym.com`
- Password: `Admin@123`

## Notes

- The backend runs on port **4000**, not 5000 — macOS's AirPlay Receiver (Control Center) occupies port 5000 by default and silently kills competing listeners.
- No automated test suite yet — this project defers formal testing to a later phase, per the development roadmap in the design spec. Every endpoint and page was manually verified (backend via `curl`, frontend via a real browser) during development.
