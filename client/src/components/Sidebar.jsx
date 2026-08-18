import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/members', label: 'Members' },
  { to: '/membership-plans', label: 'Membership Plans' },
  { to: '/memberships', label: 'Memberships' },
  { to: '/trainers', label: 'Trainers' },
  { to: '/workout-plans', label: 'Workout Plans' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/attendance', label: 'Attendance' },
  { to: '/payments', label: 'Payments' },
  { to: '/reports', label: 'Reports' },
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="w-56 bg-gray-900 text-gray-100 min-h-screen flex-shrink-0">
      <div className="p-4 text-lg font-bold border-b border-gray-700">GymAdmin</div>
      <nav className="p-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded mb-1 text-sm ${isActive ? 'bg-blue-600' : 'hover:bg-gray-800'}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 text-xs text-gray-400 border-t border-gray-700 mt-2">
        Signed in as {user?.name} ({user?.role})
      </div>
    </aside>
  );
}
