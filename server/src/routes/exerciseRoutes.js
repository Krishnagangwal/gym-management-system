const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { createExercise, listExercises } = require('../controllers/exerciseController');

const router = express.Router();

router.use(verifyToken);
router.get('/', listExercises);
router.post('/', requireRole('admin'), createExercise);

module.exports = router;
