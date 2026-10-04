const pool = require('../config/db');

// The one check every trainer-portal endpoint that touches a specific
// member must pass before doing anything else — never trust a memberId
// path param alone.
async function isAssignedToTrainer(trainerId, memberId) {
  const result = await pool.query(
    `SELECT 1 FROM trainer_member_assignments WHERE trainer_id = $1 AND member_id = $2 AND is_active = TRUE LIMIT 1`,
    [trainerId, memberId]
  );
  return result.rowCount > 0;
}

async function findMyMembers(trainerId) {
  const result = await pool.query(
    `SELECT m.id, m.first_name, m.last_name, m.email, m.phone, m.is_active,
            MAX(a.check_in_time) AS last_visit,
            COUNT(a.id) FILTER (WHERE a.check_in_time >= CURRENT_DATE - INTERVAL '30 days')::int AS visits_last_30_days,
            cur.plan_name, cur.end_date,
            (cur.end_date - CURRENT_DATE) AS days_to_expiry
     FROM trainer_member_assignments tma
     JOIN members m ON m.id = tma.member_id
     LEFT JOIN attendance a ON a.member_id = m.id
     LEFT JOIN LATERAL (
       SELECT p.name AS plan_name, ms.end_date
       FROM memberships ms JOIN membership_plans p ON p.id = ms.plan_id
       WHERE ms.member_id = m.id AND ms.status = 'active' AND ms.end_date >= CURRENT_DATE
       ORDER BY ms.end_date DESC LIMIT 1
     ) cur ON TRUE
     WHERE tma.trainer_id = $1 AND tma.is_active = TRUE
     GROUP BY m.id, cur.plan_name, cur.end_date
     ORDER BY m.first_name, m.last_name`,
    [trainerId]
  );
  return result.rows;
}

async function getNotes(trainerId, memberId) {
  const result = await pool.query(
    `SELECT trainer_notes FROM trainer_member_assignments WHERE trainer_id = $1 AND member_id = $2 AND is_active = TRUE`,
    [trainerId, memberId]
  );
  return result.rows[0]?.trainer_notes || '';
}

async function setNotes(trainerId, memberId, notes) {
  const result = await pool.query(
    `UPDATE trainer_member_assignments SET trainer_notes = $1
     WHERE trainer_id = $2 AND member_id = $3 AND is_active = TRUE RETURNING trainer_notes`,
    [notes, trainerId, memberId]
  );
  return result.rows[0]?.trainer_notes || '';
}

module.exports = { isAssignedToTrainer, findMyMembers, getNotes, setNotes };
