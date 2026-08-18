const membersDb = require('../db/membersDb');

async function createMember(req, res, next) {
  try {
    const { firstName, lastName, email, phone } = req.body;
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ error: 'firstName, lastName, email, and phone are required' });
    }
    const member = await membersDb.create(req.body);
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
    res.json(member);
  } catch (err) {
    next(err);
  }
}

module.exports = { createMember, listMembers, getMember, updateMember, setMemberStatus };
