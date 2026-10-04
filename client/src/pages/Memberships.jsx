import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { membershipsApi } from '../api/memberships';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import { IconIdCard } from '../components/icons.jsx';
import { formatDate } from '../utils/formatDate';

const STATUS_TONE = { active: 'green', expired: 'red' };

export default function Memberships() {
  const { token } = useAuth();
  const [status, setStatus] = useState('active');
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    membershipsApi.listAll(token, status)
      .then(setMemberships)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, status]);

  const columns = [
    { key: 'member', label: 'Member', render: (r) => <Link to={`/members/${r.member_id}`} className="font-medium text-indigo-600 hover:underline">{r.first_name} {r.last_name}</Link> },
    { key: 'plan_name', label: 'Plan', render: (r) => <Badge tone="indigo">{r.plan_name}</Badge> },
    { key: 'start_date', label: 'Start Date', render: (r) => formatDate(r.start_date) },
    { key: 'end_date', label: 'End Date', render: (r) => formatDate(r.end_date) },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status] || 'gray'} dot>{r.status}</Badge> },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconIdCard style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <h1 className="page-title">Memberships</h1>
          <p className="text-sm text-gray-400">{memberships.length} records</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {['active', 'expired', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`tab-btn ${status === s ? 'tab-btn-active' : 'tab-btn-inactive'}`}
          >
            {s ? s[0].toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>
      {error && <div className="alert-error mb-4">{error}</div>}
      {loading ? <div className="text-gray-500">Loading...</div> : <DataTable columns={columns} rows={memberships} />}
    </div>
  );
}
