const pool = require('../config/db');

async function create({ memberId, planId, exerciseId, date, setsDone, repsDone, weightUsed }) {
  const result = await pool.query(
    `INSERT INTO workout_logs (member_id, plan_id, exercise_id, date, sets_done, reps_done, weight_used)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [memberId, planId, exerciseId, date || new Date().toISOString().slice(0, 10), setsDone, repsDone, weightUsed || null]
  );
  return result.rows[0];
}

async function findForMember(memberId, { from, to } = {}) {
  const conditions = ['wl.member_id = $1'];
  const params = [memberId];
  if (from) {
    params.push(from);
    conditions.push(`wl.date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`wl.date <= $${params.length}`);
  }
  const result = await pool.query(
    `SELECT wl.*, e.name AS exercise_name
     FROM workout_logs wl JOIN exercises e ON e.id = wl.exercise_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY wl.date DESC`,
    params
  );
  return result.rows;
}

module.exports = { create, findForMember };
