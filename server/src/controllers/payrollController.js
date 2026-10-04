const pool = require('../config/db');
const payrollRunsDb = require('../db/payrollRunsDb');
const payslipsDb = require('../db/payslipsDb');
const employeesDb = require('../db/employeesDb');
const auditDb = require('../db/auditDb');
const { computePayslip, postPayrollExpenses } = require('../services/payrollCalculator');

async function generateRun(req, res, next) {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ error: 'month and year are required' });

    const run = await payrollRunsDb.findOrCreateDraft(Number(month), Number(year), req.user.id);
    if (run.status === 'finalized') {
      return res.status(409).json({ error: 'This payroll run is already finalized and cannot be recomputed' });
    }

    const employees = (await employeesDb.findAll()).filter((e) => e.is_active);
    const payslips = [];
    for (const employee of employees) {
      payslips.push(await computePayslip(employee, Number(year), Number(month)));
    }

    await payslipsDb.replaceForRun(run.id, payslips);
    res.status(201).json({ run, payslipCount: payslips.length });
  } catch (err) {
    next(err);
  }
}

async function listRuns(req, res, next) {
  try {
    res.json(await payrollRunsDb.findAll());
  } catch (err) {
    next(err);
  }
}

async function getRun(req, res, next) {
  try {
    const run = await payrollRunsDb.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    const payslips = await payslipsDb.findForRun(run.id);
    res.json({ ...run, payslips });
  } catch (err) {
    next(err);
  }
}

async function finalizeRun(req, res, next) {
  try {
    const run = await payrollRunsDb.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    if (run.status === 'finalized') return res.status(409).json({ error: 'This payroll run is already finalized' });

    const payslips = await payslipsDb.findForRun(run.id);
    if (payslips.length === 0) return res.status(400).json({ error: 'Generate payslips before finalizing' });

    const client = await pool.connect();
    let createdExpenses;
    try {
      await client.query('BEGIN');
      createdExpenses = await postPayrollExpenses(run, payslips, req.user.id, client);
      await payrollRunsDb.finalize(run.id, client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    for (const expense of createdExpenses) {
      await auditDb.logFromRequest(req, { action: 'create', entityType: 'expense', entityId: expense.id, newValues: expense });
    }

    res.json({ id: run.id, status: 'finalized', expensesPosted: createdExpenses.length });
  } catch (err) {
    next(err);
  }
}

async function getPayslip(req, res, next) {
  try {
    const payslip = await payslipsDb.findById(req.params.id);
    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
    res.json(payslip);
  } catch (err) {
    next(err);
  }
}

module.exports = { generateRun, listRuns, getRun, finalizeRun, getPayslip };
