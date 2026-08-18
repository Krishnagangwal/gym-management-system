const express = require('express');
const verifyToken = require('../middleware/auth');
const { checkInMember, checkOutMember, listAttendance } = require('../controllers/attendanceController');

const router = express.Router();

router.use(verifyToken);
router.post('/check-in', checkInMember);
router.patch('/:id/check-out', checkOutMember);
router.get('/', listAttendance);

module.exports = router;
