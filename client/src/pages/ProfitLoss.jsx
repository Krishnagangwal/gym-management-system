import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { analyticsApi } from '../api/analytics';
import DateRangeFilter from '../components/DateRangeFilter';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import { isoDaysAgo, todayISO } from '../utils/formatDate';
import { CHART_GRID_STROKE, CHART_TICK_STYLE, CHART_TOOLTIP_STYLE } from '../utils/chartTheme';
import { IconTrendUp, IconRupee, IconTrendDown } from '../components/icons.jsx';

const inr = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
// Marks the current, still-in-progress month so its partial total doesn't
// read as a sudden drop in the monthly breakdown.
const monthLabel = (ym) => {
  const label = new Date(`${ym}-01`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  return ym === currentMonthKey() ? `${label} (MTD)` : label;
};

export default function ProfitLoss() {
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

  const finance = data?.finance;

  const monthlyColumns = [
    { key: 'month', label: 'Month', render: (r) => <span className="font-medium text-gray-800">{monthLabel(r.month)}</span> },
    { key: 'revenue', label: 'Revenue', render: (r) => inr(r.revenue) },
    { key: 'expenses', label: 'Expenses', render: (r) => inr(r.expenses) },
    { key: 'profit', label: 'Profit', render: (r) => <span className={r.profit >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>{inr(r.profit)}</span> },
    { key: 'netMargin', label: 'Net Margin', render: (r) => <Badge tone={r.netMargin >= 0 ? 'green' : 'red'}>{r.netMargin}%</Badge> },
  ];
  const monthlyRows = finance?.monthlyProfitAndLoss.map((r) => ({ ...r, id: r.month })) || [];

  const categoryColumns = [
    { key: 'category_name', label: 'Category', render: (r) => <Badge tone="violet">{r.category_name}</Badge> },
    { key: 'total', label: 'Total', render: (r) => <span className="font-semibold text-gray-900">{inr(r.total)}</span> },
  ];
  const categoryRows = finance?.expensesByCategory.map((r, i) => ({ ...r, id: i })) || [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconTrendUp style={{ width: 22, height: 22 }} />
        </div>
        <h1 className="page-title">Profit &amp; Loss</h1>
      </div>

      <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />

      {error && <div className="alert-error mb-4">{error}</div>}
      {(loading || !finance) && !error ? (
        <div className="text-gray-500">Loading...</div>
      ) : finance && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Revenue" value={inr(finance.profitAndLoss.revenue)} icon={IconRupee} tone="emerald" />
            <StatCard label="Total Expenses" value={inr(finance.profitAndLoss.expenses)} icon={IconTrendDown} tone="rose" />
            <StatCard label="Gross Profit" value={inr(finance.profitAndLoss.grossProfit)} icon={IconTrendUp} tone="indigo" />
            <div className="col-span-2 md:col-span-1">
              <StatCard label="Net Margin" value={`${finance.profitAndLoss.netMargin}%`} icon={IconTrendUp} tone="violet" highlight />
            </div>
          </div>

          <div className="card p-5 mb-6">
            <h2 className="font-semibold text-gray-900 mb-1">Monthly Profit</h2>
            <p className="text-xs text-gray-400 mb-4">Revenue minus expenses, per month</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyRows.map((r) => ({ month: monthLabel(r.month), profit: r.profit }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} />
                <YAxis tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [inr(value), 'Profit']} cursor={{ fill: '#eef0fb' }} />
                <Bar dataKey="profit" fill="#6366f1" radius={[8, 8, 8, 8]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Monthly Breakdown</h2>
              <DataTable columns={monthlyColumns} rows={monthlyRows} emptyMessage="No data for this range." />
            </div>
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Expenses by Category</h2>
              <DataTable columns={categoryColumns} rows={categoryRows} emptyMessage="No expenses recorded for this range." />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
