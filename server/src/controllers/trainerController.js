const trainersDb = require('../db/trainersDb');
const membersDb = require('../db/membersDb');

async function createTrainer(req, res, next) {
  try {
    const { firstName, lastName, email } = req.body;
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }
    res.status(201).json(await trainersDb.create(req.body));
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
    res.json(await trainersDb.update(req.params.id, req.body));
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
    res.json(await trainersDb.setActive(req.params.id, isActive));
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

module.exports = { createTrainer, listTrainers, updateTrainer, setTrainerStatus, assignTrainer, getMemberTrainer };
