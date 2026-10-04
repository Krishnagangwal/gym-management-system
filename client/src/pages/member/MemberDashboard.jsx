import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { meApi } from '../../api/me';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { formatDate } from '../../utils/formatDate';
import {
  IconIdCard, IconCalendarCheck, IconFlame, IconDumbbell, IconRupee, IconSparkles, IconWhistle,
} from '../../components/icons.jsx';

export default function MemberDashboard() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [renewError, setRenewError] = useState('');

  function load() {
    meApi.dashboard(token).then(setData).catch((err) => setError(err.message)).finally(() => setLoading(false));
    meApi.attendance(token).then((r) => setAttendance(r.rows)).catch(() => {});
  }

  useEffect(load, [token]);

  async function handleRequestRenewal() {
    setRenewing(true);
    setRenewError('');
    try {
      await meApi.requestRenewal(token);
      load();
    } catch (err) {
      setRenewError(err.message);
    } finally {
      setRenewing(false);
    }
  }

  if (loading) return <div className="text-gray-500">Loading dashboard...</div>;
  if (error) return <div className="alert-error">{error}</div>;

  const { membership, attendanceStats, workoutPlanCount, recentPayment, trainer, renewalRequestPending } = data;
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const now = new Date();

  const daysRemaining = membership?.days_remaining;
  const daysTone = daysRemaining == null ? 'rose' : daysRemaining <= 3 ? 'rose' : daysRemaining <= 7 ? 'amber' : 'emerald';

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 text-white p-6 md:p-8 mb-6 shadow-lg">
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex items-center gap-2 text-indigo-200/80 text-xs font-medium uppercase tracking-wider mb-2">
          <IconSparkles style={{ width: 14, height: 14 }} />
          {today}
        </div>
        <h1 className="relative text-2xl md:text-3xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="relative text-indigo-200/70 text-sm mt-1.5 max-w-lg">
          Here's where things stand with your membership and training.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Membership" value={membership ? 'Active' : 'None'} icon={IconIdCard} tone={membership ? 'emerald' : 'rose'} />
        <StatCard label="Total Visits" value={attendanceStats.visitCount} icon={IconCalendarCheck} tone="sky" />
        <StatCard label="Current Streak" value={`${attendanceStats.currentStreak} day${attendanceStats.currentStreak === 1 ? '' : 's'}`} icon={IconFlame} tone="amber" />
        <StatCard label="Workout Plans" value={workoutPlanCount} icon={IconDumbbell} tone="violet" />
        <div className="col-span-2 md:col-span-1 md:col-start-4">
          <StatCard
            label="Days Remaining"
            value={daysRemaining != null ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}` : 'No plan'}
            icon={IconIdCard}
            tone={daysTone}
            highlight
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <IconIdCard className="w-4 h-4 text-indigo-600" style={{ width: 16, height: 16 }} />
            </div>
            <h2 className="font-semibold text-gray-900">Your Membership</h2>
          </div>
          {membership ? (
            <div className="text-sm text-gray-600 space-y-1.5">
              <p><span className="text-gray-400">Plan:</span> <span className="font-medium text-gray-800">{membership.plan_name}</span></p>
              <p><span className="text-gray-400">Valid:</span> {formatDate(membership.start_date)} – {formatDate(membership.end_date)}</p>
              <p><span className="text-gray-400">Status:</span> <Badge tone="green" dot>Active</Badge></p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">No active membership. Contact the front desk to renew.</p>
          )}
          {renewError && <div className="alert-error mt-3">{renewError}</div>}
          <div className="flex items-center gap-3 mt-4">
            <Link to="/member/membership" className="btn-link">View full history →</Link>
            <button
              onClick={handleRequestRenewal}
              disabled={renewing || renewalRequestPending}
              className="btn-secondary ml-auto"
            >
              {renewalRequestPending ? 'Renewal Pending' : renewing ? 'Requesting...' : 'Request Renewal'}
            </button>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <IconWhistle className="w-4 h-4 text-amber-600" style={{ width: 16, height: 16 }} />
            </div>
            <h2 className="font-semibold text-gray-900">Your Trainer</h2>
          </div>
          {trainer ? (
            <div className="text-sm text-gray-600 space-y-1.5">
              <p className="font-medium text-gray-800 text-base">{trainer.first_name} {trainer.last_name}</p>
              {trainer.specialization && <Badge tone="violet">{trainer.specialization}</Badge>}
              {trainer.availability && <p className="text-xs text-gray-400 mt-2">Available: {trainer.availability}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">No trainer assigned yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
              <IconCalendarCheck className="w-4 h-4 text-sky-600" style={{ width: 16, height: 16 }} />
            </div>
            <h2 className="font-semibold text-gray-900">This Month's Attendance</h2>
          </div>
          {attendance ? (
            <AttendanceCalendar visitDates={attendance.map((a) => a.check_in_time)} year={now.getFullYear()} month={now.getMonth() + 1} />
          ) : (
            <p className="text-sm text-gray-400 py-6 text-center">Loading...</p>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <IconRupee className="w-4 h-4 text-emerald-600" style={{ width: 16, height: 16 }} />
            </div>
            <h2 className="font-semibold text-gray-900">Recent Payment</h2>
          </div>
          {recentPayment ? (
            <div className="text-sm text-gray-600 space-y-1.5">
              <p><span className="text-gray-400">Amount:</span> <span className="font-semibold text-gray-900">₹{recentPayment.amount}</span></p>
              <p><span className="text-gray-400">Date:</span> {formatDate(recentPayment.payment_date)}</p>
              <p><span className="text-gray-400">Method:</span> <Badge tone="gray">{recentPayment.payment_method.replace('_', ' ')}</Badge></p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">No payments yet.</p>
          )}
          <Link to="/member/payments" className="btn-link inline-block mt-4">View payment history →</Link>
        </div>
      </div>
    </div>
  );
}
