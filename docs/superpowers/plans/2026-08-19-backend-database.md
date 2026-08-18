# Gym Management System — Backend & Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the PostgreSQL schema and the full Express REST API (auth + all 3 modules + dashboard) so every endpoint is verifiable with `curl` before any frontend code exists.

**Architecture:** Express app with `routes/` → `controllers/` → `db/` (parameterized `pg` queries, no ORM) → PostgreSQL. JWT auth issued at login, verified by middleware on every protected route; a second middleware checks role (`admin` vs `staff`).

**Tech Stack:** Node.js, Express, `pg`, `bcrypt`, `jsonwebtoken`, `dotenv`, `cors`, nodemon (dev).

**Spec:** `docs/superpowers/specs/2026-08-19-gym-management-system-design.md`

## Global Constraints

- No ORM — every query is hand-written parameterized SQL via `pg` (spec §6).
- Two roles only: `admin` (full access) and `staff` (members/attendance/payments manage, trainers/workouts view-only) (spec §2, §6).
- Members never log in — no member-facing auth (spec §2).
- Membership renewal inserts a new `memberships` row; never mutates an existing one (spec §4 rule 1).
- Check-in must be rejected if the member has no `memberships` row with `status='active' AND end_date >= today` (spec §4 rule 2).
- Secrets only in `server/.env`, which is gitignored; `server/.env.example` documents the required keys with placeholder values.
- Database name: `gym_management`. Connect as the local Postgres superuser/role already running (confirmed installed: PostgreSQL 15 via Homebrew).

## Testing Approach

This project defers a formal automated test suite to spec Phase 11 (per the user's own roadmap). For this plan, each task's "verify" step is a concrete `curl` command run against the live dev server, with the exact expected response shown — not a placeholder, and not skipped. This mirrors how the API will actually be exercised by the frontend and is fast to run after every task.

---

### Task 1: Project scaffold — Express app skeleton

**Files:**
- Create: `server/package.json`
- Create: `server/.env`
- Create: `server/.env.example`
- Create: `server/.gitignore`
- Create: `server/src/app.js`
- Create: `server/src/server.js`

**Interfaces:**
- Produces: `app.js` exports an Express `app` instance (used by `server.js` and later by every route-mounting task).
- Produces: `GET /api/health` → `{ "status": "ok" }`, used by this task's verification.

- [ ] **Step 1: Init npm project and install dependencies**

```bash
cd /Users/krishnagangwal/gym-management-system/server
npm init -y
npm install express pg bcrypt jsonwebtoken dotenv cors
npm install --save-dev nodemon
```

- [ ] **Step 2: Add npm scripts**

Edit `server/package.json`, replace the `"scripts"` block with:

```json
"scripts": {
  "start": "node src/server.js",
  "dev": "nodemon src/server.js"
}
```

Also add `"type": "commonjs"` is the default so no change needed there.

- [ ] **Step 3: Create `.env`, `.env.example`, `.gitignore`**

`server/.env`:
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gym_management
DB_USER=postgres
DB_PASSWORD=
JWT_SECRET=change_this_to_a_long_random_string_for_dev
JWT_EXPIRES_IN=8h
```

`server/.env.example` (same keys, no real values):
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gym_management
DB_USER=
DB_PASSWORD=
JWT_SECRET=
JWT_EXPIRES_IN=8h
```

`server/.gitignore`:
```
node_modules/
.env
```

- [ ] **Step 4: Write `src/app.js`**

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
```

- [ ] **Step 5: Write `src/server.js`**

```javascript
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 6: Verify**

```bash
cd /Users/krishnagangwal/gym-management-system/server
npm run dev &
sleep 1
curl -s http://localhost:5000/api/health
```

Expected output: `{"status":"ok"}`

Stop the server afterward: `kill %1` (or note the PID; later tasks restart it themselves).

- [ ] **Step 7: Commit**

```bash
cd /Users/krishnagangwal/gym-management-system
git add server/package.json server/package-lock.json server/.env.example server/.gitignore server/src/app.js server/src/server.js
git commit -m "Scaffold Express server with health check endpoint"
```

---

### Task 2: Database schema and seed data

**Files:**
- Create: `database/schema.sql`
- Create: `database/seed.sql`
- Create: `database/hash_password.js`

**Interfaces:**
- Produces: all 12 tables listed in spec §5, used by every subsequent `db/*.js` module.
- Produces: one seed admin user (`admin@gym.com` / `Admin@123`) in `users`, used by Task 4's login verification.

- [ ] **Step 1: Create the database**

```bash
createdb gym_management
```

If `createdb` isn't on PATH, use: `psql -c "CREATE DATABASE gym_management;"`

- [ ] **Step 2: Write `database/schema.sql`**

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    address VARCHAR(255),
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE membership_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE memberships (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES membership_plans(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_memberships_member ON memberships(member_id);

CREATE TABLE trainers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    specialization VARCHAR(100),
    availability VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE trainer_member_assignments (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_tma_member ON trainer_member_assignments(member_id);

CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    muscle_group VARCHAR(50)
);

CREATE TABLE workout_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner','intermediate','advanced')),
    created_by INTEGER REFERENCES trainers(id)
);

CREATE TABLE workout_plan_exercises (
    id SERIAL PRIMARY KEY,
    workout_plan_id INTEGER NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
    sets INTEGER NOT NULL CHECK (sets > 0),
    reps INTEGER NOT NULL CHECK (reps > 0)
);
CREATE INDEX idx_wpe_plan ON workout_plan_exercises(workout_plan_id);

CREATE TABLE member_workout_plans (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    workout_plan_id INTEGER NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_mwp_member ON member_workout_plans(member_id);

CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP NOT NULL DEFAULT NOW(),
    check_out_time TIMESTAMP
);
CREATE INDEX idx_attendance_member ON attendance(member_id);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    membership_id INTEGER NOT NULL REFERENCES memberships(id),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','card','upi','bank_transfer')),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','pending','failed'))
);
CREATE INDEX idx_payments_member ON payments(member_id);
```

- [ ] **Step 3: Apply the schema**

```bash
psql -d gym_management -f /Users/krishnagangwal/gym-management-system/database/schema.sql
```

Expected: a series of `CREATE TABLE` / `CREATE INDEX` confirmations, no errors.

- [ ] **Step 4: Generate a bcrypt hash for the seed admin password**

Write `database/hash_password.js`:

```javascript
const bcrypt = require('bcrypt');
const password = process.argv[2] || 'Admin@123';
bcrypt.hash(password, 10).then((hash) => console.log(hash));
```

Run it (uses the `bcrypt` package already installed in `server/`):

```bash
cd /Users/krishnagangwal/gym-management-system
node -e "require('./server/node_modules/bcrypt')" 2>/dev/null || (cd server && npm install bcrypt --no-save)
node -r dotenv/config database/hash_password.js Admin@123 --require /Users/krishnagangwal/gym-management-system/server/node_modules
```

Simplify by running it from inside `server/` so `node_modules` resolves naturally:

```bash
cd /Users/krishnagangwal/gym-management-system/server
node ../database/hash_password.js Admin@123
```

Copy the printed hash for the next step.

- [ ] **Step 5: Write `database/seed.sql`**

Paste the hash from Step 4 in place of `PASTE_HASH_HERE`:

```sql
INSERT INTO users (name, email, password_hash, role)
VALUES ('Admin User', 'admin@gym.com', 'PASTE_HASH_HERE', 'admin');

INSERT INTO membership_plans (name, description, duration_days, price) VALUES
('Monthly', 'Full gym access, 1 month', 30, 1500.00),
('Quarterly', 'Full gym access, 3 months', 90, 4000.00),
('Annual', 'Full gym access, 12 months', 365, 14000.00);

INSERT INTO exercises (name, description, muscle_group) VALUES
('Bench Press', 'Barbell chest press', 'Chest'),
('Squats', 'Barbell back squat', 'Legs'),
('Deadlift', 'Barbell deadlift', 'Back'),
('Pull-ups', 'Bodyweight pull-up', 'Back'),
('Shoulder Press', 'Dumbbell overhead press', 'Shoulders');
```

- [ ] **Step 6: Apply the seed and verify**

```bash
psql -d gym_management -f /Users/krishnagangwal/gym-management-system/database/seed.sql
psql -d gym_management -c "SELECT email, role FROM users;"
psql -d gym_management -c "SELECT name, price FROM membership_plans;"
```

Expected: the admin row and the three plan rows print back.

- [ ] **Step 7: Commit**

```bash
cd /Users/krishnagangwal/gym-management-system
git add database/schema.sql database/seed.sql database/hash_password.js
git commit -m "Add database schema and seed data"
```

Note: `database/seed.sql` contains a bcrypt hash, not a plaintext password, so it's safe to commit.

---

### Task 3: Database connection module

**Files:**
- Create: `server/src/config/db.js`

**Interfaces:**
- Consumes: `.env` keys `DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD` (Task 1).
- Produces: `pool.query(text, params)` — a `pg.Pool` instance, imported by every `db/*.js` module in later tasks.

- [ ] **Step 1: Write `src/config/db.js`**

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

module.exports = pool;
```

- [ ] **Step 2: Verify with a throwaway query script**

```bash
cd /Users/krishnagangwal/gym-management-system/server
node -e "
require('dotenv').config();
const pool = require('./src/config/db');
pool.query('SELECT NOW() AS now').then(r => { console.log(r.rows[0]); pool.end(); });
"
```

Expected: prints an object with a `now` timestamp close to the current time, no connection error.

- [ ] **Step 3: Commit**

```bash
cd /Users/krishnagangwal/gym-management-system
git add server/src/config/db.js
git commit -m "Add PostgreSQL connection pool"
```

---

### Task 4: Authentication — login, JWT, middleware

**Files:**
- Create: `server/src/db/usersDb.js`
- Create: `server/src/controllers/authController.js`
- Create: `server/src/routes/authRoutes.js`
- Create: `server/src/middleware/auth.js`
- Create: `server/src/middleware/authorize.js`
- Modify: `server/src/app.js`

**Interfaces:**
- Consumes: `pool` from `src/config/db.js` (Task 3); seed admin user from Task 2.
- Produces: `POST /api/auth/login` → `{ token, user: { id, name, email, role } }`, used by every later task's curl verification (`Authorization: Bearer <token>`).
- Produces: `verifyToken(req, res, next)` middleware (attaches `req.user = { id, role }`) and `requireRole(...roles)` middleware, both used by every protected route in Tasks 5–12.

- [ ] **Step 1: Write `src/db/usersDb.js`**

```javascript
const pool = require('../config/db');

async function findByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

module.exports = { findByEmail };
```

- [ ] **Step 2: Write `src/middleware/auth.js`**

```javascript
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = verifyToken;
```

- [ ] **Step 3: Write `src/middleware/authorize.js`**

```javascript
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    next();
  };
}

module.exports = requireRole;
```

- [ ] **Step 4: Write `src/controllers/authController.js`**

```javascript
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usersDb = require('../db/usersDb');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await usersDb.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
```

- [ ] **Step 5: Write `src/routes/authRoutes.js`**

```javascript
const express = require('express');
const { login } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);

module.exports = router;
```

- [ ] **Step 6: Mount the route in `src/app.js`**

Add near the top (after `require('cors')`):
```javascript
const authRoutes = require('./routes/authRoutes');
```

Add after the `app.use(express.json());` line:
```javascript
app.use('/api/auth', authRoutes);
```

- [ ] **Step 7: Verify**

```bash
cd /Users/krishnagangwal/gym-management-system/server
npm run dev &
sleep 1
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gym.com","password":"Admin@123"}'
echo
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gym.com","password":"wrong"}'
```

Expected: first call returns `{"token":"...","user":{"id":1,"name":"Admin User","email":"admin@gym.com","role":"admin"}}`; second call returns `{"error":"Invalid email or password"}` with a 401 status.

- [ ] **Step 8: Commit**

```bash
cd /Users/krishnagangwal/gym-management-system
git add server/src/db/usersDb.js server/src/controllers/authController.js server/src/routes/authRoutes.js server/src/middleware/auth.js server/src/middleware/authorize.js server/src/app.js
git commit -m "Add JWT authentication: login endpoint and auth middleware"
```

---

### Task 5: Members API

**Files:**
- Create: `server/src/db/membersDb.js`
- Create: `server/src/controllers/memberController.js`
- Create: `server/src/routes/memberRoutes.js`
- Modify: `server/src/app.js`

**Interfaces:**
- Consumes: `pool` (Task 3), `verifyToken` + `requireRole` (Task 4).
- Produces: `membersDb.create/findAll/findById/update/setActive` — used by Task 6 (memberships reference `member_id`) and Task 10/11 (attendance/payments reference `member_id`).
- Produces: routes `GET/POST /api/members`, `GET/PUT /api/members/:id`, `PATCH /api/members/:id/status` — used by Task 6+ curl verifications to create a test member.

- [ ] **Step 1: Write `src/db/membersDb.js`**

```javascript
const pool = require('../config/db');

async function create({ firstName, lastName, email, phone, dateOfBirth, gender, address }) {
  const result = await pool.query(
    `INSERT INTO members (first_name, last_name, email, phone, date_of_birth, gender, address)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [firstName, lastName, email, phone, dateOfBirth || null, gender || null, address || null]
  );
  return result.rows[0];
}

async function findAll({ search, isActive }) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`is_active = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(`SELECT * FROM members ${where} ORDER BY id DESC`, params);
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
  return result.rows[0];
}

async function update(id, { firstName, lastName, email, phone, dateOfBirth, gender, address }) {
  const result = await pool.query(
    `UPDATE members SET first_name=$1, last_name=$2, email=$3, phone=$4,
       date_of_birth=$5, gender=$6, address=$7, updated_at=NOW()
     WHERE id=$8 RETURNING *`,
    [firstName, lastName, email, phone, dateOfBirth || null, gender || null, address || null, id]
  );
  return result.rows[0];
}

async function setActive(id, isActive) {
  const result = await pool.query(
    'UPDATE members SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [isActive, id]
  );
  return result.rows[0];
}

module.exports = { create, findAll, findById, update, setActive };
```

- [ ] **Step 2: Write `src/controllers/memberController.js`**

```javascript
const membersDb = require('../db/membersDb');

async function createMember(req, res, next) {
  try {
    const { firstName, lastName, email, phone } = req.body;
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ error: 'firstName, lastName, email, and phone are required' });
    }
    const member = await membersDb.create(req.body);
    res.status(201).json(member);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A member with this email already exists' });
    next(err);
  }
}

async function listMembers(req, res, next) {
  try {
    const { search, isActive } = req.query;
    const members = await membersDb.findAll({
      search,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
    res.json(members);
  } catch (err) {
    next(err);
  }
}

async function getMember(req, res, next) {
  try {
    const member = await membersDb.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) {
    next(err);
  }
}

async function updateMember(req, res, next) {
  try {
    const existing = await membersDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Member not found' });

    const { firstName, lastName, email, phone } = req.body;
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ error: 'firstName, lastName, email, and phone are required' });
    }
    const member = await membersDb.update(req.params.id, req.body);
    res.json(member);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A member with this email already exists' });
    next(err);
  }
}

async function setMemberStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive (boolean) is required' });
    }
    const existing = await membersDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Member not found' });

    const member = await membersDb.setActive(req.params.id, isActive);
    res.json(member);
  } catch (err) {
    next(err);
  }
}

module.exports = { createMember, listMembers, getMember, updateMember, setMemberStatus };
```

- [ ] **Step 3: Write `src/routes/memberRoutes.js`**

```javascript
const express = require('express');
const verifyToken = require('../middleware/auth');
const {
  createMember, listMembers, getMember, updateMember, setMemberStatus,
} = require('../controllers/memberController');

const router = express.Router();

router.use(verifyToken); // admin and staff can both manage members

router.post('/', createMember);
router.get('/', listMembers);
router.get('/:id', getMember);
router.put('/:id', updateMember);
router.patch('/:id/status', setMemberStatus);

module.exports = router;
```

- [ ] **Step 4: Mount in `src/app.js`**

Add import:
```javascript
const memberRoutes = require('./routes/memberRoutes');
```
Add mount (after `app.use('/api/auth', authRoutes);`):
```javascript
app.use('/api/members', memberRoutes);
```

- [ ] **Step 5: Verify**

```bash
cd /Users/krishnagangwal/gym-management-system/server
npm run dev &
sleep 1
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@gym.com","password":"Admin@123"}' | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).token" 2>/dev/null || true)
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@gym.com","password":"Admin@123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s -X POST http://localhost:5000/api/members \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"firstName":"Rahul","lastName":"Sharma","email":"rahul@example.com","phone":"9999999999"}'
echo
curl -s http://localhost:5000/api/members -H "Authorization: Bearer $TOKEN"
```

Expected: the POST returns the created member with `id: 1`; the GET returns an array containing that member.

- [ ] **Step 6: Commit**

```bash
cd /Users/krishnagangwal/gym-management-system
git add server/src/db/membersDb.js server/src/controllers/memberController.js server/src/routes/memberRoutes.js server/src/app.js
git commit -m "Add members API: create, list, get, update, activate/deactivate"
```

---

### Task 6: Membership Plans and Memberships API

**Files:**
- Create: `server/src/db/membershipPlansDb.js`
- Create: `server/src/controllers/membershipPlanController.js`
- Create: `server/src/routes/membershipPlanRoutes.js`
- Create: `server/src/db/membershipsDb.js`
- Create: `server/src/controllers/membershipController.js`
- Create: `server/src/routes/membershipRoutes.js`
- Modify: `server/src/app.js`

**Interfaces:**
- Consumes: `pool`, `verifyToken`, `requireRole` (Task 3–4); `membersDb.findById` (Task 5) to validate `member_id`.
- Produces: `membershipsDb.hasActiveMembership(memberId)` — a boolean check reused by Task 10 (attendance check-in rule) and by this task's own duplicate-active-membership guard.
- Produces: routes `GET/POST /api/membership-plans`, `PUT/DELETE /api/membership-plans/:id`, `POST /api/members/:memberId/memberships` (assign/renew), `GET /api/members/:memberId/memberships` (history), `GET /api/memberships?status=active|expired`.

- [ ] **Step 1: Write `src/db/membershipPlansDb.js`**

```javascript
const pool = require('../config/db');

async function create({ name, description, durationDays, price }) {
  const result = await pool.query(
    `INSERT INTO membership_plans (name, description, duration_days, price) VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, description || null, durationDays, price]
  );
  return result.rows[0];
}

async function findAll() {
  const result = await pool.query('SELECT * FROM membership_plans ORDER BY id');
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM membership_plans WHERE id = $1', [id]);
  return result.rows[0];
}

async function update(id, { name, description, durationDays, price, isActive }) {
  const result = await pool.query(
    `UPDATE membership_plans SET name=$1, description=$2, duration_days=$3, price=$4, is_active=$5 WHERE id=$6 RETURNING *`,
    [name, description || null, durationDays, price, isActive, id]
  );
  return result.rows[0];
}

module.exports = { create, findAll, findById, update };
```

- [ ] **Step 2: Write `src/controllers/membershipPlanController.js`**

```javascript
const plansDb = require('../db/membershipPlansDb');

async function createPlan(req, res, next) {
  try {
    const { name, durationDays, price } = req.body;
    if (!name || !durationDays || price === undefined) {
      return res.status(400).json({ error: 'name, durationDays, and price are required' });
    }
    if (durationDays <= 0 || price < 0) {
      return res.status(400).json({ error: 'durationDays must be positive and price cannot be negative' });
    }
    const plan = await plansDb.create(req.body);
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
}

async function listPlans(req, res, next) {
  try {
    res.json(await plansDb.findAll());
  } catch (err) {
    next(err);
  }
}

async function updatePlan(req, res, next) {
  try {
    const existing = await plansDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Plan not found' });

    const { name, durationDays, price, isActive } = req.body;
    if (!name || !durationDays || price === undefined || typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'name, durationDays, price, and isActive are required' });
    }
    res.json(await plansDb.update(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

module.exports = { createPlan, listPlans, updatePlan };
```

- [ ] **Step 3: Write `src/routes/membershipPlanRoutes.js`**

```javascript
const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { createPlan, listPlans, updatePlan } = require('../controllers/membershipPlanController');

const router = express.Router();

router.use(verifyToken);

router.get('/', listPlans); // admin + staff can view
router.post('/', requireRole('admin'), createPlan);
router.put('/:id', requireRole('admin'), updatePlan);

module.exports = router;
```

- [ ] **Step 4: Write `src/db/membershipsDb.js`**

```javascript
const pool = require('../config/db');

async function hasActiveMembership(memberId) {
  const result = await pool.query(
    `SELECT 1 FROM memberships WHERE member_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE LIMIT 1`,
    [memberId]
  );
  return result.rowCount > 0;
}

async function create({ memberId, planId, startDate, durationDays }) {
  const result = await pool.query(
    `INSERT INTO memberships (member_id, plan_id, start_date, end_date, status)
     VALUES ($1, $2, $3, $3::date + ($4 || ' days')::interval, 'active') RETURNING *`,
    [memberId, planId, startDate, durationDays]
  );
  return result.rows[0];
}

async function findByMember(memberId) {
  const result = await pool.query(
    `SELECT m.*, p.name AS plan_name, p.price AS plan_price
     FROM memberships m JOIN membership_plans p ON p.id = m.plan_id
     WHERE m.member_id = $1 ORDER BY m.start_date DESC`,
    [memberId]
  );
  return result.rows;
}

async function findAll({ status }) {
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = 'WHERE m.status = $1';
  }
  const result = await pool.query(
    `SELECT m.*, mem.first_name, mem.last_name, p.name AS plan_name
     FROM memberships m
     JOIN members mem ON mem.id = m.member_id
     JOIN membership_plans p ON p.id = m.plan_id
     ${where} ORDER BY m.end_date ASC`,
    params
  );
  return result.rows;
}

module.exports = { hasActiveMembership, create, findByMember, findAll };
```

- [ ] **Step 5: Write `src/controllers/membershipController.js`**

```javascript
const membershipsDb = require('../db/membershipsDb');
const membersDb = require('../db/membersDb');
const plansDb = require('../db/membershipPlansDb');

async function assignOrRenew(req, res, next) {
  try {
    const memberId = req.params.memberId;
    const { planId, startDate } = req.body;
    if (!planId || !startDate) {
      return res.status(400).json({ error: 'planId and startDate are required' });
    }

    const member = await membersDb.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const plan = await plansDb.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Membership plan not found' });

    const alreadyActive = await membershipsDb.hasActiveMembership(memberId);
    if (alreadyActive) {
      return res.status(409).json({ error: 'Member already has an active membership. Wait for it to expire before assigning a new one.' });
    }

    const membership = await membershipsDb.create({
      memberId, planId, startDate, durationDays: plan.duration_days,
    });
    res.status(201).json(membership);
  } catch (err) {
    next(err);
  }
}

async function memberHistory(req, res, next) {
  try {
    res.json(await membershipsDb.findByMember(req.params.memberId));
  } catch (err) {
    next(err);
  }
}

async function listMemberships(req, res, next) {
  try {
    res.json(await membershipsDb.findAll({ status: req.query.status }));
  } catch (err) {
    next(err);
  }
}

module.exports = { assignOrRenew, memberHistory, listMemberships };
```

Note: "renew" and "assign" are the same operation here — both call `assignOrRenew`, which always inserts a new row (spec rule 1). A renewal is just calling this again after the previous membership's `end_date` has passed.

- [ ] **Step 6: Write `src/routes/membershipRoutes.js`**

```javascript
const express = require('express');
const verifyToken = require('../middleware/auth');
const { assignOrRenew, memberHistory, listMemberships } = require('../controllers/membershipController');

const router = express.Router();

router.use(verifyToken);

router.post('/members/:memberId/memberships', assignOrRenew);
router.get('/members/:memberId/memberships', memberHistory);
router.get('/memberships', listMemberships);

module.exports = router;
```

- [ ] **Step 7: Mount both routers in `src/app.js`**

Add imports:
```javascript
const membershipPlanRoutes = require('./routes/membershipPlanRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
```
Add mounts:
```javascript
app.use('/api/membership-plans', membershipPlanRoutes);
app.use('/api', membershipRoutes); // exposes /api/members/:memberId/memberships and /api/memberships
```

- [ ] **Step 8: Verify**

```bash
cd /Users/krishnagangwal/gym-management-system/server
npm run dev &
sleep 1
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@gym.com","password":"Admin@123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s http://localhost:5000/api/membership-plans -H "Authorization: Bearer $TOKEN"
echo
curl -s -X POST http://localhost:5000/api/members/1/memberships \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"planId":1,"startDate":"2026-08-19"}'
echo
curl -s -X POST http://localhost:5000/api/members/1/memberships \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"planId":1,"startDate":"2026-08-19"}'
```

Expected: plans list shows the 3 seeded plans; first membership POST returns 201 with `status: "active"` and `end_date` 30 days after `start_date`; the second identical POST returns 409 `{"error":"Member already has an active membership..."}` — proving the duplicate-active-membership rule works.

- [ ] **Step 9: Commit**

```bash
cd /Users/krishnagangwal/gym-management-system
git add server/src/db/membershipPlansDb.js server/src/controllers/membershipPlanController.js server/src/routes/membershipPlanRoutes.js server/src/db/membershipsDb.js server/src/controllers/membershipController.js server/src/routes/membershipRoutes.js server/src/app.js
git commit -m "Add membership plans and memberships API with renewal history and duplicate-active guard"
```

---

### Task 7: Trainers and Trainer-Member Assignments API

**Files:**
- Create: `server/src/db/trainersDb.js`
- Create: `server/src/controllers/trainerController.js`
- Create: `server/src/routes/trainerRoutes.js`
- Modify: `server/src/app.js`

**Interfaces:**
- Consumes: `pool`, `verifyToken`, `requireRole` (Task 3–4); `membersDb.findById` (Task 5).
- Produces: `trainersDb.findById` — used by Task 8 (`workout_plans.created_by`).
- Produces: routes `GET/POST /api/trainers`, `PUT/PATCH /api/trainers/:id`, `POST /api/trainers/:trainerId/assign/:memberId`, `GET /api/members/:memberId/trainer`.

- [ ] **Step 1: Write `src/db/trainersDb.js`**

```javascript
const pool = require('../config/db');

async function create({ firstName, lastName, email, phone, specialization, availability }) {
  const result = await pool.query(
    `INSERT INTO trainers (first_name, last_name, email, phone, specialization, availability)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [firstName, lastName, email, phone || null, specialization || null, availability || null]
  );
  return result.rows[0];
}

async function findAll() {
  const result = await pool.query('SELECT * FROM trainers ORDER BY id');
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM trainers WHERE id = $1', [id]);
  return result.rows[0];
}

async function update(id, { firstName, lastName, email, phone, specialization, availability }) {
  const result = await pool.query(
    `UPDATE trainers SET first_name=$1, last_name=$2, email=$3, phone=$4, specialization=$5, availability=$6 WHERE id=$7 RETURNING *`,
    [firstName, lastName, email, phone || null, specialization || null, availability || null, id]
  );
  return result.rows[0];
}

async function setActive(id, isActive) {
  const result = await pool.query('UPDATE trainers SET is_active=$1 WHERE id=$2 RETURNING *', [isActive, id]);
  return result.rows[0];
}

async function deactivateAssignments(memberId) {
  await pool.query('UPDATE trainer_member_assignments SET is_active = FALSE WHERE member_id = $1 AND is_active = TRUE', [memberId]);
}

async function assign(trainerId, memberId) {
  const result = await pool.query(
    `INSERT INTO trainer_member_assignments (trainer_id, member_id) VALUES ($1,$2) RETURNING *`,
    [trainerId, memberId]
  );
  return result.rows[0];
}

async function currentTrainerForMember(memberId) {
  const result = await pool.query(
    `SELECT t.* FROM trainer_member_assignments tma
     JOIN trainers t ON t.id = tma.trainer_id
     WHERE tma.member_id = $1 AND tma.is_active = TRUE
     ORDER BY tma.assigned_date DESC LIMIT 1`,
    [memberId]
  );
  return result.rows[0];
}

module.exports = { create, findAll, findById, update, setActive, deactivateAssignments, assign, currentTrainerForMember };
```

- [ ] **Step 2: Write `src/controllers/trainerController.js`**

```javascript
const trainersDb = require('../db/trainersDb');
const membersDb = require('../db/membersDb');

async function createTrainer(req, res, next) {
  try {
    const { firstName, lastName, email } = req.body;
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }
    res.status(201).json(await trainersDb.create(req.body));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A trainer with this email already exists' });
    next(err);
  }
}

async function listTrainers(req, res, next) {
  try {
    res.json(await trainersDb.findAll());
  } catch (err) {
    next(err);
  }
}

async function updateTrainer(req, res, next) {
  try {
    const existing = await trainersDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Trainer not found' });

    const { firstName, lastName, email } = req.body;
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }
    res.json(await trainersDb.update(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function setTrainerStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive (boolean) is required' });
    const existing = await trainersDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Trainer not found' });
    res.json(await trainersDb.setActive(req.params.id, isActive));
  } catch (err) {
    next(err);
  }
}

async function assignTrainer(req, res, next) {
  try {
    const { trainerId, memberId } = req.params;
    const trainer = await trainersDb.findById(trainerId);
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
    const member = await membersDb.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    await trainersDb.deactivateAssignments(memberId);
    const assignment = await trainersDb.assign(trainerId, memberId);
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
}

async function getMemberTrainer(req, res, next) {
  try {
    const trainer = await trainersDb.currentTrainerForMember(req.params.memberId);
    if (!trainer) return res.status(404).json({ error: 'No trainer assigned to this member' });
    res.json(trainer);
  } catch (err) {
    next(err);
  }
}

module.exports = { createTrainer, listTrainers, updateTrainer, setTrainerStatus, assignTrainer, getMemberTrainer };
```

- [ ] **Step 3: Write `src/routes/trainerRoutes.js`**

```javascript
const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const {
  createTrainer, listTrainers, updateTrainer, setTrainerStatus, assignTrainer, getMemberTrainer,
} = require('../controllers/trainerController');

const router = express.Router();

router.use(verifyToken);

router.get('/trainers', listTrainers); // admin + staff view
router.post('/trainers', requireRole('admin'), createTrainer);
router.put('/trainers/:id', requireRole('admin'), updateTrainer);
router.patch('/trainers/:id/status', requireRole('admin'), setTrainerStatus);
router.post('/trainers/:trainerId/assign/:memberId', requireRole('admin'), assignTrainer);
router.get('/members/:memberId/trainer', getMemberTrainer);

module.exports = router;
```

- [ ] **Step 4: Mount in `src/app.js`**

Add import:
```javascript
const trainerRoutes = require('./routes/trainerRoutes');
```
Add mount:
```javascript
app.use('/api', trainerRoutes);
```

- [ ] **Step 5: Verify**

```bash
cd /Users/krishnagangwal/gym-management-system/server
npm run dev &
sleep 1
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@gym.com","password":"Admin@123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s -X POST http://localhost:5000/api/trainers \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"firstName":"Vikram","lastName":"Singh","email":"vikram@gym.com","specialization":"Strength Training","availability":"Mon-Fri 6am-2pm"}'
echo
curl -s -X POST http://localhost:5000/api/trainers/1/assign/1 -H "Authorization: Bearer $TOKEN"
echo
curl -s http://localhost:5000/api/members/1/trainer -H "Authorization: Bearer $TOKEN"
```

Expected: trainer created with `id:1`; assignment returns 201; the member's trainer lookup returns Vikram Singh.

- [ ] **Step 6: Commit**

```bash
cd /Users/krishnagangwal/gym-management-system
git add server/src/db/trainersDb.js server/src/controllers/trainerController.js server/src/routes/trainerRoutes.js server/src/app.js
git commit -m "Add trainers API and trainer-member assignment with history"
```

---

### Task 8: Exercises and Workout Plans API

**Files:**
- Create: `server/src/db/exercisesDb.js`
- Create: `server/src/controllers/exerciseController.js`
- Create: `server/src/routes/exerciseRoutes.js`
- Create: `server/src/db/workoutPlansDb.js`
- Create: `server/src/controllers/workoutPlanController.js`
- Create: `server/src/routes/workoutPlanRoutes.js`
- Modify: `server/src/app.js`

**Interfaces:**
- Consumes: `pool`, `verifyToken`, `requireRole` (Task 3–4); `trainersDb.findById` (Task 7).
- Produces: `workoutPlansDb.findById` — used by Task 9 (`member_workout_plans.workout_plan_id`).
- Produces: routes `GET/POST /api/exercises`; `GET/POST /api/workout-plans`, `GET /api/workout-plans/:id` (with exercises), `POST /api/workout-plans/:id/exercises`.

- [ ] **Step 1: Write `src/db/exercisesDb.js`**

```javascript
const pool = require('../config/db');

async function create({ name, description, muscleGroup }) {
  const result = await pool.query(
    'INSERT INTO exercises (name, description, muscle_group) VALUES ($1,$2,$3) RETURNING *',
    [name, description || null, muscleGroup || null]
  );
  return result.rows[0];
}

async function findAll() {
  const result = await pool.query('SELECT * FROM exercises ORDER BY id');
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM exercises WHERE id = $1', [id]);
  return result.rows[0];
}

module.exports = { create, findAll, findById };
```

- [ ] **Step 2: Write `src/controllers/exerciseController.js`**

```javascript
const exercisesDb = require('../db/exercisesDb');

async function createExercise(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    res.status(201).json(await exercisesDb.create(req.body));
  } catch (err) {
    next(err);
  }
}

async function listExercises(req, res, next) {
  try {
    res.json(await exercisesDb.findAll());
  } catch (err) {
    next(err);
  }
}

module.exports = { createExercise, listExercises };
```

- [ ] **Step 3: Write `src/routes/exerciseRoutes.js`**

```javascript
const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { createExercise, listExercises } = require('../controllers/exerciseController');

const router = express.Router();

router.use(verifyToken);
router.get('/', listExercises);
router.post('/', requireRole('admin'), createExercise);

module.exports = router;
```

- [ ] **Step 4: Write `src/db/workoutPlansDb.js`**

```javascript
const pool = require('../config/db');

async function create({ name, description, difficultyLevel, createdBy }) {
  const result = await pool.query(
    'INSERT INTO workout_plans (name, description, difficulty_level, created_by) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, description || null, difficultyLevel || null, createdBy || null]
  );
  return result.rows[0];
}

async function findAll() {
  const result = await pool.query('SELECT * FROM workout_plans ORDER BY id');
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM workout_plans WHERE id = $1', [id]);
  return result.rows[0];
}

async function addExercise(planId, { exerciseId, dayOfWeek, sets, reps }) {
  const result = await pool.query(
    `INSERT INTO workout_plan_exercises (workout_plan_id, exercise_id, day_of_week, sets, reps)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [planId, exerciseId, dayOfWeek, sets, reps]
  );
  return result.rows[0];
}

async function findExercises(planId) {
  const result = await pool.query(
    `SELECT wpe.id, wpe.day_of_week, wpe.sets, wpe.reps, e.name AS exercise_name, e.muscle_group
     FROM workout_plan_exercises wpe
     JOIN exercises e ON e.id = wpe.exercise_id
     WHERE wpe.workout_plan_id = $1
     ORDER BY array_position(ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], wpe.day_of_week)`,
    [planId]
  );
  return result.rows;
}

module.exports = { create, findAll, findById, addExercise, findExercises };
```

- [ ] **Step 5: Write `src/controllers/workoutPlanController.js`**

```javascript
const workoutPlansDb = require('../db/workoutPlansDb');
const exercisesDb = require('../db/exercisesDb');

async function createPlan(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    res.status(201).json(await workoutPlansDb.create(req.body));
  } catch (err) {
    next(err);
  }
}

async function listPlans(req, res, next) {
  try {
    res.json(await workoutPlansDb.findAll());
  } catch (err) {
    next(err);
  }
}

async function getPlan(req, res, next) {
  try {
    const plan = await workoutPlansDb.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Workout plan not found' });
    const exercises = await workoutPlansDb.findExercises(req.params.id);
    res.json({ ...plan, exercises });
  } catch (err) {
    next(err);
  }
}

async function addExerciseToPlan(req, res, next) {
  try {
    const plan = await workoutPlansDb.findById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'Workout plan not found' });

    const { exerciseId, dayOfWeek, sets, reps } = req.body;
    if (!exerciseId || !dayOfWeek || !sets || !reps) {
      return res.status(400).json({ error: 'exerciseId, dayOfWeek, sets, and reps are required' });
    }
    const exercise = await exercisesDb.findById(exerciseId);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

    res.status(201).json(await workoutPlansDb.addExercise(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

module.exports = { createPlan, listPlans, getPlan, addExerciseToPlan };
```

- [ ] **Step 6: Write `src/routes/workoutPlanRoutes.js`**

```javascript
const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { createPlan, listPlans, getPlan, addExerciseToPlan } = require('../controllers/workoutPlanController');

const router = express.Router();

router.use(verifyToken);
router.get('/', listPlans);
router.get('/:id', getPlan);
router.post('/', requireRole('admin'), createPlan);
router.post('/:id/exercises', requireRole('admin'), addExerciseToPlan);

module.exports = router;
```

- [ ] **Step 7: Mount both in `src/app.js`**

Add imports:
```javascript
const exerciseRoutes = require('./routes/exerciseRoutes');
const workoutPlanRoutes = require('./routes/workoutPlanRoutes');
```
Add mounts:
```javascript
app.use('/api/exercises', exerciseRoutes);
app.use('/api/workout-plans', workoutPlanRoutes);
```

- [ ] **Step 8: Verify**

```bash
cd /Users/krishnagangwal/gym-management-system/server
npm run dev &
sleep 1
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@gym.com","password":"Admin@123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s -X POST http://localhost:5000/api/workout-plans \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Beginner Strength","difficultyLevel":"beginner","createdBy":1}'
echo
curl -s -X POST http://localhost:5000/api/workout-plans/1/exercises \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"exerciseId":1,"dayOfWeek":"Monday","sets":3,"reps":10}'
echo
curl -s http://localhost:5000/api/workout-plans/1 -H "Authorization: Bearer $TOKEN"
```

Expected: plan created with `id:1`; exercise added; the GET returns the plan with an `exercises` array containing Bench Press on Monday, 3x10 — matching the example in spec §3.

- [ ] **Step 9: Commit**

```bash
cd /Users/krishnagangwal/gym-management-system
git add server/src/db/exercisesDb.js server/src/controllers/exerciseController.js server/src/routes/exerciseRoutes.js server/src/db/workoutPlansDb.js server/src/controllers/workoutPlanController.js server/src/routes/workoutPlanRoutes.js server/src/app.js
git commit -m "Add exercises and workout plans API"
```

---

### Task 9: Member Workout Plan Assignment API

**Files:**
- Modify: `server/src/db/workoutPlansDb.js`
- Create: `server/src/controllers/memberWorkoutController.js`
- Create: `server/src/routes/memberWorkoutRoutes.js`
- Modify: `server/src/app.js`

**Interfaces:**
- Consumes: `workoutPlansDb.findById` (Task 8), `membersDb.findById` (Task 5).
- Produces: routes `POST /api/members/:memberId/workout-plans/:planId`, `GET /api/members/:memberId/workout-plans` — a member's assigned plan(s), used by the frontend's Member Details page.

- [ ] **Step 1: Add member-workout-plan queries to `src/db/workoutPlansDb.js`**

Append to the file, above `module.exports`:

```javascript
async function assignToMember(memberId, workoutPlanId) {
  const result = await pool.query(
    'INSERT INTO member_workout_plans (member_id, workout_plan_id) VALUES ($1,$2) RETURNING *',
    [memberId, workoutPlanId]
  );
  return result.rows[0];
}

async function findForMember(memberId) {
  const result = await pool.query(
    `SELECT mwp.id AS assignment_id, mwp.assigned_date, mwp.is_active, wp.*
     FROM member_workout_plans mwp
     JOIN workout_plans wp ON wp.id = mwp.workout_plan_id
     WHERE mwp.member_id = $1 AND mwp.is_active = TRUE
     ORDER BY mwp.assigned_date DESC`,
    [memberId]
  );
  return result.rows;
}
```

Update the `module.exports` line at the bottom of the file to:

```javascript
module.exports = { create, findAll, findById, addExercise, findExercises, assignToMember, findForMember };
```

- [ ] **Step 2: Write `src/controllers/memberWorkoutController.js`**

```javascript
const workoutPlansDb = require('../db/workoutPlansDb');
const membersDb = require('../db/membersDb');

async function assign(req, res, next) {
  try {
    const { memberId, planId } = req.params;
    const member = await membersDb.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const plan = await workoutPlansDb.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Workout plan not found' });

    res.status(201).json(await workoutPlansDb.assignToMember(memberId, planId));
  } catch (err) {
    next(err);
  }
}

async function listForMember(req, res, next) {
  try {
    res.json(await workoutPlansDb.findForMember(req.params.memberId));
  } catch (err) {
    next(err);
  }
}

module.exports = { assign, listForMember };
```

- [ ] **Step 3: Write `src/routes/memberWorkoutRoutes.js`**

```javascript
const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { assign, listForMember } = require('../controllers/memberWorkoutController');

const router = express.Router();

router.use(verifyToken);
router.post('/members/:memberId/workout-plans/:planId', requireRole('admin'), assign);
router.get('/members/:memberId/workout-plans', listForMember);

module.exports = router;
```

- [ ] **Step 4: Mount in `src/app.js`**

Add import:
```javascript
const memberWorkoutRoutes = require('./routes/memberWorkoutRoutes');
```
Add mount:
```javascript
app.use('/api', memberWorkoutRoutes);
```

- [ ] **Step 5: Verify**

```bash
cd /Users/krishnagangwal/gym-management-system/server
npm run dev &
sleep 1
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@gym.com","password":"Admin@123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s -X POST http://localhost:5000/api/members/1/workout-plans/1 -H "Authorization: Bearer $TOKEN"
echo
curl -s http://localhost:5000/api/members/1/workout-plans -H "Authorization: Bearer $TOKEN"
```

Expected: assignment returns 201; the GET returns an array with the "Beginner Strength" plan.

- [ ] **Step 6: Commit**

```bash
cd /Users/krishnagangwal/gym-management-system
git add server/src/db/workoutPlansDb.js server/src/controllers/memberWorkoutController.js server/src/routes/memberWorkoutRoutes.js server/src/app.js
git commit -m "Add member workout plan assignment API"
```

---

### Task 10: Attendance API

**Files:**
- Create: `server/src/db/attendanceDb.js`
- Create: `server/src/controllers/attendanceController.js`
- Create: `server/src/routes/attendanceRoutes.js`
- Modify: `server/src/app.js`

**Interfaces:**
- Consumes: `membershipsDb.hasActiveMembership` (Task 6), `membersDb.findById` (Task 5).
- Produces: `attendanceDb.findAll` (with member/date filters) — used by Task 12's dashboard "today's attendance" count.
- Produces: routes `POST /api/attendance/check-in`, `PATCH /api/attendance/:id/check-out`, `GET /api/attendance`.

- [ ] **Step 1: Write `src/db/attendanceDb.js`**

```javascript
const pool = require('../config/db');

async function checkIn(memberId) {
  const result = await pool.query(
    'INSERT INTO attendance (member_id) VALUES ($1) RETURNING *',
    [memberId]
  );
  return result.rows[0];
}

async function checkOut(id) {
  const result = await pool.query(
    'UPDATE attendance SET check_out_time = NOW() WHERE id = $1 AND check_out_time IS NULL RETURNING *',
    [id]
  );
  return result.rows[0];
}

async function findAll({ memberId, date, month }) {
  const conditions = [];
  const params = [];

  if (memberId) {
    params.push(memberId);
    conditions.push(`a.member_id = $${params.length}`);
  }
  if (date) {
    params.push(date);
    conditions.push(`a.check_in_time::date = $${params.length}`);
  }
  if (month) {
    params.push(month); // 'YYYY-MM'
    conditions.push(`to_char(a.check_in_time, 'YYYY-MM') = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT a.*, m.first_name, m.last_name
     FROM attendance a JOIN members m ON m.id = a.member_id
     ${where} ORDER BY a.check_in_time DESC`,
    params
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query('SELECT * FROM attendance WHERE id = $1', [id]);
  return result.rows[0];
}

async function countForDate(date) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM attendance WHERE check_in_time::date = $1`,
    [date]
  );
  return result.rows[0].count;
}

module.exports = { checkIn, checkOut, findAll, findById, countForDate };
```

- [ ] **Step 2: Write `src/controllers/attendanceController.js`**

```javascript
const attendanceDb = require('../db/attendanceDb');
const membersDb = require('../db/membersDb');
const membershipsDb = require('../db/membershipsDb');

async function checkInMember(req, res, next) {
  try {
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ error: 'memberId is required' });

    const member = await membersDb.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (!member.is_active) {
      return res.status(403).json({ error: 'This member is deactivated and cannot check in' });
    }

    const activeMembership = await membershipsDb.hasActiveMembership(memberId);
    if (!activeMembership) {
      return res.status(403).json({ error: 'Member has no active membership. Check-in denied.' });
    }

    res.status(201).json(await attendanceDb.checkIn(memberId));
  } catch (err) {
    next(err);
  }
}

async function checkOutMember(req, res, next) {
  try {
    const record = await attendanceDb.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Attendance record not found' });
    if (record.check_out_time) return res.status(409).json({ error: 'Already checked out' });

    res.json(await attendanceDb.checkOut(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function listAttendance(req, res, next) {
  try {
    const { memberId, date, month } = req.query;
    res.json(await attendanceDb.findAll({ memberId, date, month }));
  } catch (err) {
    next(err);
  }
}

module.exports = { checkInMember, checkOutMember, listAttendance };
```

This is where spec §4 rule 2 ("no check-in without an active membership") is enforced — `checkInMember` calls `membershipsDb.hasActiveMembership` before writing any row.

- [ ] **Step 3: Write `src/routes/attendanceRoutes.js`**

```javascript
const express = require('express');
const verifyToken = require('../middleware/auth');
const { checkInMember, checkOutMember, listAttendance } = require('../controllers/attendanceController');

const router = express.Router();

router.use(verifyToken);
router.post('/check-in', checkInMember);
router.patch('/:id/check-out', checkOutMember);
router.get('/', listAttendance);

module.exports = router;
```

- [ ] **Step 4: Mount in `src/app.js`**

Add import:
```javascript
const attendanceRoutes = require('./routes/attendanceRoutes');
```
Add mount:
```javascript
app.use('/api/attendance', attendanceRoutes);
```

- [ ] **Step 5: Verify**

```bash
cd /Users/krishnagangwal/gym-management-system/server
npm run dev &
sleep 1
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@gym.com","password":"Admin@123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# member 1 has an active membership from Task 6 — should succeed
curl -s -X POST http://localhost:5000/api/attendance/check-in \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"memberId":1}'
echo

# create a second member with NO membership — should be denied
curl -s -X POST http://localhost:5000/api/members \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"firstName":"NoPlan","lastName":"Member","email":"noplan@example.com","phone":"8888888888"}'
curl -s -X POST http://localhost:5000/api/attendance/check-in \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"memberId":2}'
echo

curl -s -X PATCH http://localhost:5000/api/attendance/1/check-out -H "Authorization: Bearer $TOKEN"
```

Expected: first check-in returns 201; second returns 403 `{"error":"Member has no active membership. Check-in denied."}`; the PATCH fills in `check_out_time` on record 1.

- [ ] **Step 6: Commit**

```bash
cd /Users/krishnagangwal/gym-management-system
git add server/src/db/attendanceDb.js server/src/controllers/attendanceController.js server/src/routes/attendanceRoutes.js server/src/app.js
git commit -m "Add attendance API with active-membership check-in guard"
```

---

### Task 11: Payments API

**Files:**
- Create: `server/src/db/paymentsDb.js`
- Create: `server/src/controllers/paymentController.js`
- Create: `server/src/routes/paymentRoutes.js`
- Modify: `server/src/app.js`

**Interfaces:**
- Consumes: `membersDb.findById` (Task 5), `pool` (Task 3). Reads (does not modify) `memberships` rows created in Task 6.
- Produces: `paymentsDb.sumForMonth`, `paymentsDb.findRecent` — used by Task 12's dashboard revenue/recent-payments cards.
- Produces: routes `POST /api/payments`, `GET /api/payments`, `GET /api/payments/:id/receipt`.

- [ ] **Step 1: Write `src/db/paymentsDb.js`**

```javascript
const pool = require('../config/db');

async function create({ memberId, membershipId, amount, paymentDate, paymentMethod }) {
  const result = await pool.query(
    `INSERT INTO payments (member_id, membership_id, amount, payment_date, payment_method)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [memberId, membershipId, amount, paymentDate, paymentMethod]
  );
  return result.rows[0];
}

async function findAll({ memberId }) {
  const params = [];
  let where = '';
  if (memberId) {
    params.push(memberId);
    where = 'WHERE p.member_id = $1';
  }
  const result = await pool.query(
    `SELECT p.*, m.first_name, m.last_name
     FROM payments p JOIN members m ON m.id = p.member_id
     ${where} ORDER BY p.payment_date DESC`,
    params
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT p.*, m.first_name, m.last_name, m.email, ms.start_date, ms.end_date, mp.name AS plan_name
     FROM payments p
     JOIN members m ON m.id = p.member_id
     JOIN memberships ms ON ms.id = p.membership_id
     JOIN membership_plans mp ON mp.id = ms.plan_id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0];
}

async function sumForMonth(month) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM payments WHERE to_char(payment_date, 'YYYY-MM') = $1`,
    [month]
  );
  return result.rows[0].total;
}

async function findRecent(limit) {
  const result = await pool.query(
    `SELECT p.*, m.first_name, m.last_name
     FROM payments p JOIN members m ON m.id = p.member_id
     ORDER BY p.payment_date DESC, p.id DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

module.exports = { create, findAll, findById, sumForMonth, findRecent };
```

- [ ] **Step 2: Write `src/controllers/paymentController.js`**

```javascript
const paymentsDb = require('../db/paymentsDb');
const membersDb = require('../db/membersDb');
const pool = require('../config/db');

const VALID_METHODS = ['cash', 'card', 'upi', 'bank_transfer'];

async function createPayment(req, res, next) {
  try {
    const { memberId, membershipId, amount, paymentDate, paymentMethod } = req.body;
    if (!memberId || !membershipId || !amount || !paymentDate || !paymentMethod) {
      return res.status(400).json({ error: 'memberId, membershipId, amount, paymentDate, and paymentMethod are required' });
    }
    if (amount <= 0) return res.status(400).json({ error: 'amount must be positive' });
    if (!VALID_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ error: `paymentMethod must be one of: ${VALID_METHODS.join(', ')}` });
    }

    const member = await membersDb.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const membershipCheck = await pool.query('SELECT id FROM memberships WHERE id = $1 AND member_id = $2', [membershipId, memberId]);
    if (membershipCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Membership not found for this member' });
    }

    res.status(201).json(await paymentsDb.create(req.body));
  } catch (err) {
    next(err);
  }
}

async function listPayments(req, res, next) {
  try {
    res.json(await paymentsDb.findAll({ memberId: req.query.memberId }));
  } catch (err) {
    next(err);
  }
}

async function getReceipt(req, res, next) {
  try {
    const payment = await paymentsDb.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json({
      receiptNumber: `RCPT-${String(payment.id).padStart(6, '0')}`,
      memberName: `${payment.first_name} ${payment.last_name}`,
      memberEmail: payment.email,
      plan: payment.plan_name,
      membershipPeriod: { start: payment.start_date, end: payment.end_date },
      amount: payment.amount,
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createPayment, listPayments, getReceipt };
```

- [ ] **Step 3: Write `src/routes/paymentRoutes.js`**

```javascript
const express = require('express');
const verifyToken = require('../middleware/auth');
const { createPayment, listPayments, getReceipt } = require('../controllers/paymentController');

const router = express.Router();

router.use(verifyToken);
router.post('/', createPayment);
router.get('/', listPayments);
router.get('/:id/receipt', getReceipt);

module.exports = router;
```

- [ ] **Step 4: Mount in `src/app.js`**

Add import:
```javascript
const paymentRoutes = require('./routes/paymentRoutes');
```
Add mount:
```javascript
app.use('/api/payments', paymentRoutes);
```

- [ ] **Step 5: Verify**

```bash
cd /Users/krishnagangwal/gym-management-system/server
npm run dev &
sleep 1
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@gym.com","password":"Admin@123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s -X POST http://localhost:5000/api/payments \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"memberId":1,"membershipId":1,"amount":1500,"paymentDate":"2026-08-19","paymentMethod":"upi"}'
echo
curl -s http://localhost:5000/api/payments/1/receipt -H "Authorization: Bearer $TOKEN"
```

Expected: payment created with `id:1`; receipt returns `receiptNumber: "RCPT-000001"` with member/plan/amount details.

- [ ] **Step 6: Commit**

```bash
cd /Users/krishnagangwal/gym-management-system
git add server/src/db/paymentsDb.js server/src/controllers/paymentController.js server/src/routes/paymentRoutes.js server/src/app.js
git commit -m "Add payments API with receipt generation"
```

---

### Task 12: Dashboard API

**Files:**
- Create: `server/src/controllers/dashboardController.js`
- Create: `server/src/routes/dashboardRoutes.js`
- Modify: `server/src/app.js`

**Interfaces:**
- Consumes: `pool` directly for simple counts; `attendanceDb.countForDate` (Task 10); `paymentsDb.sumForMonth`, `paymentsDb.findRecent` (Task 11).
- Produces: `GET /api/dashboard/summary` → the single aggregate object the frontend Dashboard page renders.

- [ ] **Step 1: Write `src/controllers/dashboardController.js`**

```javascript
const pool = require('../config/db');
const attendanceDb = require('../db/attendanceDb');
const paymentsDb = require('../db/paymentsDb');

async function getSummary(req, res, next) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);
    const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [
      totalMembers, activeMembers, expiredMemberships, totalTrainers,
      todaysAttendance, expiringSoon, monthlyRevenue, recentPayments,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM members'),
      pool.query('SELECT COUNT(*)::int AS count FROM members WHERE is_active = TRUE'),
      pool.query(`SELECT COUNT(*)::int AS count FROM memberships WHERE status = 'active' AND end_date < CURRENT_DATE`),
      pool.query('SELECT COUNT(*)::int AS count FROM trainers WHERE is_active = TRUE'),
      attendanceDb.countForDate(today),
      pool.query(
        `SELECT ms.id, m.first_name, m.last_name, ms.end_date
         FROM memberships ms JOIN members m ON m.id = ms.member_id
         WHERE ms.status = 'active' AND ms.end_date BETWEEN CURRENT_DATE AND $1
         ORDER BY ms.end_date ASC`,
        [inSevenDays]
      ),
      paymentsDb.sumForMonth(currentMonth),
      paymentsDb.findRecent(5),
    ]);

    res.json({
      totalMembers: totalMembers.rows[0].count,
      activeMembers: activeMembers.rows[0].count,
      expiredMemberships: expiredMemberships.rows[0].count,
      totalTrainers: totalTrainers.rows[0].count,
      todaysAttendance,
      membershipsExpiringSoon: expiringSoon.rows,
      monthlyRevenue,
      recentPayments,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary };
```

- [ ] **Step 2: Write `src/routes/dashboardRoutes.js`**

```javascript
const express = require('express');
const verifyToken = require('../middleware/auth');
const { getSummary } = require('../controllers/dashboardController');

const router = express.Router();

router.use(verifyToken);
router.get('/summary', getSummary);

module.exports = router;
```

- [ ] **Step 3: Mount in `src/app.js`**

Add import:
```javascript
const dashboardRoutes = require('./routes/dashboardRoutes');
```
Add mount:
```javascript
app.use('/api/dashboard', dashboardRoutes);
```

- [ ] **Step 4: Verify**

```bash
cd /Users/krishnagangwal/gym-management-system/server
npm run dev &
sleep 1
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@gym.com","password":"Admin@123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s http://localhost:5000/api/dashboard/summary -H "Authorization: Bearer $TOKEN"
```

Expected: a JSON object with `totalMembers: 2`, `activeMembers: 2`, `totalTrainers: 1`, `todaysAttendance: 1`, `monthlyRevenue: "1500.00"`, and a `recentPayments` array with the one payment from Task 11.

- [ ] **Step 5: Commit**

```bash
cd /Users/krishnagangwal/gym-management-system
git add server/src/controllers/dashboardController.js server/src/routes/dashboardRoutes.js server/src/app.js
git commit -m "Add dashboard summary API"
```

---

## Plan Self-Review Notes

- **Spec coverage:** Every Module 1–3 feature in spec §3 has a corresponding endpoint. Dashboard fields in spec §3 are all present in Task 12's response. Business rules 1 (append-only renewal, Task 6), 2 (check-in guard, Task 10), 3/4 (trainer assignment history, Task 7), 5/6 (workout plan/exercise structure, Task 8), 7 (payments reference member+membership, Task 11), 8 (soft deactivation, Tasks 5 and 7) are all implemented and each has an explicit curl verification proving the rule.
- **Not covered here (intentionally, per spec phasing):** Frontend UI (separate plan), formal automated test suite (spec Phase 11, after both plans).
- **Type consistency checked:** `membersDb`, `membershipsDb`, `trainersDb`, `workoutPlansDb`, `attendanceDb`, `paymentsDb` function names and return shapes are used identically wherever a later task imports them (e.g., `membershipsDb.hasActiveMembership` used in Task 6 and Task 10 with the same signature).

