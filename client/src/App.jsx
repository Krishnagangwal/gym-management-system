import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import MemberDetails from './pages/MemberDetails';
import MembershipPlans from './pages/MembershipPlans';
import Memberships from './pages/Memberships';
import Trainers from './pages/Trainers';
import Exercises from './pages/Exercises';
import WorkoutPlans from './pages/WorkoutPlans';
import Attendance from './pages/Attendance';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';
import Invoices from './pages/Invoices';
import InvoiceView from './pages/InvoiceView';
import Receivables from './pages/Receivables';
import ProfitLoss from './pages/ProfitLoss';
import AuditLog from './pages/AuditLog';
import Approvals from './pages/Approvals';
import Employees from './pages/Employees';
import StaffAttendance from './pages/StaffAttendance';
import LeaveRequests from './pages/LeaveRequests';
import PayrollRuns from './pages/PayrollRuns';
import PayrollRunDetail from './pages/PayrollRunDetail';
import PayslipView from './pages/PayslipView';
import MemberDashboard from './pages/member/MemberDashboard';
import MyMembership from './pages/member/MyMembership';
import MyWorkoutPlan from './pages/member/MyWorkoutPlan';
import TodaysWorkout from './pages/member/TodaysWorkout';
import MyProgress from './pages/member/MyProgress';
import MyAttendance from './pages/member/MyAttendance';
import MyPayments from './pages/member/MyPayments';
import PaymentReceipt from './pages/member/PaymentReceipt';
import TrainerMyMembers from './pages/trainer/TrainerMyMembers';
import TrainerMemberDetail from './pages/trainer/TrainerMemberDetail';
import TrainerPerformance from './pages/trainer/TrainerPerformance';

const STAFF_ROLES = ['admin', 'staff'];
const ADMIN_ONLY = ['admin'];

function RoleRedirect() {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.role === 'member') return <Navigate to="/member/dashboard" replace />;
  if (user?.role === 'trainer') return <Navigate to="/trainer/members" replace />;
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/dashboard" element={<ProtectedRoute roles={STAFF_ROLES}><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute roles={STAFF_ROLES}><Layout><Members /></Layout></ProtectedRoute>} />
          <Route path="/members/:id" element={<ProtectedRoute roles={STAFF_ROLES}><Layout><MemberDetails /></Layout></ProtectedRoute>} />
          <Route path="/membership-plans" element={<ProtectedRoute roles={STAFF_ROLES}><Layout><MembershipPlans /></Layout></ProtectedRoute>} />
          <Route path="/memberships" element={<ProtectedRoute roles={STAFF_ROLES}><Layout><Memberships /></Layout></ProtectedRoute>} />
          <Route path="/trainers" element={<ProtectedRoute roles={STAFF_ROLES}><Layout><Trainers /></Layout></ProtectedRoute>} />
          <Route path="/exercises" element={<ProtectedRoute roles={STAFF_ROLES}><Layout><Exercises /></Layout></ProtectedRoute>} />
          <Route path="/workout-plans" element={<ProtectedRoute roles={STAFF_ROLES}><Layout><WorkoutPlans /></Layout></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute roles={STAFF_ROLES}><Layout><Attendance /></Layout></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute roles={STAFF_ROLES}><Layout><Payments /></Layout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={STAFF_ROLES}><Layout><Reports /></Layout></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute roles={ADMIN_ONLY}><Layout><Expenses /></Layout></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute roles={ADMIN_ONLY}><Layout><Invoices /></Layout></ProtectedRoute>} />
          <Route path="/invoices/:id" element={<ProtectedRoute roles={ADMIN_ONLY}><Layout><InvoiceView /></Layout></ProtectedRoute>} />
          <Route path="/receivables" element={<ProtectedRoute roles={ADMIN_ONLY}><Layout><Receivables /></Layout></ProtectedRoute>} />
          <Route path="/profit-loss" element={<ProtectedRoute roles={ADMIN_ONLY}><Layout><ProfitLoss /></Layout></ProtectedRoute>} />
          <Route path="/audit-log" element={<ProtectedRoute roles={ADMIN_ONLY}><Layout><AuditLog /></Layout></ProtectedRoute>} />
          <Route path="/approvals" element={<ProtectedRoute roles={ADMIN_ONLY}><Layout><Approvals /></Layout></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute roles={ADMIN_ONLY}><Layout><Employees /></Layout></ProtectedRoute>} />
          <Route path="/staff-attendance" element={<ProtectedRoute roles={ADMIN_ONLY}><Layout><StaffAttendance /></Layout></ProtectedRoute>} />
          <Route path="/leave-requests" element={<ProtectedRoute roles={ADMIN_ONLY}><Layout><LeaveRequests /></Layout></ProtectedRoute>} />
          <Route path="/payroll" element={<ProtectedRoute roles={ADMIN_ONLY}><Layout><PayrollRuns /></Layout></ProtectedRoute>} />
          <Route path="/payroll/payslips/:id" element={<ProtectedRoute roles={ADMIN_ONLY}><Layout><PayslipView /></Layout></ProtectedRoute>} />
          <Route path="/payroll/:id" element={<ProtectedRoute roles={ADMIN_ONLY}><Layout><PayrollRunDetail /></Layout></ProtectedRoute>} />
          <Route path="/member/dashboard" element={<ProtectedRoute roles={['member']}><Layout><MemberDashboard /></Layout></ProtectedRoute>} />
          <Route path="/member/membership" element={<ProtectedRoute roles={['member']}><Layout><MyMembership /></Layout></ProtectedRoute>} />
          <Route path="/member/workout-plan" element={<ProtectedRoute roles={['member']}><Layout><MyWorkoutPlan /></Layout></ProtectedRoute>} />
          <Route path="/member/today-workout" element={<ProtectedRoute roles={['member']}><Layout><TodaysWorkout /></Layout></ProtectedRoute>} />
          <Route path="/member/progress" element={<ProtectedRoute roles={['member']}><Layout><MyProgress /></Layout></ProtectedRoute>} />
          <Route path="/member/attendance" element={<ProtectedRoute roles={['member']}><Layout><MyAttendance /></Layout></ProtectedRoute>} />
          <Route path="/member/payments" element={<ProtectedRoute roles={['member']}><Layout><MyPayments /></Layout></ProtectedRoute>} />
          <Route path="/member/payments/:id/receipt" element={<ProtectedRoute roles={['member']}><Layout><PaymentReceipt /></Layout></ProtectedRoute>} />
          <Route path="/trainer/members" element={<ProtectedRoute roles={['trainer']}><Layout><TrainerMyMembers /></Layout></ProtectedRoute>} />
          <Route path="/trainer/members/:memberId" element={<ProtectedRoute roles={['trainer']}><Layout><TrainerMemberDetail /></Layout></ProtectedRoute>} />
          <Route path="/trainer/performance" element={<ProtectedRoute roles={['trainer']}><Layout><TrainerPerformance /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
