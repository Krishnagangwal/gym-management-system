const pool = require('../config/db');
const approvalRequestsDb = require('../db/approvalRequestsDb');
const expensesDb = require('../db/expensesDb');
const leaveRequestsDb = require('../db/leaveRequestsDb');
const auditDb = require('../db/auditDb');

// Only request types with a real, already-existing action get a handler —
// refund/membership_deletion/discount are seeded as rules and demo
// requests for the Approvals page to show, but none of them correspond to
// a feature this app actually has, so approving one just records the
// decision. 'expense' defers the entity's creation until approval; 'leave'
// already exists the moment it's filed (so its own page shows it right
// away), so approval/rejection here just updates its status.
const ON_APPROVE = {
  expense: async (payload, db) => {
    const expense = await expensesDb.create(payload, db);
    return { entityType: 'expense', entityId: expense.id, newValues: expense };
  },
  leave: async (payload, db, req) => {
    await leaveRequestsDb.setStatus(payload.leaveRequestId, 'approved', req.user.id, db);
    return null;
  },
};

const ON_REJECT = {
  leave: async (payload, db, req) => {
    await leaveRequestsDb.setStatus(payload.leaveRequestId, 'rejected', req.user.id, db);
  },
};

async function listApprovals(req, res, next) {
  try {
    if (req.user.role === 'admin') {
      res.json(await approvalRequestsDb.findAll({ status: req.query.status }));
    } else {
      res.json(await approvalRequestsDb.findByRequester(req.user.id));
    }
  } catch (err) {
    next(err);
  }
}

async function getPendingCount(req, res, next) {
  try {
    res.json({ count: await approvalRequestsDb.pendingCount() });
  } catch (err) {
    next(err);
  }
}

async function approveRequest(req, res, next) {
  try {
    const request = await approvalRequestsDb.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Approval request not found' });
    if (request.status !== 'pending') {
      return res.status(409).json({ error: 'This request has already been reviewed' });
    }

    const client = await pool.connect();
    let sideEffect = null;
    let updated;
    try {
      await client.query('BEGIN');
      const handler = ON_APPROVE[request.request_type];
      if (handler) {
        sideEffect = await handler(request.request_payload, client, req);
      }
      updated = await approvalRequestsDb.setStatus(request.id, {
        status: 'approved', reviewedBy: req.user.id, reviewNote: req.body.reviewNote,
      }, client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    if (sideEffect) {
      await auditDb.logFromRequest(req, {
        action: 'create', entityType: sideEffect.entityType, entityId: sideEffect.entityId, newValues: sideEffect.newValues,
      });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function rejectRequest(req, res, next) {
  try {
    const request = await approvalRequestsDb.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Approval request not found' });
    if (request.status !== 'pending') {
      return res.status(409).json({ error: 'This request has already been reviewed' });
    }

    const { reviewNote } = req.body;
    if (!reviewNote) return res.status(400).json({ error: 'A review note is required when rejecting a request' });

    const client = await pool.connect();
    let updated;
    try {
      await client.query('BEGIN');
      const handler = ON_REJECT[request.request_type];
      if (handler) await handler(request.request_payload, client, req);
      updated = await approvalRequestsDb.setStatus(request.id, {
        status: 'rejected', reviewedBy: req.user.id, reviewNote,
      }, client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { listApprovals, getPendingCount, approveRequest, rejectRequest };
