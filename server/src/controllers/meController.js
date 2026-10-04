const membersDb = require('../db/membersDb');
const membershipsDb = require('../db/membershipsDb');
const attendanceDb = require('../db/attendanceDb');
const paymentsDb = require('../db/paymentsDb');
const workoutPlansDb = require('../db/workoutPlansDb');
const trainersDb = require('../db/trainersDb');
const memberProgressDb = require('../db/memberProgressDb');
const workoutLogsDb = require('../db/workoutLogsDb');
const approvalRequestsDb = require('../db/approvalRequestsDb');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toLocalDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Visit count = unique calendar days with a check-in. Streak = consecutive
// days ending today or yesterday (a visit yesterday still "counts" today
// so the streak doesn't reset the moment the clock rolls over).
function computeAttendanceStats(rows) {
  const uniqueDates = [...new Set(rows.map((r) => toLocalDateStr(new Date(r.check_in_time))))]
    .sort()
    .reverse();

  let currentStreak = 0;
  if (uniqueDates.length) {
    const todayStr = toLocalDateStr(new Date());
    const daysSinceLastVisit = Math.round((new Date(todayStr) - new Date(uniqueDates[0])) / 86400000);
    if (daysSinceLastVisit <= 1) {
      let expected = new Date(uniqueDates[0]);
      for (const dateStr of uniqueDates) {
        if (dateStr === toLocalDateStr(expected)) {
          currentStreak++;
          expected.setDate(expected.getDate() - 1);
        } else {
          break;
        }
      }
    }
  }
  return { visitCount: uniqueDates.length, currentStreak };
}

async function getDashboard(req, res, next) {
  try {
    const memberId = req.user.memberId;
    const [member, membership, attendanceRows, workoutPlans, payments, trainer, pendingRenewal] = await Promise.all([
      membersDb.findById(memberId),
      membershipsDb.findCurrentForMember(memberId),
      attendanceDb.findAll({ memberId }),
      workoutPlansDb.findForMember(memberId),
      paymentsDb.findAll({ memberId }),
      trainersDb.currentTrainerForMember(memberId),
      approvalRequestsDb.findPendingForEntity('member_renewal', memberId),
    ]);

    res.json({
      member,
      membership: membership || null,
      attendanceStats: computeAttendanceStats(attendanceRows),
      workoutPlanCount: workoutPlans.length,
      recentPayment: payments[0] || null,
      trainer: trainer || null,
      renewalRequestPending: !!pendingRenewal,
    });
  } catch (err) {
    next(err);
  }
}

async function getMembership(req, res, next) {
  try {
    const memberId = req.user.memberId;
    const [current, history] = await Promise.all([
      membershipsDb.findCurrentForMember(memberId),
      membershipsDb.findByMemberWithStatus(memberId),
    ]);
    res.json({ current: current || null, history });
  } catch (err) {
    next(err);
  }
}

async function getWorkoutPlans(req, res, next) {
  try {
    const memberId = req.user.memberId;
    const plans = await workoutPlansDb.findForMember(memberId);
    const withExercises = await Promise.all(
      plans.map(async (plan) => ({ ...plan, exercises: await workoutPlansDb.findExercises(plan.id) }))
    );
    res.json(withExercises);
  } catch (err) {
    next(err);
  }
}

async function getAttendance(req, res, next) {
  try {
    const memberId = req.user.memberId;
    const rows = await attendanceDb.findAll({ memberId });
    res.json({ rows, stats: computeAttendanceStats(rows) });
  } catch (err) {
    next(err);
  }
}

async function getPayments(req, res, next) {
  try {
    const memberId = req.user.memberId;
    res.json(await paymentsDb.findAll({ memberId }));
  } catch (err) {
    next(err);
  }
}

async function getReceipt(req, res, next) {
  try {
    const memberId = req.user.memberId;
    const payment = await paymentsDb.findByIdForMember(req.params.id, memberId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    next(err);
  }
}

// Doesn't renew directly (membership assignment is a staff/admin action) —
// it queues an approval_requests row an admin reviews on the Approvals
// page, same pattern as the other request types.
async function requestRenewal(req, res, next) {
  try {
    const memberId = req.user.memberId;
    const existing = await approvalRequestsDb.findPendingForEntity('member_renewal', memberId);
    if (existing) return res.status(409).json({ error: 'A renewal request is already pending review' });

    const [member, current] = await Promise.all([
      membersDb.findById(memberId),
      membershipsDb.findCurrentForMember(memberId),
    ]);

    const request = await approvalRequestsDb.create({
      requestType: 'member_renewal',
      entityType: 'member_renewal',
      entityId: memberId,
      requestedBy: req.user.id,
      requestPayload: {
        memberId, memberName: `${member.first_name} ${member.last_name}`,
        currentPlanName: current?.plan_name || null, currentEndDate: current?.end_date || null,
      },
      reason: `${member.first_name} ${member.last_name} requested a membership renewal`,
    });
    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------

async function logProgress(req, res, next) {
  try {
    const memberId = req.user.memberId;
    const entry = await memberProgressDb.create({ memberId, ...req.body });
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
}

async function getProgress(req, res, next) {
  try {
    res.json(await memberProgressDb.findForMember(req.user.memberId));
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------
// Today's workout + logging
// ---------------------------------------------------------------------

async function getTodaysWorkout(req, res, next) {
  try {
    const memberId = req.user.memberId;
    const todayName = DAY_NAMES[new Date().getDay()];
    const todayStr = toLocalDateStr(new Date());

    const plans = await workoutPlansDb.findForMember(memberId);
    const exercisesToday = [];
    for (const plan of plans) {
      const exercises = await workoutPlansDb.findExercises(plan.id);
      exercises
        .filter((e) => e.day_of_week === todayName)
        .forEach((e) => exercisesToday.push({ ...e, plan_id: plan.id, plan_name: plan.name }));
    }

    const todaysLogs = await workoutLogsDb.findForMember(memberId, { from: todayStr, to: todayStr });
    const loggedExerciseIds = new Set(todaysLogs.map((l) => l.exercise_id));

    res.json({
      day: todayName,
      exercises: exercisesToday.map((e) => ({ ...e, completed: loggedExerciseIds.has(e.exercise_id) })),
    });
  } catch (err) {
    next(err);
  }
}

async function logWorkout(req, res, next) {
  try {
    const memberId = req.user.memberId;
    const { planId, exerciseId, setsDone, repsDone, weightUsed, date } = req.body;
    if (!planId || !exerciseId || setsDone === undefined || repsDone === undefined) {
      return res.status(400).json({ error: 'planId, exerciseId, setsDone, and repsDone are required' });
    }
    const log = await workoutLogsDb.create({ memberId, planId, exerciseId, date, setsDone, repsDone, weightUsed });
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
}

async function getWorkoutLogs(req, res, next) {
  try {
    const memberId = req.user.memberId;
    const logs = await workoutLogsDb.findForMember(memberId, req.query);

    // Weekly completion rate: distinct (plan, day-of-week) exercise slots
    // scheduled in the last 7 days vs. how many got a log entry that day.
    const plans = await workoutPlansDb.findForMember(memberId);
    let scheduledCount = 0;
    const scheduleByDay = {};
    for (const plan of plans) {
      const exercises = await workoutPlansDb.findExercises(plan.id);
      exercises.forEach((e) => {
        scheduleByDay[e.day_of_week] = (scheduleByDay[e.day_of_week] || []).concat(e.exercise_id);
      });
    }
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    let completedCount = 0;
    for (let d = new Date(sevenDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const dayName = DAY_NAMES[d.getDay()];
      const scheduledExerciseIds = scheduleByDay[dayName] || [];
      scheduledCount += scheduledExerciseIds.length;
      const dateStr = toLocalDateStr(d);
      const loggedIds = new Set(logs.filter((l) => toLocalDateStr(new Date(l.date)) === dateStr).map((l) => l.exercise_id));
      completedCount += scheduledExerciseIds.filter((id) => loggedIds.has(id)).length;
    }
    const weeklyCompletionRate = scheduledCount === 0 ? 0 : Math.round((completedCount / scheduledCount) * 100);

    res.json({ logs, weeklyCompletionRate });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard, getMembership, getWorkoutPlans, getAttendance, getPayments, getReceipt, requestRenewal,
  logProgress, getProgress, getTodaysWorkout, logWorkout, getWorkoutLogs,
};
