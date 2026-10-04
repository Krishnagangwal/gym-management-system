import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { membershipsApi } from '../api/memberships';
import { paymentsApi } from '../api/payments';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import { IconChart, IconRupee, IconCard } from '../components/icons.jsx';
import { formatDate } from '../utils/formatDate';

export default function Reports() {
  const { token } = useAuth();
  const [tab, setTab] = useState('expired');
  const [expired, setExpired] = useState([]);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    membershipsApi.listAll(token, 'expired').then(setExpired).catch((err) => setError(err.message));
    paymentsApi.list(token).then(setPayments).catch((err) => setError(err.message));
  }, [token]);

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const expiredColumns = [
    { key: 'member', label: 'Member', render: (r) => <span className="font-medium text-gray-800">{r.first_name} {r.last_name}</span> },
    { key: 'plan_name', label: 'Plan', render: (r) => <Badge tone="indigo">{r.plan_name}</Badge> },
    { key: 'end_date', label: 'Expired On', render: (r) => <span className="text-rose-600">{formatDate(r.end_date)}</span> },
  ];

  const paymentColumns = [
    { key: 'member', label: 'Member', render: (r) => <span className="font-medium text-gray-800">{r.first_name} {r.last_name}</span> },
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-semibold text-gray-900">₹{r.amount}</span> },
    { key: 'payment_date', label: 'Date', render: (r) => formatDate(r.payment_date) },
    { key: 'payment_method', label: 'Method', render: (r) => <Badge tone="gray">{r.payment_method.replace('_', ' ')}</Badge> },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconChart style={{ width: 22, height: 22 }} />
        </div>
        <h1 className="page-title">Reports</h1>
      </div>
      {error && <div className="alert-error mb-4">{error}</div>}

      <div className="mb-5 flex gap-2 flex-wrap">
        <button onClick={() => setTab('expired')} className={`tab-btn inline-flex items-center gap-2 ${tab === 'expired' ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
          <IconCard style={{ width: 15, height: 15 }} /> Expired Memberships <span className="opacity-70">({expired.length})</span>
        </button>
        <button onClick={() => setTab('payments')} className={`tab-btn inline-flex items-center gap-2 ${tab === 'payments' ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
          <IconRupee style={{ width: 15, height: 15 }} /> All Payments <span className="opacity-70">(₹{totalRevenue.toFixed(2)})</span>
        </button>
      </div>

      {tab === 'expired' && <DataTable columns={expiredColumns} rows={expired} emptyMessage="No expired memberships." />}
      {tab === 'payments' && <DataTable columns={paymentColumns} rows={payments} emptyMessage="No payments recorded." />}
    </div>
  );
}
