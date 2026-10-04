import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { meApi } from '../../api/me';
import DataTable from '../../components/DataTable';
import StatCard from '../../components/StatCard';
import { IconCalendarCheck, IconFlame } from '../../components/icons.jsx';
import { formatDate, formatTime } from '../../utils/formatDate';

function formatDuration(checkIn, checkOut) {
  if (!checkOut) return '—';
  const minutes = Math.round((new Date(checkOut) - new Date(checkIn)) / 60000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function MyAttendance() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    meApi.attendance(token).then(setData).catch((err) => setError(err.message));
  }, [token]);

  if (error) return <div className="alert-error">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading...</div>;

  const { rows, stats } = data;

  const columns = [
    { key: 'date', label: 'Date', render: (r) => formatDate(r.check_in_time) },
    { key: 'check_in_time', label: 'Check In', render: (r) => formatTime(r.check_in_time) },
    { key: 'check_out_time', label: 'Check Out', render: (r) => r.check_out_time ? formatTime(r.check_out_time) : '—' },
    { key: 'duration', label: 'Duration', render: (r) => formatDuration(r.check_in_time, r.check_out_time) },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconCalendarCheck style={{ width: 22, height: 22 }} />
        </div>
        <h1 className="page-title">My Attendance</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <StatCard label="Total Visits" value={stats.visitCount} icon={IconCalendarCheck} tone="sky" />
        <StatCard label="Current Streak" value={`${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}`} icon={IconFlame} tone="amber" />
      </div>

      <DataTable columns={columns} rows={rows} emptyMessage="No attendance recorded yet." />
    </div>
  );
}
