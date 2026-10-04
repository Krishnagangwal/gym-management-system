const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { markAttendance, getMonthlyGrid, getForEmployee } = require('../controllers/staffAttendanceController');

const router = express.Router();
router.use(verifyToken, requireRole('admin'));

router.post('/', markAttendance);
router.get('/grid', getMonthlyGrid);
router.get('/employee/:employeeId', getForEmployee);

module.exports = router;
