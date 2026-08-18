const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { createPlan, listPlans, updatePlan } = require('../controllers/membershipPlanController');

const router = express.Router();

router.use(verifyToken);

router.get('/', listPlans);
router.post('/', requireRole('admin'), createPlan);
router.put('/:id', requireRole('admin'), updatePlan);

module.exports = router;
