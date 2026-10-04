const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const membershipPlanRoutes = require('./routes/membershipPlanRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const workoutPlanRoutes = require('./routes/workoutPlanRoutes');
const memberWorkoutRoutes = require('./routes/memberWorkoutRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const meRoutes = require('./routes/meRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const expenseCategoriesRoutes = require('./routes/expenseCategoriesRoutes');
const expensesRoutes = require('./routes/expensesRoutes');
const invoicesRoutes = require('./routes/invoicesRoutes');
const auditRoutes = require('./routes/auditRoutes');
const approvalsRoutes = require('./routes/approvalsRoutes');
const employeesRoutes = require('./routes/employeesRoutes');
const staffAttendanceRoutes = require('./routes/staffAttendanceRoutes');
const leaveRequestsRoutes = require('./routes/leaveRequestsRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const trainerPortalRoutes = require('./routes/trainerPortalRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/membership-plans', membershipPlanRoutes);
app.use('/api', membershipRoutes);
app.use('/api', trainerRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/workout-plans', workoutPlanRoutes);
app.use('/api', memberWorkoutRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/me', meRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/expense-categories', expenseCategoriesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/audit-log', auditRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/staff-attendance', staffAttendanceRoutes);
app.use('/api/leave-requests', leaveRequestsRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/trainer', trainerPortalRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
