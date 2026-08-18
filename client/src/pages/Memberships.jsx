import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { membershipsApi } from '../api/memberships';
import DataTable from '../components/DataTable';
import { formatDate } from '../utils/formatDate';

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
    { key: 'member', label: 'Member', render: (r) => <Link to={`/members/${r.member_id}`} className="text-blue-600 hover:underline">{r.first_name} {r.last_name}</Link> },
    { key: 'plan_name', label: 'Plan' },
    { key: 'start_date', label: 'Start Date', render: (r) => formatDate(r.start_date) },
    { key: 'end_date', label: 'End Date', render: (r) => formatDate(r.end_date) },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Memberships</h1>
      <div className="mb-4 flex gap-2">
        {['active', 'expired', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded text-sm border ${status === s ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-100'}`}
          >
            {s ? s[0].toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>
      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {loading ? <div className="text-gray-500">Loading...</div> : <DataTable columns={columns} rows={memberships} />}
    </div>
  );
}
