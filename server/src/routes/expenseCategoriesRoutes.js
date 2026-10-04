const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { createCategory, listCategories, updateCategory } = require('../controllers/expenseCategoriesController');

const router = express.Router();
router.use(verifyToken, requireRole('admin'));

router.get('/', listCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);

module.exports = router;
