import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { trainerPortalApi } from '../../api/trainerPortal';
import StatCard from '../../components/StatCard';
import { IconChart, IconUsers, IconTarget, IconUserCheck } from '../../components/icons.jsx';

function Comparison({ label, mine, gymAvg, icon, tone }) {
  const diff = Math.round((mine - gymAvg) * 10) / 10;
  const isAbove = diff >= 0;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tone} shadow-sm flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 tracking-tight mb-1">{mine}%</div>
      <p className={`text-xs font-medium ${isAbove ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isAbove ? '▲' : '▼'} {Math.abs(diff)}% vs gym average ({gymAvg}%)
      </p>
    </div>
  );
}

export default function TrainerPerformance() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    trainerPortalApi.performance(token).then(setData).catch((err) => setError(err.message));
  }, [token]);

  if (error) return <div className="alert-error">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconChart style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <h1 className="page-title">My Performance</h1>
          <p className="text-sm text-gray-400">How your roster compares to the gym average</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard label="My Members" value={data.memberCount} icon={IconUsers} tone="indigo" />
        <Comparison
          label="Attendance Rate (30d)"
          mine={data.myAttendanceRate}
          gymAvg={data.gymAvgAttendanceRate}
          icon={<IconTarget className="w-4.5 h-4.5 text-white" style={{ width: 17, height: 17 }} />}
          tone="from-sky-500 to-sky-600 shadow-sky-500/30"
        />
        <Comparison
          label="Retention Rate"
          mine={data.myRetentionRate}
          gymAvg={data.gymAvgRetentionRate}
          icon={<IconUserCheck className="w-4.5 h-4.5 text-white" style={{ width: 17, height: 17 }} />}
          tone="from-emerald-500 to-emerald-600 shadow-emerald-500/30"
        />
      </div>
    </div>
  );
}
