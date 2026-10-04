import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { trainerPortalApi } from '../../api/trainerPortal';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import { IconUsers } from '../../components/icons.jsx';
import { formatDate } from '../../utils/formatDate';

export default function TrainerMyMembers() {
  const { token } = useAuth();
  const [members, setMembers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    trainerPortalApi.myMembers(token).then(setMembers).catch((err) => setError(err.message));
  }, [token]);

  if (error) return <div className="alert-error">{error}</div>;
  if (!members) return <div className="text-gray-500">Loading...</div>;

  const flaggedCount = members.filter((m) => m.flaggedNoVisit).length;

  const columns = [
    { key: 'name', label: 'Member', render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800">{r.first_name} {r.last_name}</span>
          {r.flaggedNoVisit && <Badge tone="red">No visit 7+ days</Badge>}
        </div>
      ) },
    { key: 'plan_name', label: 'Plan', render: (r) => r.plan_name ? <Badge tone="indigo">{r.plan_name}</Badge> : <span className="text-gray-300">No active plan</span> },
    { key: 'days_to_expiry', label: 'Expires In', render: (r) => r.days_to_expiry != null ? `${r.days_to_expiry} days` : '—' },
    { key: 'last_visit', label: 'Last Visit', render: (r) => r.last_visit ? formatDate(r.last_visit) : 'Never' },
    { key: 'visits_last_30_days', label: '30-Day Visits' },
    { key: 'is_active', label: 'Status', render: (r) => <Badge tone={r.is_active ? 'green' : 'gray'} dot>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconUsers style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <h1 className="page-title">My Members</h1>
          <p className="text-sm text-gray-400">{members.length} assigned{flaggedCount > 0 && ` · ${flaggedCount} need a check-in`}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={members}
        emptyMessage="No members assigned to you yet."
        renderActions={(r) => <Link to={`/trainer/members/${r.id}`} className="btn-link">View</Link>}
      />
    </div>
  );
}
