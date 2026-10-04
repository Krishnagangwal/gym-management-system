/*
 * Seeds 6 months of body-metric progress entries and workout logs for the
 * demo member (Rahul Sharma, member_id 1 / rahul@example.com), so the new
 * Member Portal "My Progress" and "Today's Workout" charts have real history
 * to show instead of being empty on first login.
 *
 * Progress entries are logged weekly with a gradual, realistic trend (weight
 * and waist trending down, chest/arms trending up slightly from training).
 * Workout logs are generated against the member's actual assigned plan
 * (member_workout_plans -> workout_plan_exercises), on the plan's real
 * scheduled days, at ~80% adherence (skipped sessions are simply not
 * logged, same as a real missed workout) with light progressive overload
 * on weight_used.
 *
 * Requires migration 005 (member_progress, workout_logs) to already be applied.
 * Safe to re-run — skips if member 1 already has progress/workout data.
 *
 * Usage: node database/seed_progress_workouts.js
 */
const path = require('path');
require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '../server/.env') });

const pool = require('../server/src/config/db');
const memberProgressDb = require('../server/src/db/memberProgressDb');
const workoutLogsDb = require('../server/src/db/workoutLogsDb');

const MEMBER_ID = 1;
const WEEKS = 26; // ~6 months

function toDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function round1(n) {
  return Math.round(n * 10) / 10;
}

async function seedProgress() {
  const already = await pool.query('SELECT COUNT(*)::int AS count FROM member_progress WHERE member_id = $1', [MEMBER_ID]);
  if (already.rows[0].count > 0) {
    console.log('Progress already seeded for member 1, skipping.');
    return;
  }

  const today = new Date();
  const startDate = addDays(today, -WEEKS * 7);

  // Gradual 6-month trend: fat loss + light recomposition.
  const startWeight = 82.5, endWeight = 76.8;
  const startBodyFat = 22.5, endBodyFat = 16.8;
  const startChest = 96, endChest = 99;
  const startWaist = 92, endWaist = 84;
  const startArms = 32, endArms = 34;
  const startThighs = 54, endThighs = 55.5;

  const notes = [
    'Feeling stronger this week.', 'A bit sore from leg day.', 'Good energy, hit all targets.',
    'Slept poorly, workout felt harder.', 'Diet on track this week.', null, null, null,
  ];

  let count = 0;
  for (let w = 0; w < WEEKS; w++) {
    const t = w / (WEEKS - 1); // 0..1 progress through the program
    const jitter = () => (Math.random() - 0.5);
    const date = addDays(startDate, w * 7 + randInt(-1, 1));

    await memberProgressDb.create({
      memberId: MEMBER_ID,
      date: toDateStr(date),
      weight: round1(startWeight + (endWeight - startWeight) * t + jitter() * 0.6),
      bodyFat: round1(startBodyFat + (endBodyFat - startBodyFat) * t + jitter() * 0.5),
      chest: round1(startChest + (endChest - startChest) * t + jitter() * 0.8),
      waist: round1(startWaist + (endWaist - startWaist) * t + jitter() * 0.8),
      arms: round1(startArms + (endArms - startArms) * t + jitter() * 0.4),
      thighs: round1(startThighs + (endThighs - startThighs) * t + jitter() * 0.4),
      notes: notes[randInt(0, notes.length - 1)],
    });
    count++;
  }
  console.log(`Seeded ${count} weekly progress entries for member 1.`);
}

async function seedWorkoutLogs() {
  const already = await pool.query('SELECT COUNT(*)::int AS count FROM workout_logs WHERE member_id = $1', [MEMBER_ID]);
  if (already.rows[0].count > 0) {
    console.log('Workout logs already seeded for member 1, skipping.');
    return;
  }

  const plans = await pool.query(
    `SELECT mwp.workout_plan_id AS plan_id
     FROM member_workout_plans mwp
     WHERE mwp.member_id = $1 AND mwp.is_active = TRUE`,
    [MEMBER_ID]
  );
  if (plans.rows.length === 0) {
    console.log('Member 1 has no active workout plan assigned, skipping workout log seed.');
    return;
  }

  const planIds = plans.rows.map((r) => r.plan_id);
  const exercises = await pool.query(
    `SELECT wpe.workout_plan_id AS plan_id, wpe.exercise_id, wpe.day_of_week, wpe.sets, wpe.reps
     FROM workout_plan_exercises wpe
     WHERE wpe.workout_plan_id = ANY($1)`,
    [planIds]
  );

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  const startDate = addDays(today, -WEEKS * 7);

  let count = 0;
  for (let d = 0; d <= WEEKS * 7; d++) {
    const date = addDays(startDate, d);
    if (date > today) break;
    const dayName = DAY_NAMES[date.getDay()];
    const scheduled = exercises.rows.filter((e) => e.day_of_week === dayName);
    if (scheduled.length === 0) continue;

    // ~80% adherence per scheduled session; whole session skipped together (like a missed gym day)
    if (Math.random() > 0.8) continue;

    const weeksIn = Math.floor(d / 7);
    for (const ex of scheduled) {
      const overload = Math.floor(weeksIn / 4) * 2.5; // small progressive overload every ~4 weeks
      await workoutLogsDb.create({
        memberId: MEMBER_ID,
        planId: ex.plan_id,
        exerciseId: ex.exercise_id,
        date: toDateStr(date),
        setsDone: Math.random() < 0.85 ? ex.sets : Math.max(1, ex.sets - 1),
        repsDone: Math.random() < 0.85 ? ex.reps : Math.max(1, ex.reps - randInt(1, 2)),
        weightUsed: 20 + overload + randInt(0, 5),
      });
      count++;
    }
  }
  console.log(`Seeded ${count} workout log entries for member 1.`);
}

async function main() {
  try {
    await seedProgress();
    await seedWorkoutLogs();
    console.log('\nDone.');
  } catch (err) {
    console.error('Failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
