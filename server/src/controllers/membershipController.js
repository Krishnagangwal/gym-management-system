const pool = require('../config/db');
const membershipsDb = require('../db/membershipsDb');
const membersDb = require('../db/membersDb');
const plansDb = require('../db/membershipPlansDb');
const invoicesDb = require('../db/invoicesDb');
const auditDb = require('../db/auditDb');

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

    // Membership + its GST invoice are created atomically: an invoice
    // without a membership (or vice versa) would leave the books wrong.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const membership = await membershipsDb.create({
        memberId, planId, startDate, durationDays: plan.duration_days,
      }, client);
      const invoice = await invoicesDb.generateForMembership({
        memberId, membershipId: membership.id, subtotal: plan.price, issueDate: startDate,
      }, client);
      await client.query('COMMIT');

      await auditDb.logFromRequest(req, { action: 'create', entityType: 'membership', entityId: membership.id, newValues: membership });
      await auditDb.logFromRequest(req, { action: 'create', entityType: 'invoice', entityId: invoice.id, newValues: invoice });

      res.status(201).json({ ...membership, invoice });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
