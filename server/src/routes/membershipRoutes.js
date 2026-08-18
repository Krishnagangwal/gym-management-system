const express = require('express');
const verifyToken = require('../middleware/auth');
const { assignOrRenew, memberHistory, listMemberships } = require('../controllers/membershipController');

const router = express.Router();

router.use(verifyToken);

router.post('/members/:memberId/memberships', assignOrRenew);
router.get('/members/:memberId/memberships', memberHistory);
router.get('/memberships', listMemberships);

module.exports = router;
