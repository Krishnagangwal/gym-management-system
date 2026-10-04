const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const {
  getDashboard, getMembership, getWorkoutPlans, getAttendance, getPayments, getReceipt, requestRenewal,
  logProgress, getProgress, getTodaysWorkout, logWorkout, getWorkoutLogs,
} = require('../controllers/meController');

const router = express.Router();

// Every handler here derives memberId from req.user (set by verifyToken
// from the JWT) — never from the request body/query/params — so a member
// can only ever read/write their own data.
router.use(verifyToken, requireRole('member'));

router.get('/dashboard', getDashboard);
router.get('/membership', getMembership);
router.post('/membership/request-renewal', requestRenewal);
router.get('/workout-plans', getWorkoutPlans);
router.get('/attendance', getAttendance);
router.get('/payments', getPayments);
router.get('/payments/:id/receipt', getReceipt);
router.post('/progress', logProgress);
router.get('/progress', getProgress);
router.get('/today-workout', getTodaysWorkout);
router.post('/workout-logs', logWorkout);
router.get('/workout-logs', getWorkoutLogs);

module.exports = router;
