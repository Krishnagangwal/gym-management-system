const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { createExpense, listExpenses, updateExpense, deleteExpense } = require('../controllers/expensesController');

const router = express.Router();
router.use(verifyToken, requireRole('admin'));

router.get('/', listExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
