import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { navLinkFor } from '../navConfig';
import { approvalsApi } from '../api/approvals';
import { IconLogout, IconShieldCheck } from './icons.jsx';

export default function Header() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const current = navLinkFor(location.pathname);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    approvalsApi.pendingCount(token).then((r) => setPendingCount(r.count)).catch(() => {});
  }, [token, user?.role, location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="h-16 bg-white/80 backdrop-blur border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10 print:hidden">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {current && (
          <>
            <current.icon className="w-4 h-4 text-gray-400" style={{ width: 16, height: 16 }} />
            <span className="text-gray-400">{current.group}</span>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-700">{current.label}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {user?.role === 'admin' && pendingCount > 0 && (
          <button
            onClick={() => navigate('/approvals')}
            className="inline-flex items-center gap-2 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-lg transition"
          >
            <IconShieldCheck style={{ width: 16, height: 16 }} />
            {pendingCount} pending approval{pendingCount === 1 ? '' : 's'}
          </button>
        )}
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 px-3 py-2 rounded-lg hover:bg-rose-50 transition"
        >
          <IconLogout style={{ width: 16, height: 16 }} />
          Log Out
        </button>
      </div>
    </header>
  );
}
