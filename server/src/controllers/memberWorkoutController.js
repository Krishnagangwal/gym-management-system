const workoutPlansDb = require('../db/workoutPlansDb');
const membersDb = require('../db/membersDb');

async function assign(req, res, next) {
  try {
    const { memberId, planId } = req.params;
    const member = await membersDb.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const plan = await workoutPlansDb.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Workout plan not found' });

    res.status(201).json(await workoutPlansDb.assignToMember(memberId, planId));
  } catch (err) {
    next(err);
  }
}

async function listForMember(req, res, next) {
  try {
    res.json(await workoutPlansDb.findForMember(req.params.memberId));
  } catch (err) {
    next(err);
  }
}

module.exports = { assign, listForMember };
