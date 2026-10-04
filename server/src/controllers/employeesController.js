const employeesDb = require('../db/employeesDb');
const trainersDb = require('../db/trainersDb');

async function createEmployee(req, res, next) {
  try {
    const { trainerId, baseSalary } = req.body;
    if (baseSalary === undefined || baseSalary < 0) {
      return res.status(400).json({ error: 'baseSalary is required and must be non-negative' });
    }
    if (trainerId) {
      const trainer = await trainersDb.findById(trainerId);
      if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
      const existing = await employeesDb.findByTrainerId(trainerId);
      if (existing) return res.status(409).json({ error: 'This trainer already has an employee record' });
    }
    const employee = await employeesDb.create(req.body);
    res.status(201).json(employee);
  } catch (err) {
    next(err);
  }
}

async function listEmployees(req, res, next) {
  try {
    res.json(await employeesDb.findAll());
  } catch (err) {
    next(err);
  }
}

async function getEmployee(req, res, next) {
  try {
    const employee = await employeesDb.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    next(err);
  }
}

async function updateEmployee(req, res, next) {
  try {
    const existing = await employeesDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });

    const { baseSalary } = req.body;
    if (baseSalary === undefined || baseSalary < 0) {
      return res.status(400).json({ error: 'baseSalary is required and must be non-negative' });
    }
    res.json(await employeesDb.update(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function setEmployeeStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive (boolean) is required' });
    const existing = await employeesDb.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });
    res.json(await employeesDb.setActive(req.params.id, isActive));
  } catch (err) {
    next(err);
  }
}

module.exports = { createEmployee, listEmployees, getEmployee, updateEmployee, setEmployeeStatus };
