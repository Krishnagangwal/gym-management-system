const auditDb = require('../db/auditDb');

async function listAuditLog(req, res, next) {
  try {
    const { userId, entityType, action, from, to } = req.query;
    res.json(await auditDb.findAll({ userId, entityType, action, from, to }));
  } catch (err) {
    next(err);
  }
}

async function listForEntity(req, res, next) {
  try {
    res.json(await auditDb.findForEntity(req.params.entityType, req.params.entityId));
  } catch (err) {
    next(err);
  }
}

module.exports = { listAuditLog, listForEntity };
