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
    `SELECT wpe.id, wpe.exercise_id, wpe.day_of_week, wpe.sets, wpe.reps, e.name AS exercise_name, e.muscle_group
     FROM workout_plan_exercises wpe
     JOIN exercises e ON e.id = wpe.exercise_id
     WHERE wpe.workout_plan_id = $1
     ORDER BY array_position(ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], wpe.day_of_week)`,
    [planId]
  );
  return result.rows;
}

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

module.exports = { create, findAll, findById, addExercise, findExercises, assignToMember, findForMember };
