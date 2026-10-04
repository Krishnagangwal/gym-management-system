const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const {
  createMember, listMembers, getMember, updateMember, setMemberStatus,
  getMemberLoginStatus, createMemberLogin,
} = require('../controllers/memberController');

const router = express.Router();

router.use(verifyToken);

router.post('/', createMember);
router.get('/', listMembers);
router.get('/:id', getMember);
router.put('/:id', updateMember);
router.patch('/:id/status', setMemberStatus);
router.get('/:id/login', requireRole('admin'), getMemberLoginStatus);
router.post('/:id/login', requireRole('admin'), createMemberLogin);

module.exports = router;
