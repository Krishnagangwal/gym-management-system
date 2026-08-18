const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { assign, listForMember } = require('../controllers/memberWorkoutController');

const router = express.Router();

router.use(verifyToken);
router.post('/members/:memberId/workout-plans/:planId', requireRole('admin'), assign);
router.get('/members/:memberId/workout-plans', listForMember);

module.exports = router;
