import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute><Layout><Members /></Layout></ProtectedRoute>} />
          <Route path="/members/:id" element={<ProtectedRoute><Layout><MemberDetails /></Layout></ProtectedRoute>} />
          <Route path="/membership-plans" element={<ProtectedRoute><Layout><MembershipPlans /></Layout></ProtectedRoute>} />
          <Route path="/memberships" element={<ProtectedRoute><Layout><Memberships /></Layout></ProtectedRoute>} />
          <Route path="/trainers" element={<ProtectedRoute><Layout><Trainers /></Layout></ProtectedRoute>} />
          <Route path="/exercises" element={<ProtectedRoute><Layout><Exercises /></Layout></ProtectedRoute>} />
          <Route path="/workout-plans" element={<ProtectedRoute><Layout><WorkoutPlans /></Layout></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><Layout><Attendance /></Layout></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><Layout><Payments /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
