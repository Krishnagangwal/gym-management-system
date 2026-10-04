const expensesDb = require('../db/expensesDb');
const expenseCategoriesDb = require('../db/expenseCategoriesDb');
const approvalRulesDb = require('../db/approvalRulesDb');
const approvalRequestsDb = require('../db/approvalRequestsDb');
const auditDb = require('../db/auditDb');

const VALID_METHODS = ['cash', 'card', 'upi', 'bank_transfer'];

function validateBody(body) {
  const { categoryId, amount, expenseDate, paymentMethod } = body;
  if (!categoryId || !amount || !expenseDate || !paymentMethod) {
    return 'categoryId, amount, expenseDate, and paymentMethod are required';
  }
  if (amount <= 0) return 'amount must be positive';
  if (!VALID_METHODS.includes(paymentMethod)) return `paymentMethod must be one of: ${VALID_METHODS.join(', ')}`;
  return null;
}

async function createExpense(req, res, next) {
  try {
    const validationError = validateBody(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const category = await expenseCategoriesDb.findById(req.body.categoryId);
    if (!category) return res.status(404).json({ error: 'Expense category not found' });

    // Admins can always act directly; a staff-submitted expense above the
    // configured threshold is queued for admin approval instead of being
    // created immediately (see approval_rules, seeded with request_type
    // 'expense', threshold_amount 25000).
    const rule = await approvalRulesDb.findActiveByType('expense');
    const overThreshold = rule?.threshold_amount != null && Number(req.body.amount) > Number(rule.threshold_amount);

    if (overThreshold && req.user.role !== 'admin') {
      const request = await approvalRequestsDb.create({
        requestType: 'expense',
        entityType: 'expense',
        requestedBy: req.user.id,
        requestPayload: { ...req.body, recordedBy: req.user.id },
        reason: req.body.reason || `Expense of ₹${req.body.amount} exceeds the ₹${rule.threshold_amount} approval threshold`,
      });
      return res.status(202).json({ pendingApproval: true, request });
    }

    const expense = await expensesDb.create({ ...req.body, recordedBy: req.user.id });
    await auditDb.logFromRequest(req, { action: 'create', entityType: 'expense', entityId: expense.id, newValues: expense });
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
}

async function listExpenses(req, res, next) {
  try {
    const { categoryId, from, to } = req.query;
    res.json(await expensesDb.findAll({ categoryId, from, to }));
  } catch (err) {
    next(err);
  }
}

async function updateExpense(req, res, next) {
  try {
    const existing = await expensesDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    const validationError = validateBody(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const expense = await expensesDb.update(req.params.id, req.body);
    await auditDb.logFromRequest(req, { action: 'update', entityType: 'expense', entityId: expense.id, oldValues: existing, newValues: expense });
    res.json(expense);
  } catch (err) {
    next(err);
  }
}

async function deleteExpense(req, res, next) {
  try {
    const existing = await expensesDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Expense not found' });
    await expensesDb.remove(req.params.id);
    await auditDb.logFromRequest(req, { action: 'delete', entityType: 'expense', entityId: existing.id, oldValues: existing });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { createExpense, listExpenses, updateExpense, deleteExpense };
