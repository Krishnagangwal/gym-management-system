const express = require('express');
const verifyToken = require('../middleware/auth');
const {
  createMember, listMembers, getMember, updateMember, setMemberStatus,
} = require('../controllers/memberController');

const router = express.Router();

router.use(verifyToken);

router.post('/', createMember);
router.get('/', listMembers);
router.get('/:id', getMember);
router.put('/:id', updateMember);
router.patch('/:id/status', setMemberStatus);

module.exports = router;
