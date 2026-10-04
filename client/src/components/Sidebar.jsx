import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { navLinksFor } from '../navConfig';
import { IconDumbbell } from './icons.jsx';

const GROUPS = ['Overview', 'People', 'Memberships', 'Training', 'Operations', 'Finance', 'Compliance', 'HR & Payroll', 'My Portal', 'My Account'];

export default function Sidebar() {
  const { user } = useAuth();
  const initials = (user?.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const visibleLinks = navLinksFor(user?.role);
  const visibleGroups = GROUPS.filter((group) => visibleLinks.some((l) => l.group === group));

  return (
    <aside className="w-64 bg-slate-950 text-gray-100 h-screen sticky top-0 flex-shrink-0 flex flex-col print:hidden">
      <div className="p-5 flex items-center gap-2.5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
          <IconDumbbell className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">GymAdmin</span>
      </div>

      <nav className="p-3 flex-1 overflow-y-auto">
        {visibleGroups.map((group) => (
          <div key={group} className="mb-4">
            <div className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {group}
            </div>
            {visibleLinks.filter((l) => l.group === group).map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-600/80 text-white shadow-md shadow-indigo-900/40'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <link.icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} style={{ width: 18, height: 18 }} />
                    <span>{link.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.name}</div>
            <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
