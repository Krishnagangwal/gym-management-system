const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { getInvoice, listInvoices, getReceivablesAging } = require('../controllers/invoicesController');

const router = express.Router();
router.use(verifyToken, requireRole('admin'));

// Must come before '/:id' or 'receivables-aging' would be parsed as an id.
router.get('/receivables-aging', getReceivablesAging);
router.get('/', listInvoices);
router.get('/:id', getInvoice);

module.exports = router;
