import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { invoicesApi } from '../api/invoices';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { IconClock } from '../components/icons.jsx';
import { formatDate } from '../utils/formatDate';

function bucketFor(days) {
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  return '61+';
}

const BUCKET_TONE = { '0-30': 'amber', '31-60': 'rose', '61+': 'red' };
const BUCKETS = ['0-30', '31-60', '61+'];

export default function Receivables() {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState(null);
  const [error, setError] = useState('');
  const [activeBucket, setActiveBucket] = useState('all');

  useEffect(() => {
    invoicesApi.receivablesAging(token).then(setInvoices).catch((err) => setError(err.message));
  }, [token]);

  if (error) return <div className="alert-error">{error}</div>;
  if (!invoices) return <div className="text-gray-500">Loading...</div>;

  const rows = invoices.map((r) => ({ ...r, bucket: bucketFor(r.days_overdue) }));
  const totals = BUCKETS.reduce((acc, b) => {
    const bucketRows = rows.filter((r) => r.bucket === b);
    acc[b] = { count: bucketRows.length, total: bucketRows.reduce((s, r) => s + Number(r.total), 0) };
    return acc;
  }, {});
  const grandTotal = rows.reduce((s, r) => s + Number(r.total), 0);

  const visibleRows = activeBucket === 'all' ? rows : rows.filter((r) => r.bucket === activeBucket);

  const columns = [
    { key: 'invoice_number', label: 'Invoice #', render: (r) => <span className="font-mono text-xs font-medium text-gray-800">{r.invoice_number}</span> },
    { key: 'member', label: 'Member', render: (r) => <span className="font-medium text-gray-800">{r.first_name} {r.last_name}</span> },
    { key: 'due_date', label: 'Due Date', render: (r) => formatDate(r.due_date) },
    { key: 'days_overdue', label: 'Days Overdue', render: (r) => <Badge tone={BUCKET_TONE[r.bucket]}>{r.days_overdue} days</Badge> },
    { key: 'total', label: 'Amount', render: (r) => <span className="font-semibold text-gray-900">₹{r.total}</span> },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconClock style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <h1 className="page-title">Receivables Aging</h1>
          <p className="text-sm text-gray-400">₹{grandTotal.toFixed(2)} outstanding across {rows.length} invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="0-30 Days" value={`₹${totals['0-30'].total.toFixed(2)}`} icon={IconClock} tone="amber" />
        <StatCard label="31-60 Days" value={`₹${totals['31-60'].total.toFixed(2)}`} icon={IconClock} tone="rose" />
        <StatCard label="61+ Days" value={`₹${totals['61+'].total.toFixed(2)}`} icon={IconClock} tone="rose" />
      </div>

      <div className="mb-5 flex gap-2 flex-wrap">
        <button onClick={() => setActiveBucket('all')} className={`tab-btn ${activeBucket === 'all' ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
          All <span className="opacity-70">({rows.length})</span>
        </button>
        {BUCKETS.map((b) => (
          <button key={b} onClick={() => setActiveBucket(b)} className={`tab-btn ${activeBucket === b ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
            {b} Days <span className="opacity-70">({totals[b].count})</span>
          </button>
        ))}
      </div>

      <DataTable columns={columns} rows={visibleRows} emptyMessage="No outstanding receivables in this bucket." renderActions={(r) => (
        <Link to={`/invoices/${r.id}`} className="btn-link">View</Link>
      )} />
    </div>
  );
}
