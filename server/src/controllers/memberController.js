const bcrypt = require('bcrypt');
const membersDb = require('../db/membersDb');
const usersDb = require('../db/usersDb');
const auditDb = require('../db/auditDb');

async function createMember(req, res, next) {
  try {
    const { firstName, lastName, email, phone } = req.body;
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ error: 'firstName, lastName, email, and phone are required' });
    }
    const member = await membersDb.create(req.body);
    await auditDb.logFromRequest(req, { action: 'create', entityType: 'member', entityId: member.id, newValues: member });
    res.status(201).json(member);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A member with this email already exists' });
    next(err);
  }
}

async function listMembers(req, res, next) {
  try {
    const { search, isActive } = req.query;
    const members = await membersDb.findAll({
      search,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
    res.json(members);
  } catch (err) {
    next(err);
  }
}

async function getMember(req, res, next) {
  try {
    const member = await membersDb.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) {
    next(err);
  }
}

async function updateMember(req, res, next) {
  try {
    const existing = await membersDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Member not found' });

    const { firstName, lastName, email, phone } = req.body;
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ error: 'firstName, lastName, email, and phone are required' });
    }
    const member = await membersDb.update(req.params.id, req.body);
    await auditDb.logFromRequest(req, { action: 'update', entityType: 'member', entityId: member.id, oldValues: existing, newValues: member });
    res.json(member);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A member with this email already exists' });
    next(err);
  }
}

async function setMemberStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive (boolean) is required' });
    }
    const existing = await membersDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Member not found' });

    const member = await membersDb.setActive(req.params.id, isActive);
    await auditDb.logFromRequest(req, { action: 'update', entityType: 'member', entityId: member.id, oldValues: existing, newValues: member });
    res.json(member);
  } catch (err) {
    next(err);
  }
}

async function getMemberLoginStatus(req, res, next) {
  try {
    const member = await membersDb.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const login = await usersDb.findByMemberId(req.params.id);
    if (!login) return res.status(404).json({ error: 'No portal login for this member' });
    res.json({ email: login.email });
  } catch (err) {
    next(err);
  }
}

async function createMemberLogin(req, res, next) {
  try {
    const member = await membersDb.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const existing = await usersDb.findByMemberId(req.params.id);
    if (existing) return res.status(409).json({ error: 'This member already has a portal login' });

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await usersDb.createForMember({
      name: `${member.first_name} ${member.last_name}`,
      email,
      passwordHash,
      memberId: member.id,
    });
    res.status(201).json({ email: user.email });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That email is already in use by another login' });
    }
    next(err);
  }
}

module.exports = {
  createMember, listMembers, getMember, updateMember, setMemberStatus,
  getMemberLoginStatus, createMemberLogin,
};
