/*
 * Generates ~150 additional members with 12 months of realistic history:
 * membership chains (including churn/non-renewal), attendance with
 * weekday and peak-hour patterns, and payments across all four methods.
 *
 * Fully separate from seed.sql: it only adds new rows (emails end in
 * @demo.local so they never collide with seed.sql's @example.com rows)
 * and never touches the original 8 members / 5 trainers. Run seed.sql
 * first; this is optional on top of it.
 *
 * Usage:  node database/seed_demo.js
 * Reads DB connection info from server/.env, same as the app itself.
 */
const path = require('path');
const { Pool } = require('../server/node_modules/pg');
require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '../server/.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const MEMBER_COUNT = 150;
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

// ---------------------------------------------------------------------
// Random data pools
// ---------------------------------------------------------------------

const FIRST_NAMES_MALE = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Krishna', 'Ishaan',
  'Rohan', 'Kabir', 'Aryan', 'Dhruv', 'Sai', 'Yash', 'Aniket', 'Manish',
  'Nikhil', 'Rajat', 'Siddharth', 'Varun', 'Gaurav', 'Harsh', 'Naveen', 'Rakesh',
];
const FIRST_NAMES_FEMALE = [
  'Aanya', 'Diya', 'Myra', 'Anika', 'Saanvi', 'Ira', 'Riya', 'Kavya',
  'Aditi', 'Isha', 'Meera', 'Pooja', 'Neha', 'Shreya', 'Tanvi', 'Bhavna',
  'Ritika', 'Sneha', 'Nisha', 'Simran', 'Anjali', 'Deepika', 'Komal', 'Swati',
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Kumar', 'Patel', 'Mehta', 'Iyer', 'Malhotra', 'Nair',
  'Reddy', 'Gupta', 'Joshi', 'Chopra', 'Kapoor', 'Bhat', 'Rao', 'Pillai',
  'Agarwal', 'Bose', 'Mukherjee', 'Menon', 'Saxena', 'Chauhan', 'Trivedi', 'Naidu',
];
const CITIES = [
  'Andheri, Mumbai', 'Koramangala, Bengaluru', 'Sector 21, Noida', 'Satellite, Ahmedabad',
  'Baner, Pune', 'T. Nagar, Chennai', 'Model Town, Delhi', 'Kakkanad, Kochi',
  'Banjara Hills, Hyderabad', 'Malviya Nagar, Jaipur', 'Salt Lake, Kolkata', 'Vashi, Navi Mumbai',
];

const PAYMENT_METHODS = ['cash', 'card', 'upi', 'bank_transfer'];
const PAYMENT_METHOD_WEIGHTS = [0.2, 0.25, 0.35, 0.2];

// Sun=0 .. Sat=6 — heavier on Mon/Wed/Fri, lighter midweek and Sunday.
const WEEKDAY_WEIGHT = [0.25, 0.85, 0.55, 0.8, 0.55, 0.75, 0.5];

const PROFILES = [
  { name: 'renewer', count: 30 },
  { name: 'at_risk', count: 22 },
  { name: 'lapsed', count: 30 },
  { name: 'new', count: 23 },
  { name: 'normal', count: 45 },
];

// ---------------------------------------------------------------------
// Random helpers
// ---------------------------------------------------------------------

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function weightedChoice(values, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < values.length; i++) {
    r -= weights[i];
    if (r <= 0) return values[i];
  }
  return values[values.length - 1];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Local calendar date, not UTC — toISOString() would shift the date by a
// day in timezones ahead of UTC (e.g. IST), same pitfall formatDate.js
// documents for todayISO().
function toDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ---------------------------------------------------------------------
// Member profile generation
// ---------------------------------------------------------------------

function buildProfileList() {
  const list = [];
  for (const p of PROFILES) {
    for (let i = 0; i < p.count; i++) list.push(p.name);
  }
  return list;
}

function randomJoinDate(profile) {
  switch (profile) {
    case 'new':
      return addDays(TODAY, -randInt(1, 29));
    case 'at_risk':
      return addDays(TODAY, -randInt(60, 300));
    case 'renewer':
      return addDays(TODAY, -randInt(300, 360));
    case 'lapsed':
      return addDays(TODAY, -randInt(150, 360));
    default:
      return addDays(TODAY, -randInt(30, 340));
  }
}

// One membership row per period; end_date = start_date + duration_days,
// matching membershipsDb.create's own computation.
function buildMembershipChain(joinDate, plan, profile) {
  const periods = [];
  let start = new Date(joinDate);

  if (profile === 'lapsed') {
    const lapseCutoff = addDays(TODAY, -randInt(90, 270));
    while (true) {
      const end = addDays(start, plan.duration_days);
      if (end >= lapseCutoff) break;
      periods.push({ start_date: new Date(start), end_date: end });
      start = addDays(end, randInt(0, 3));
    }
    if (periods.length === 0) {
      // Guarantee at least one period even for a short-tenured lapsed member.
      periods.push({ start_date: new Date(start), end_date: addDays(start, plan.duration_days) });
    }
    return periods;
  }

  // renewer / at_risk / new keep renewing straight through to today.
  // normal has a 40% chance of not having renewed yet (recently expired).
  const rollsOverToday = profile === 'normal' ? Math.random() < 0.6 : true;
  const boundary = rollsOverToday ? TODAY : addDays(TODAY, -randInt(1, 60));

  while (true) {
    const end = addDays(start, plan.duration_days);
    periods.push({ start_date: new Date(start), end_date: end });
    if (end >= boundary) break;
    start = addDays(end, randInt(0, 3));
  }
  return periods;
}

function pickPlan(plans) {
  return weightedChoice(plans, plans.map((p) => (p.name === 'Monthly' ? 0.55 : p.name === 'Quarterly' ? 0.3 : 0.15)));
}

// ---------------------------------------------------------------------
// Attendance generation
// ---------------------------------------------------------------------

function randomCheckInTime(dateOnly) {
  const r = Math.random();
  let hour;
  if (r < 0.45) hour = randInt(6, 8);
  else if (r < 0.85) hour = randInt(17, 20);
  else hour = randInt(9, 16);
  const minute = randInt(0, 59);
  const d = new Date(dateOnly);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function buildAttendance(memberId, windowStart, windowEnd, visitsPerWeek) {
  const rows = [];
  if (windowEnd <= windowStart) return rows;

  let cursor = new Date(windowStart);
  while (cursor <= windowEnd) {
    const dow = cursor.getDay();
    const prob = clamp(WEEKDAY_WEIGHT[dow] * (visitsPerWeek / 4.5), 0, 0.95);
    if (Math.random() < prob) {
      const checkIn = randomCheckInTime(cursor);
      const hasCheckout = Math.random() < 0.95;
      const checkOut = hasCheckout ? new Date(checkIn.getTime() + randInt(30, 100) * 60000) : null;
      rows.push({ member_id: memberId, check_in_time: checkIn, check_out_time: checkOut });
    }
    cursor = addDays(cursor, 1);
  }
  return rows;
}

function attendanceWindow(profile, joinDate, periods) {
  const lastPeriodEnd = periods[periods.length - 1].end_date;
  switch (profile) {
    case 'lapsed':
      return { start: joinDate, end: lastPeriodEnd < TODAY ? lastPeriodEnd : addDays(TODAY, -1) };
    case 'at_risk':
      return { start: joinDate, end: addDays(TODAY, -randInt(14, 35)) };
    default:
      return { start: joinDate, end: lastPeriodEnd < TODAY ? lastPeriodEnd : TODAY };
  }
}

function visitsPerWeekFor(profile) {
  switch (profile) {
    case 'renewer': return randInt(2, 4);
    case 'at_risk': return randInt(1, 3);
    case 'new': return randInt(1, 4);
    case 'lapsed': return randInt(1, 3);
    default: return randInt(1, 3);
  }
}

// ---------------------------------------------------------------------
// Batch insert helper (used for the large attendance table)
// ---------------------------------------------------------------------

async function batchInsert(client, table, columns, rows, chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = [];
    const placeholders = chunk.map((row, r) => {
      const offset = r * columns.length;
      columns.forEach((col) => values.push(row[col]));
      return `(${columns.map((_, c) => `$${offset + c + 1}`).join(',')})`;
    });
    await client.query(
      `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders.join(',')}`,
      values
    );
  }
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------

async function main() {
  const client = await pool.connect();
  try {
    const existing = await client.query(`SELECT COUNT(*)::int AS count FROM members WHERE email LIKE '%@demo.local'`);
    if (existing.rows[0].count > 0) {
      console.error(`Found ${existing.rows[0].count} existing @demo.local members — seed_demo.js has already been run. Aborting to avoid duplicates.`);
      process.exit(1);
    }

    const baseline = await client.query('SELECT COUNT(*)::int AS count FROM members');
    if (baseline.rows[0].count === 0) {
      console.error('No members found. Run database/seed.sql first, then re-run this script.');
      process.exit(1);
    }

    const plansResult = await client.query(
      `SELECT id, name, duration_days, price FROM membership_plans WHERE name = ANY($1)`,
      [['Monthly', 'Quarterly', 'Annual']]
    );
    if (plansResult.rows.length < 3) {
      console.error('Expected the Monthly/Quarterly/Annual plans from seed.sql to exist. Run database/seed.sql first.');
      process.exit(1);
    }
    const plans = plansResult.rows;

    const profileList = buildProfileList();
    // Shuffle so profile order doesn't correlate with insertion order / ids.
    for (let i = profileList.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [profileList[i], profileList[j]] = [profileList[j], profileList[i]];
    }

    await client.query('BEGIN');

    let membershipCount = 0;
    let paymentCount = 0;
    const attendanceRows = [];

    for (let i = 0; i < MEMBER_COUNT; i++) {
      const profile = profileList[i];
      const isMale = Math.random() < 0.5;
      const firstName = randChoice(isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE);
      const lastName = randChoice(LAST_NAMES);
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@demo.local`;
      const phone = `9${randInt(100000000, 999999999)}`;
      const age = randInt(18, 55);
      const dob = new Date(TODAY.getFullYear() - age, randInt(0, 11), randInt(1, 28));
      const joinDate = randomJoinDate(profile);
      const isActive = profile === 'lapsed' ? Math.random() < 0.5 : true;

      const memberResult = await client.query(
        `INSERT INTO members (first_name, last_name, email, phone, date_of_birth, gender, address, join_date, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [firstName, lastName, email, phone, toDateStr(dob), isMale ? 'Male' : 'Female', randChoice(CITIES), toDateStr(joinDate), isActive]
      );
      const memberId = memberResult.rows[0].id;

      const plan = pickPlan(plans);
      const periods = buildMembershipChain(joinDate, plan, profile);

      const membershipIds = [];
      for (const period of periods) {
        const msResult = await client.query(
          `INSERT INTO memberships (member_id, plan_id, start_date, end_date, status)
           VALUES ($1,$2,$3,$4,'active') RETURNING id`,
          [memberId, plan.id, toDateStr(period.start_date), toDateStr(period.end_date)]
        );
        membershipIds.push(msResult.rows[0].id);
        membershipCount++;
      }

      for (let p = 0; p < periods.length; p++) {
        const paymentDate = addDays(periods[p].start_date, randInt(0, 2));
        const method = weightedChoice(PAYMENT_METHODS, PAYMENT_METHOD_WEIGHTS);
        await client.query(
          `INSERT INTO payments (member_id, membership_id, amount, payment_date, payment_method)
           VALUES ($1,$2,$3,$4,$5)`,
          [memberId, membershipIds[p], plan.price, toDateStr(paymentDate), method]
        );
        paymentCount++;
      }

      const window = attendanceWindow(profile, joinDate, periods);
      const visitsPerWeek = visitsPerWeekFor(profile);
      attendanceRows.push(...buildAttendance(memberId, window.start, window.end, visitsPerWeek));

      if ((i + 1) % 25 === 0) console.log(`  ...${i + 1}/${MEMBER_COUNT} members generated`);
    }

    console.log(`Inserting ${attendanceRows.length} attendance rows...`);
    await batchInsert(client, 'attendance', ['member_id', 'check_in_time', 'check_out_time'], attendanceRows);

    await client.query('COMMIT');

    console.log('\nDone.');
    console.log(`  Members:     ${MEMBER_COUNT}`);
    console.log(`  Memberships: ${membershipCount}`);
    console.log(`  Payments:    ${paymentCount}`);
    console.log(`  Attendance:  ${attendanceRows.length}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed, rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
