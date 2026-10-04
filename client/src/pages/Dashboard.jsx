import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getSummary } from '../api/dashboard';
import { analyticsApi } from '../api/analytics';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import DateRangeFilter from '../components/DateRangeFilter';
import Heatmap from '../components/Heatmap';
import { formatDate, isoDaysAgo, todayISO } from '../utils/formatDate';
import { CHART_GRID_STROKE, CHART_TICK_STYLE, CHART_TOOLTIP_STYLE, CHART_COLORS } from '../utils/chartTheme';
import {
  IconUsers, IconUserCheck, IconWhistle, IconCalendarCheck, IconRupee, IconTarget,
  IconCard, IconSparkles, IconTrendUp, IconTrendDown, IconClock, IconBriefcase,
} from '../components/icons.jsx';

function initialsOf(first, last) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
}

const inr = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
// Marks the current, still-in-progress month so a partial month's low
// total doesn't read as a revenue crash on a trend chart.
const monthLabel = (ym) => {
  const label = new Date(`${ym}-01`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  return ym === currentMonthKey() ? `${label} (MTD)` : label;
};

function retentionTone(pct) {
  if (pct == null) return 'gray';
  if (pct >= 80) return 'green';
  if (pct >= 50) return 'amber';
  return 'red';
}

function RevenueSection({ revenue, finance }) {
  const trend = revenue.monthlyRevenueTrend.map((r) => ({ month: monthLabel(r.month), revenue: Number(r.revenue) }));
  const byPlan = revenue.revenueByPlan.map((r) => ({ name: r.plan_name, value: Number(r.revenue) }));
  const methodMix = revenue.paymentMethodMix.map((r) => ({ name: r.payment_method.replace('_', ' '), value: Number(r.total) }));
  const revenueVsExpenses = finance?.monthlyProfitAndLoss.map((r) => ({ month: monthLabel(r.month), revenue: r.revenue, expenses: r.expenses }));

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total Revenue" value={inr(revenue.arpm.total_revenue)} icon={IconRupee} tone="emerald" />
        <StatCard label="ARPM" value={inr(revenue.arpm.arpm)} icon={IconUsers} tone="indigo" />
        <StatCard label="Paying Members" value={revenue.arpm.paying_members} icon={IconUsers} tone="sky" />
        <div className="col-span-2 md:col-span-1">
          <StatCard label="Next 30 Days (Projected)" value={inr(revenue.projectedRevenue.projectedRevenue)} icon={IconTrendUp} tone="violet" highlight />
        </div>
      </div>

      {finance && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
          <StatCard label="Profit" value={inr(finance.profitAndLoss.grossProfit)} icon={IconTrendUp} tone="emerald" />
          <StatCard label="Total Expenses" value={inr(finance.profitAndLoss.expenses)} icon={IconTrendDown} tone="rose" />
          <StatCard label="Outstanding Dues" value={inr(finance.outstandingDues.total)} icon={IconRupee} tone="amber" />
          <StatCard label="Total Payroll Cost" value={inr(finance.totalPayrollCost)} icon={IconRupee} tone="indigo" />
          <StatCard label="Headcount" value={finance.headcount} icon={IconBriefcase} tone="sky" />
        </div>
      )}

      <div className="card p-5 mb-5">
        <h3 className="font-semibold text-gray-900 mb-1">Monthly Revenue Trend</h3>
        <p className="text-xs text-gray-400 mb-4">Total payments collected per month</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend}>
            <defs>
              <linearGradient id="revenueLineFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#4338ca" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} />
            <YAxis tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [inr(value), 'Revenue']} />
            <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3, fill: '#4f46e5' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {revenueVsExpenses && (
        <div className="card p-5 mb-5">
          <h3 className="font-semibold text-gray-900 mb-1">Revenue vs Expenses</h3>
          <p className="text-xs text-gray-400 mb-4">Per month, for the selected range</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueVsExpenses}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} />
              <YAxis tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value, name) => [inr(value), name === 'revenue' ? 'Revenue' : 'Expenses']} cursor={{ fill: '#eef0fb' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === 'revenue' ? 'Revenue' : 'Expenses')} />
              <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={22} />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue by Plan</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={byPlan} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {byPlan.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => inr(value)} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Payment Method Mix</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={methodMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {methodMix.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => inr(value)} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function RetentionSection({ retention }) {
  const churnTrend = retention.monthlyChurnRate.map((r) => ({ month: monthLabel(r.month), rate: Number(r.churn_rate) }));
  const renewalByPlan = retention.renewalRateByPlan.map((r) => ({ plan: r.plan_name, rate: Number(r.renewal_rate) }));

  const cohortColumns = [
    { key: 'cohortMonth', label: 'Cohort', render: (r) => <span className="font-medium text-gray-800">{monthLabel(r.cohortMonth)}</span> },
    { key: 'cohortSize', label: 'Size' },
    { key: 'm1', label: 'Month 1', render: (r) => <Badge tone={retentionTone(r.m1)}>{r.m1 == null ? '—' : `${r.m1}%`}</Badge> },
    { key: 'm2', label: 'Month 2', render: (r) => <Badge tone={retentionTone(r.m2)}>{r.m2 == null ? '—' : `${r.m2}%`}</Badge> },
    { key: 'm3', label: 'Month 3', render: (r) => <Badge tone={retentionTone(r.m3)}>{r.m3 == null ? '—' : `${r.m3}%`}</Badge> },
  ];
  const cohortRows = retention.cohortRetention.map((r) => ({ ...r, id: r.cohortMonth }));

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Retention</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <StatCard label="Churned Members" value={retention.lifetimeAndLtv.churned_member_count} icon={IconUsers} tone="rose" />
        <StatCard label="Avg. Lifetime" value={`${retention.lifetimeAndLtv.avg_lifetime_months ?? '—'} mo`} icon={IconClock} tone="amber" />
        <StatCard label="Avg. LTV" value={inr(retention.lifetimeAndLtv.avg_ltv ?? 0)} icon={IconRupee} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Monthly Churn Rate</h3>
          <p className="text-xs text-gray-400 mb-4">% of members active at month start who churned that month</p>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={churnTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} />
              <YAxis tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} unit="%" />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [`${value}%`, 'Churn Rate']} />
              <Line type="monotone" dataKey="rate" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3, fill: '#f43f5e' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Renewal Rate by Plan</h3>
          <p className="text-xs text-gray-400 mb-4">Higher is better — shows which plan to push</p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={renewalByPlan}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="plan" tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} />
              <YAxis tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} unit="%" />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [`${value}%`, 'Renewal Rate']} cursor={{ fill: '#eef0fb' }} />
              <Bar dataKey="rate" fill="#6366f1" radius={[8, 8, 8, 8]} barSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Cohort Retention</h3>
        <p className="text-xs text-gray-400 mb-4">% of each join-month cohort still active 1/2/3 months later</p>
        <DataTable columns={cohortColumns} rows={cohortRows} emptyMessage="Not enough data for cohort analysis in this range." />
      </div>
    </section>
  );
}

function OperationsSection({ operations }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Operations</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <StatCard label="Attendance Rate" value={`${operations.attendanceRate.rate}%`} icon={IconTarget} tone="sky" />
        <StatCard label="Avg. Visits / Member / Week" value={Number(operations.avgVisitsPerWeek).toFixed(1)} icon={IconCalendarCheck} tone="indigo" />
        <StatCard label="Avg. Session Duration" value={`${operations.avgSessionDuration.avg_minutes ?? '—'} min`} icon={IconClock} tone="amber" />
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-1">Peak Hours</h3>
        <p className="text-xs text-gray-400 mb-4">Check-ins by day of week and hour of day</p>
        <Heatmap data={operations.peakHours} />
      </div>
    </section>
  );
}

function TrainersSection({ trainers }) {
  const columns = [
    { key: 'name', label: 'Trainer', render: (r) => <span className="font-medium text-gray-800">{r.first_name} {r.last_name}</span> },
    { key: 'specialization', label: 'Specialization', render: (r) => r.specialization ? <Badge tone="violet">{r.specialization}</Badge> : '—' },
    { key: 'member_count', label: 'Members' },
    { key: 'attendance_rate', label: 'Attendance Rate', render: (r) => `${r.attendance_rate}%` },
    { key: 'retention_rate', label: 'Retention Rate', render: (r) => `${r.retention_rate}%` },
  ];

  return (
    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Trainers</h2>
      <DataTable columns={columns} rows={trainers} emptyMessage="No active trainers." />
    </section>
  );
}

function AnalyticsSections() {
  const { token } = useAuth();
  const [from, setFrom] = useState(isoDaysAgo(365));
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsApi.get(token, { from, to })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, from, to]);

  return (
    <div className="mt-8 pt-2 border-t border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Analytics</h2>

      <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />

      {error && <div className="alert-error mb-4">{error}</div>}
      {(loading || !data) && !error ? (
        <div className="text-gray-500">Loading analytics...</div>
      ) : data && (
        <>
          <RevenueSection revenue={data.revenue} finance={data.finance} />
          <RetentionSection retention={data.retention} />
          <OperationsSection operations={data.operations} />
          <TrainersSection trainers={data.trainers} />
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { token, user } = useAuth();
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
  if (error) return <div className="alert-error">{error}</div>;

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

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
          Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
        </h1>
        <p className="relative text-indigo-200/70 text-sm mt-1.5 max-w-lg">
          Here's what's happening at your gym today.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Members" value={summary.totalMembers} icon={IconUsers} tone="indigo" />
        <StatCard label="Active Members" value={summary.activeMembers} icon={IconUserCheck} tone="emerald" />
        <StatCard label="Expired Memberships" value={summary.expiredMemberships} icon={IconCard} tone="rose" />
        <StatCard label="Total Trainers" value={summary.totalTrainers} icon={IconWhistle} tone="amber" />
        <StatCard label="Today's Attendance" value={summary.todaysAttendance} icon={IconTarget} tone="sky" />
        <div className="col-span-2 md:col-span-1 md:col-start-4">
          <StatCard label={`Revenue (${summary.monthlyRevenueLabel})`} value={`₹${summary.monthlyRevenue}`} icon={IconRupee} tone="violet" highlight />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <IconCalendarCheck className="w-4 h-4 text-amber-600" style={{ width: 16, height: 16 }} />
            </div>
            <h2 className="font-semibold text-gray-900">Memberships Expiring Soon</h2>
          </div>
          {summary.membershipsExpiringSoon.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">Nothing expiring in the next 7 days.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {summary.membershipsExpiringSoon.map((m) => (
                <li key={m.id} className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {initialsOf(m.first_name, m.last_name)}
                  </div>
                  <span className="text-sm font-medium text-gray-800 flex-1">{m.first_name} {m.last_name}</span>
                  <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">{formatDate(m.end_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <IconRupee className="w-4 h-4 text-emerald-600" style={{ width: 16, height: 16 }} />
            </div>
            <h2 className="font-semibold text-gray-900">Recent Payments</h2>
          </div>
          {summary.recentPayments.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {summary.recentPayments.map((p) => (
                <li key={p.id} className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {initialsOf(p.first_name, p.last_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{p.first_name} {p.last_name}</div>
                    <div className="text-xs text-gray-400">{formatDate(p.payment_date)}</div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">₹{p.amount}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5 mt-5">
        <h2 className="font-semibold text-gray-900 mb-1">Revenue Snapshot</h2>
        <p className="text-xs text-gray-400 mb-4">Collected in {summary.monthlyRevenueLabel} (last completed month)</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={[{ month: summary.monthlyRevenueLabel, revenue: Number(summary.monthlyRevenue) }]} barSize={64}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#4338ca" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f5" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: '#eef0fb' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 13 }}
              formatter={(value) => [`₹${value}`, 'Revenue']}
            />
            <Bar dataKey="revenue" fill="url(#revenueFill)" radius={[10, 10, 10, 10]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <AnalyticsSections />
    </div>
  );
}
