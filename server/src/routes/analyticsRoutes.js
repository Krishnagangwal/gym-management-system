const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { getAnalytics } = require('../controllers/analyticsController');

const router = express.Router();

router.use(verifyToken, requireRole('admin', 'staff'));
router.get('/', getAnalytics);

module.exports = router;
