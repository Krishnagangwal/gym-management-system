const staffAttendanceDb = require('../db/staffAttendanceDb');
const employeesDb = require('../db/employeesDb');

const VALID_STATUSES = ['present', 'absent', 'half_day', 'leave'];

async function markAttendance(req, res, next) {
  try {
    const { employeeId, date, status, checkIn, checkOut } = req.body;
    if (!employeeId || !date || !status) {
      return res.status(400).json({ error: 'employeeId, date, and status are required' });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    const employee = await employeesDb.findById(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const record = await staffAttendanceDb.mark({ employeeId, date, checkIn, checkOut, status });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

async function getMonthlyGrid(req, res, next) {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    res.json(await staffAttendanceDb.findForMonth(year, month));
  } catch (err) {
    next(err);
  }
}

async function getForEmployee(req, res, next) {
  try {
    res.json(await staffAttendanceDb.findForEmployee(req.params.employeeId, req.query));
  } catch (err) {
    next(err);
  }
}

module.exports = { markAttendance, getMonthlyGrid, getForEmployee };
