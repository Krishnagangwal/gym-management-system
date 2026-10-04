const pool = require('../config/db');
const trainerPortalDb = require('../db/trainerPortalDb');
const membersDb = require('../db/membersDb');
const membershipsDb = require('../db/membershipsDb');
const attendanceDb = require('../db/attendanceDb');
const workoutPlansDb = require('../db/workoutPlansDb');
const memberProgressDb = require('../db/memberProgressDb');
const workoutLogsDb = require('../db/workoutLogsDb');

// Every handler below derives trainerId from req.user.trainerId (set by
// verifyToken from the JWT) — never from a request param — and every
// per-member handler re-checks trainer_member_assignments before touching
// that member's data, so a trainer can only ever see their own roster.

async function listMyMembers(req, res, next) {
  try {
    const members = await trainerPortalDb.findMyMembers(req.user.trainerId);
    const withFlag = members.map((m) => ({
      ...m,
      flaggedNoVisit: !m.last_visit || (new Date() - new Date(m.last_visit)) / 86400000 > 7,
    }));
    res.json(withFlag);
  } catch (err) {
    next(err);
  }
}

async function getMyMember(req, res, next) {
  try {
    const trainerId = req.user.trainerId;
    const memberId = req.params.memberId;
    const assigned = await trainerPortalDb.isAssignedToTrainer(trainerId, memberId);
    if (!assigned) return res.status(404).json({ error: 'Member not found or not assigned to you' });

    const [member, membershipHistory, attendance, progress, workoutLogs, workoutPlans, trainerNotes] = await Promise.all([
      membersDb.findById(memberId),
      membershipsDb.findByMemberWithStatus(memberId),
      attendanceDb.findAll({ memberId }),
      memberProgressDb.findForMember(memberId),
      workoutLogsDb.findForMember(memberId),
      workoutPlansDb.findForMember(memberId),
      trainerPortalDb.getNotes(trainerId, memberId),
    ]);

    res.json({ member, membershipHistory, attendance, progress, workoutLogs, workoutPlans, trainerNotes });
  } catch (err) {
    next(err);
  }
}

async function updateNotes(req, res, next) {
  try {
    const trainerId = req.user.trainerId;
    const memberId = req.params.memberId;
    const assigned = await trainerPortalDb.isAssignedToTrainer(trainerId, memberId);
    if (!assigned) return res.status(404).json({ error: 'Member not found or not assigned to you' });

    const trainerNotes = await trainerPortalDb.setNotes(trainerId, memberId, req.body.notes || '');
    res.json({ trainerNotes });
  } catch (err) {
    next(err);
  }
}

async function assignWorkoutPlan(req, res, next) {
  try {
    const trainerId = req.user.trainerId;
    const memberId = req.params.memberId;
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: 'planId is required' });

    const assigned = await trainerPortalDb.isAssignedToTrainer(trainerId, memberId);
    if (!assigned) return res.status(404).json({ error: 'Member not found or not assigned to you' });

    const plan = await workoutPlansDb.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Workout plan not found' });

    res.status(201).json(await workoutPlansDb.assignToMember(memberId, planId));
  } catch (err) {
    next(err);
  }
}

// "visited" uses the same 30-day check-in window for both this trainer's
// members and the gym-wide average, so the comparison is apples-to-apples.
async function getMyPerformance(req, res, next) {
  try {
    const trainerId = req.user.trainerId;
    const myMembers = await trainerPortalDb.findMyMembers(trainerId);
    const memberCount = myMembers.length;
    const visited = myMembers.filter((m) => m.visits_last_30_days > 0).length;
    const retained = myMembers.filter((m) => m.is_active).length;
    const myAttendanceRate = memberCount === 0 ? 0 : Math.round((visited / memberCount) * 1000) / 10;
    const myRetentionRate = memberCount === 0 ? 0 : Math.round((retained / memberCount) * 1000) / 10;

    const gymAvg = await pool.query(`
      SELECT AVG(sub.attendance_rate) AS avg_attendance_rate, AVG(sub.retention_rate) AS avg_retention_rate
      FROM (
        SELECT tma.trainer_id,
               COUNT(DISTINCT tma.member_id) AS member_count,
               CASE WHEN COUNT(DISTINCT tma.member_id) = 0 THEN 0
                    ELSE COUNT(DISTINCT CASE WHEN a.check_in_time >= CURRENT_DATE - INTERVAL '30 days' THEN tma.member_id END)::numeric / COUNT(DISTINCT tma.member_id) * 100 END AS attendance_rate,
               CASE WHEN COUNT(DISTINCT tma.member_id) = 0 THEN 0
                    ELSE COUNT(DISTINCT tma.member_id) FILTER (WHERE m.is_active)::numeric / COUNT(DISTINCT tma.member_id) * 100 END AS retention_rate
        FROM trainer_member_assignments tma
        JOIN members m ON m.id = tma.member_id
        LEFT JOIN attendance a ON a.member_id = m.id
        WHERE tma.is_active = TRUE
        GROUP BY tma.trainer_id
      ) sub
    `);

    res.json({
      memberCount,
      myAttendanceRate,
      myRetentionRate,
      gymAvgAttendanceRate: Math.round(Number(gymAvg.rows[0].avg_attendance_rate || 0) * 10) / 10,
      gymAvgRetentionRate: Math.round(Number(gymAvg.rows[0].avg_retention_rate || 0) * 10) / 10,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyMembers, getMyMember, updateNotes, assignWorkoutPlan, getMyPerformance };
