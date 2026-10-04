const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { listMyMembers, getMyMember, updateNotes, assignWorkoutPlan, getMyPerformance } = require('../controllers/trainerPortalController');

const router = express.Router();
router.use(verifyToken, requireRole('trainer'));

router.get('/members', listMyMembers);
router.get('/members/:memberId', getMyMember);
router.put('/members/:memberId/notes', updateNotes);
router.post('/members/:memberId/workout-plan', assignWorkoutPlan);
router.get('/performance', getMyPerformance);

module.exports = router;
