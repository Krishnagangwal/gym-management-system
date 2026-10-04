const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { generateRun, listRuns, getRun, finalizeRun, getPayslip } = require('../controllers/payrollController');

const router = express.Router();
router.use(verifyToken, requireRole('admin'));

router.post('/runs', generateRun);
router.get('/runs', listRuns);
router.get('/runs/:id', getRun);
router.post('/runs/:id/finalize', finalizeRun);
router.get('/payslips/:id', getPayslip);

module.exports = router;
