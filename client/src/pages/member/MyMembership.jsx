import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { meApi } from '../../api/me';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import { IconIdCard } from '../../components/icons.jsx';
import { formatDate } from '../../utils/formatDate';

export default function MyMembership() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    meApi.membership(token).then(setData).catch((err) => setError(err.message));
  }, [token]);

  if (error) return <div className="alert-error">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading...</div>;

  const { current, history } = data;

  const columns = [
    { key: 'plan_name', label: 'Plan', render: (r) => <Badge tone="indigo">{r.plan_name}</Badge> },
    { key: 'start_date', label: 'Start', render: (r) => formatDate(r.start_date) },
    { key: 'end_date', label: 'End', render: (r) => formatDate(r.end_date) },
    { key: 'status', label: 'Status', render: (r) => (
        <Badge tone={r.is_expired ? 'red' : 'green'} dot>{r.is_expired ? 'Expired' : 'Active'}</Badge>
      ) },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconIdCard style={{ width: 22, height: 22 }} />
        </div>
        <h1 className="page-title">My Membership</h1>
      </div>

      {current ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 text-white p-6 mb-6 shadow-lg">
          <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-indigo-200/70 text-xs uppercase tracking-wider font-medium mb-1.5">Current Plan</div>
              <h2 className="text-2xl font-bold tracking-tight">{current.plan_name}</h2>
              <p className="text-indigo-200/80 text-sm mt-1.5">
                {formatDate(current.start_date)} – {formatDate(current.end_date)}
              </p>
            </div>
            <div className="text-right">
              <div className="text-indigo-200/70 text-xs uppercase tracking-wider font-medium mb-1.5">Days Remaining</div>
              <div className="text-3xl font-bold tracking-tight">{current.days_remaining}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="alert-error mb-6">You don't have an active membership right now. Contact the front desk to renew.</div>
      )}

      <h2 className="font-semibold text-gray-900 mb-3">Full History</h2>
      <DataTable columns={columns} rows={history} emptyMessage="No membership history yet." />
    </div>
  );
}
