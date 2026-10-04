import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { invoicesApi } from '../api/invoices';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import { IconReceipt, IconSearch } from '../components/icons.jsx';
import { formatDate } from '../utils/formatDate';

const STATUS_TONE = { draft: 'gray', issued: 'sky', paid: 'green', overdue: 'red' };
const STATUSES = ['draft', 'issued', 'paid', 'overdue'];

export default function Invoices() {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  function load() {
    setLoading(true);
    const params = {};
    if (status) params.status = status;
    if (search) params.search = search;
    invoicesApi.list(token, params).then(setInvoices).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [token, status]);

  const columns = [
    { key: 'invoice_number', label: 'Invoice #', render: (r) => <span className="font-mono text-xs font-medium text-gray-800">{r.invoice_number}</span> },
    { key: 'member', label: 'Member', render: (r) => <span className="font-medium text-gray-800">{r.first_name} {r.last_name}</span> },
    { key: 'issue_date', label: 'Issued', render: (r) => formatDate(r.issue_date) },
    { key: 'total', label: 'Total', render: (r) => <span className="font-semibold text-gray-900">₹{r.total}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status] || 'gray'} dot>{r.status}</Badge> },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconReceipt style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="text-sm text-gray-400">{invoices.length} invoices</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        <div className="relative w-72">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search invoice # or member"
            className="input-field pl-10"
          />
          <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ width: 16, height: 16 }} />
        </div>
        <button onClick={load} className="btn-secondary">Search</button>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-40">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {loading ? <div className="text-gray-500">Loading invoices...</div> : (
        <DataTable columns={columns} rows={invoices} emptyMessage="No invoices found." renderActions={(r) => (
          <Link to={`/invoices/${r.id}`} className="btn-link">View</Link>
        )} />
      )}
    </div>
  );
}
