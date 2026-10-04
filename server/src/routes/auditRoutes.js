const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { listAuditLog, listForEntity } = require('../controllers/auditController');

const router = express.Router();
router.use(verifyToken);

// The full, filterable log is admin-only; a single entity's history (used
// by the member detail page's Activity tab) is available to staff too,
// matching that page's own access level.
router.get('/', requireRole('admin'), listAuditLog);
router.get('/entity/:entityType/:entityId', requireRole('admin', 'staff'), listForEntity);

module.exports = router;
