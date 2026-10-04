const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { listApprovals, getPendingCount, approveRequest, rejectRequest } = require('../controllers/approvalsController');

const router = express.Router();
router.use(verifyToken, requireRole('admin'));

router.get('/', listApprovals);
router.get('/pending-count', getPendingCount);
router.post('/:id/approve', approveRequest);
router.post('/:id/reject', rejectRequest);

module.exports = router;
