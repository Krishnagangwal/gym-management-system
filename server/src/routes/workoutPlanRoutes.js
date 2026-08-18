const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { createPlan, listPlans, getPlan, addExerciseToPlan } = require('../controllers/workoutPlanController');

const router = express.Router();

router.use(verifyToken);
router.get('/', listPlans);
router.get('/:id', getPlan);
router.post('/', requireRole('admin'), createPlan);
router.post('/:id/exercises', requireRole('admin'), addExerciseToPlan);

module.exports = router;
