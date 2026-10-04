import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { meApi } from '../../api/me';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import { IconCard } from '../../components/icons.jsx';
import { formatDate } from '../../utils/formatDate';

const STATUS_TONE = { completed: 'green', pending: 'amber', failed: 'red' };

export default function MyPayments() {
  const { token } = useAuth();
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    meApi.payments(token).then(setPayments).catch((err) => setError(err.message));
  }, [token]);

  if (error) return <div className="alert-error">{error}</div>;
  if (!payments) return <div className="text-gray-500">Loading...</div>;

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const columns = [
    { key: 'payment_date', label: 'Date', render: (r) => formatDate(r.payment_date) },
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-semibold text-gray-900">₹{r.amount}</span> },
    { key: 'payment_method', label: 'Method', render: (r) => <Badge tone="gray">{r.payment_method.replace('_', ' ')}</Badge> },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status] || 'gray'} dot>{r.status}</Badge> },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <IconCard style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="page-title">My Payments</h1>
            <p className="text-sm text-gray-400">₹{totalPaid.toFixed(2)} paid in total</p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={payments}
        emptyMessage="No payments recorded yet."
        renderActions={(r) => <Link to={`/member/payments/${r.id}/receipt`} className="btn-link">View Receipt</Link>}
      />
    </div>
  );
}
