const plansDb = require('../db/membershipPlansDb');
const auditDb = require('../db/auditDb');

async function createPlan(req, res, next) {
  try {
    const { name, durationDays, price } = req.body;
    if (!name || !durationDays || price === undefined) {
      return res.status(400).json({ error: 'name, durationDays, and price are required' });
    }
    if (durationDays <= 0 || price < 0) {
      return res.status(400).json({ error: 'durationDays must be positive and price cannot be negative' });
    }
    const plan = await plansDb.create(req.body);
    await auditDb.logFromRequest(req, { action: 'create', entityType: 'plan', entityId: plan.id, newValues: plan });
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
}

async function listPlans(req, res, next) {
  try {
    res.json(await plansDb.findAll());
  } catch (err) {
    next(err);
  }
}

async function updatePlan(req, res, next) {
  try {
    const existing = await plansDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Plan not found' });

    const { name, durationDays, price, isActive } = req.body;
    if (!name || !durationDays || price === undefined || typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'name, durationDays, price, and isActive are required' });
    }
    const plan = await plansDb.update(req.params.id, req.body);
    await auditDb.logFromRequest(req, { action: 'update', entityType: 'plan', entityId: plan.id, oldValues: existing, newValues: plan });
    res.json(plan);
  } catch (err) {
    next(err);
  }
}

module.exports = { createPlan, listPlans, updatePlan };
