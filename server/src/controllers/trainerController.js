const bcrypt = require('bcrypt');
const trainersDb = require('../db/trainersDb');
const membersDb = require('../db/membersDb');
const usersDb = require('../db/usersDb');
const auditDb = require('../db/auditDb');

async function createTrainer(req, res, next) {
  try {
    const { firstName, lastName, email } = req.body;
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }
    const trainer = await trainersDb.create(req.body);
    await auditDb.logFromRequest(req, { action: 'create', entityType: 'trainer', entityId: trainer.id, newValues: trainer });
    res.status(201).json(trainer);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A trainer with this email already exists' });
    next(err);
  }
}

async function listTrainers(req, res, next) {
  try {
    res.json(await trainersDb.findAll());
  } catch (err) {
    next(err);
  }
}

async function updateTrainer(req, res, next) {
  try {
    const existing = await trainersDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Trainer not found' });

    const { firstName, lastName, email } = req.body;
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }
    const trainer = await trainersDb.update(req.params.id, req.body);
    await auditDb.logFromRequest(req, { action: 'update', entityType: 'trainer', entityId: trainer.id, oldValues: existing, newValues: trainer });
    res.json(trainer);
  } catch (err) {
    next(err);
  }
}

async function setTrainerStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive (boolean) is required' });
    const existing = await trainersDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Trainer not found' });
    const trainer = await trainersDb.setActive(req.params.id, isActive);
    await auditDb.logFromRequest(req, { action: 'update', entityType: 'trainer', entityId: trainer.id, oldValues: existing, newValues: trainer });
    res.json(trainer);
  } catch (err) {
    next(err);
  }
}

async function assignTrainer(req, res, next) {
  try {
    const { trainerId, memberId } = req.params;
    const trainer = await trainersDb.findById(trainerId);
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
    const member = await membersDb.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    await trainersDb.deactivateAssignments(memberId);
    const assignment = await trainersDb.assign(trainerId, memberId);
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
}

async function getMemberTrainer(req, res, next) {
  try {
    const trainer = await trainersDb.currentTrainerForMember(req.params.memberId);
    if (!trainer) return res.status(404).json({ error: 'No trainer assigned to this member' });
    res.json(trainer);
  } catch (err) {
    next(err);
  }
}

async function getTrainerLoginStatus(req, res, next) {
  try {
    const trainer = await trainersDb.findById(req.params.id);
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });

    const login = await usersDb.findByTrainerId(req.params.id);
    if (!login) return res.status(404).json({ error: 'No portal login for this trainer' });
    res.json({ email: login.email });
  } catch (err) {
    next(err);
  }
}

async function createTrainerLogin(req, res, next) {
  try {
    const trainer = await trainersDb.findById(req.params.id);
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });

    const existing = await usersDb.findByTrainerId(req.params.id);
    if (existing) return res.status(409).json({ error: 'This trainer already has a portal login' });

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await usersDb.createForTrainer({
      name: `${trainer.first_name} ${trainer.last_name}`,
      email,
      passwordHash,
      trainerId: trainer.id,
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
  createTrainer, listTrainers, updateTrainer, setTrainerStatus, assignTrainer, getMemberTrainer,
  getTrainerLoginStatus, createTrainerLogin,
};
