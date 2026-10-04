const express = require('express');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/authorize');
const { createEmployee, listEmployees, getEmployee, updateEmployee, setEmployeeStatus } = require('../controllers/employeesController');

const router = express.Router();
router.use(verifyToken, requireRole('admin'));

router.get('/', listEmployees);
router.post('/', createEmployee);
router.get('/:id', getEmployee);
router.put('/:id', updateEmployee);
router.patch('/:id/status', setEmployeeStatus);

module.exports = router;
