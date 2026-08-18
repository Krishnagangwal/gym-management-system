import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { membershipsApi } from '../api/memberships';
import { paymentsApi } from '../api/payments';
import DataTable from '../components/DataTable';
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
    { key: 'member', label: 'Member', render: (r) => `${r.first_name} ${r.last_name}` },
    { key: 'plan_name', label: 'Plan' },
    { key: 'end_date', label: 'Expired On', render: (r) => formatDate(r.end_date) },
  ];

  const paymentColumns = [
    { key: 'member', label: 'Member', render: (r) => `${r.first_name} ${r.last_name}` },
    { key: 'amount', label: 'Amount', render: (r) => `₹${r.amount}` },
    { key: 'payment_date', label: 'Date', render: (r) => formatDate(r.payment_date) },
    { key: 'payment_method', label: 'Method' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('expired')} className={`px-3 py-1.5 rounded text-sm border ${tab === 'expired' ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-100'}`}>
          Expired Memberships
        </button>
        <button onClick={() => setTab('payments')} className={`px-3 py-1.5 rounded text-sm border ${tab === 'payments' ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-100'}`}>
          All Payments (Total: ₹{totalRevenue.toFixed(2)})
        </button>
      </div>

      {tab === 'expired' && <DataTable columns={expiredColumns} rows={expired} emptyMessage="No expired memberships." />}
      {tab === 'payments' && <DataTable columns={paymentColumns} rows={payments} emptyMessage="No payments recorded." />}
    </div>
  );
}
