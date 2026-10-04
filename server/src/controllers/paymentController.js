const paymentsDb = require('../db/paymentsDb');
const membersDb = require('../db/membersDb');
const invoicesDb = require('../db/invoicesDb');
const auditDb = require('../db/auditDb');
const pool = require('../config/db');

const VALID_METHODS = ['cash', 'card', 'upi', 'bank_transfer'];

async function createPayment(req, res, next) {
  try {
    const { memberId, membershipId, amount, paymentDate, paymentMethod } = req.body;
    if (!memberId || !membershipId || !amount || !paymentDate || !paymentMethod) {
      return res.status(400).json({ error: 'memberId, membershipId, amount, paymentDate, and paymentMethod are required' });
    }
    if (amount <= 0) return res.status(400).json({ error: 'amount must be positive' });
    if (!VALID_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ error: `paymentMethod must be one of: ${VALID_METHODS.join(', ')}` });
    }

    const member = await membersDb.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const membershipCheck = await pool.query('SELECT id FROM memberships WHERE id = $1 AND member_id = $2', [membershipId, memberId]);
    if (membershipCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Membership not found for this member' });
    }

    // Memberships created before this module existed (or seeded directly)
    // have no invoice — linking/marking paid is best-effort, not required.
    const invoice = await invoicesDb.findByMembershipId(membershipId);
    const payment = await paymentsDb.create({ ...req.body, invoiceId: invoice ? invoice.id : null });
    if (invoice && invoice.status !== 'paid') {
      await invoicesDb.markPaid(invoice.id);
    }
    await auditDb.logFromRequest(req, { action: 'create', entityType: 'payment', entityId: payment.id, newValues: payment });
    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
}

async function listPayments(req, res, next) {
  try {
    res.json(await paymentsDb.findAll({ memberId: req.query.memberId }));
  } catch (err) {
    next(err);
  }
}

async function getReceipt(req, res, next) {
  try {
    const payment = await paymentsDb.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json({
      receiptNumber: `RCPT-${String(payment.id).padStart(6, '0')}`,
      memberName: `${payment.first_name} ${payment.last_name}`,
      memberEmail: payment.email,
      plan: payment.plan_name,
      membershipPeriod: { start: payment.start_date, end: payment.end_date },
      amount: payment.amount,
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createPayment, listPayments, getReceipt };
