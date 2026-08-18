const express = require('express');
const verifyToken = require('../middleware/auth');
const { createPayment, listPayments, getReceipt } = require('../controllers/paymentController');

const router = express.Router();

router.use(verifyToken);
router.post('/', createPayment);
router.get('/', listPayments);
router.get('/:id/receipt', getReceipt);

module.exports = router;
