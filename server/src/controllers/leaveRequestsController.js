const leaveRequestsDb = require('../db/leaveRequestsDb');
const employeesDb = require('../db/employeesDb');
const approvalRequestsDb = require('../db/approvalRequestsDb');

// Every leave request requires admin approval unconditionally (no
// threshold — unlike expenses), routed through the existing approval
// workflow: this creates the leave_requests row immediately (so it's
// visible right away) plus a pending approval_requests row that the
// Approvals page's 'leave' handler resolves.
async function applyLeave(req, res, next) {
  try {
    const { employeeId, leaveType, fromDate, toDate, days, reason } = req.body;
    if (!employeeId || !leaveType || !fromDate || !toDate || !days) {
      return res.status(400).json({ error: 'employeeId, leaveType, fromDate, toDate, and days are required' });
    }
    const employee = await employeesDb.findById(employeeId);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const leave = await leaveRequestsDb.create({ employeeId, leaveType, fromDate, toDate, days, reason });

    const employeeName = employee.trainer_first_name
      ? `${employee.trainer_first_name} ${employee.trainer_last_name}`
      : employee.employee_code;

    const approval = await approvalRequestsDb.create({
      requestType: 'leave',
      entityType: 'leave_request',
      entityId: leave.id,
      requestedBy: req.user.id,
      requestPayload: { leaveRequestId: leave.id, employeeId, employeeName, leaveType, fromDate, toDate, days },
      reason: reason || `${days}-day ${leaveType} leave for ${employeeName}`,
    });

    res.status(201).json({ leave, approval });
  } catch (err) {
    next(err);
  }
}

async function listLeaveRequests(req, res, next) {
  try {
    if (req.query.employeeId) {
      res.json(await leaveRequestsDb.findByEmployee(req.query.employeeId));
    } else {
      res.json(await leaveRequestsDb.findAll());
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { applyLeave, listLeaveRequests };
