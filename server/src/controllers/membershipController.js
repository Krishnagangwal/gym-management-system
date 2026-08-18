const membershipsDb = require('../db/membershipsDb');
const membersDb = require('../db/membersDb');
const plansDb = require('../db/membershipPlansDb');

async function assignOrRenew(req, res, next) {
  try {
    const memberId = req.params.memberId;
    const { planId, startDate } = req.body;
    if (!planId || !startDate) {
      return res.status(400).json({ error: 'planId and startDate are required' });
    }

    const member = await membersDb.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const plan = await plansDb.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Membership plan not found' });

    const alreadyActive = await membershipsDb.hasActiveMembership(memberId);
    if (alreadyActive) {
      return res.status(409).json({ error: 'Member already has an active membership. Wait for it to expire before assigning a new one.' });
    }

    const membership = await membershipsDb.create({
      memberId, planId, startDate, durationDays: plan.duration_days,
    });
    res.status(201).json(membership);
  } catch (err) {
    next(err);
  }
}

async function memberHistory(req, res, next) {
  try {
    res.json(await membershipsDb.findByMember(req.params.memberId));
  } catch (err) {
    next(err);
  }
}

async function listMemberships(req, res, next) {
  try {
    res.json(await membershipsDb.findAll({ status: req.query.status }));
  } catch (err) {
    next(err);
  }
}

module.exports = { assignOrRenew, memberHistory, listMemberships };
