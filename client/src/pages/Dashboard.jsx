import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getSummary } from '../api/dashboard';
import StatCard from '../components/StatCard';
import { formatDate } from '../utils/formatDate';

export default function Dashboard() {
  const { token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSummary(token)
      .then(setSummary)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-gray-500">Loading dashboard...</div>;
  if (error) return <div className="bg-red-100 text-red-700 px-4 py-3 rounded">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Members" value={summary.totalMembers} />
        <StatCard label="Active Members" value={summary.activeMembers} />
        <StatCard label="Expired Memberships" value={summary.expiredMemberships} />
        <StatCard label="Total Trainers" value={summary.totalTrainers} />
        <StatCard label="Today's Attendance" value={summary.todaysAttendance} />
        <StatCard label="Monthly Revenue" value={`₹${summary.monthlyRevenue}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Memberships Expiring Soon</h2>
          {summary.membershipsExpiringSoon.length === 0 ? (
            <p className="text-sm text-gray-500">None in the next 7 days.</p>
          ) : (
            <ul className="text-sm divide-y">
              {summary.membershipsExpiringSoon.map((m) => (
                <li key={m.id} className="py-2 flex justify-between">
                  <span>{m.first_name} {m.last_name}</span>
                  <span className="text-gray-500">{formatDate(m.end_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Recent Payments</h2>
          {summary.recentPayments.length === 0 ? (
            <p className="text-sm text-gray-500">No payments yet.</p>
          ) : (
            <ul className="text-sm divide-y">
              {summary.recentPayments.map((p) => (
                <li key={p.id} className="py-2 flex justify-between">
                  <span>{p.first_name} {p.last_name}</span>
                  <span className="text-gray-500">₹{p.amount} · {formatDate(p.payment_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mt-6">
        <h2 className="font-semibold mb-3">Revenue Snapshot</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={[{ month: 'This Month', revenue: Number(summary.monthlyRevenue) }]}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="revenue" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
