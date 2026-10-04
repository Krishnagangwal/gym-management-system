const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { applyLeave, listLeaveRequests } = require('../controllers/leaveRequestsController');

const router = express.Router();
router.use(verifyToken, requireRole('admin'));

router.post('/', applyLeave);
router.get('/', listLeaveRequests);

module.exports = router;
