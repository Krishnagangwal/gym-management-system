const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const {
  createTrainer, listTrainers, updateTrainer, setTrainerStatus, assignTrainer, getMemberTrainer,
  getTrainerLoginStatus, createTrainerLogin,
} = require('../controllers/trainerController');

const router = express.Router();

router.use(verifyToken);

router.get('/trainers', listTrainers);
router.post('/trainers', requireRole('admin'), createTrainer);
router.put('/trainers/:id', requireRole('admin'), updateTrainer);
router.patch('/trainers/:id/status', requireRole('admin'), setTrainerStatus);
router.post('/trainers/:trainerId/assign/:memberId', requireRole('admin'), assignTrainer);
router.get('/members/:memberId/trainer', getMemberTrainer);
router.get('/trainers/:id/login', requireRole('admin'), getTrainerLoginStatus);
router.post('/trainers/:id/login', requireRole('admin'), createTrainerLogin);

module.exports = router;
