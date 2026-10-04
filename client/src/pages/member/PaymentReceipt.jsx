import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { meApi } from '../../api/me';
import Badge from '../../components/Badge';
import { IconChevronRight, IconDumbbell } from '../../components/icons.jsx';
import { formatDate } from '../../utils/formatDate';

const STATUS_TONE = { completed: 'green', pending: 'amber', failed: 'red' };

export default function PaymentReceipt() {
  const { id } = useParams();
  const { token } = useAuth();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    meApi.receipt(token, id).then(setReceipt).catch((err) => setError(err.message));
  }, [token, id]);

  if (error) return <div className="alert-error">{error}</div>;
  if (!receipt) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to="/member/payments" className="btn-link inline-flex items-center gap-1">
          <IconChevronRight style={{ width: 14, height: 14, transform: 'rotate(180deg)' }} /> Back to Payments
        </Link>
        <button onClick={() => window.print()} className="btn-primary">Print Receipt</button>
      </div>

      <div className="card p-8 max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-600/30">
              <IconDumbbell className="w-5 h-5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">GymAdmin</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900">Receipt #{receipt.id}</div>
            <div className="text-xs text-gray-400">{formatDate(receipt.payment_date)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Billed To</div>
            <div className="font-medium text-gray-800">{receipt.first_name} {receipt.last_name}</div>
            <div className="text-gray-500">{receipt.email}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Membership Period</div>
            <div className="font-medium text-gray-800">{formatDate(receipt.start_date)} – {formatDate(receipt.end_date)}</div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <span>Description</span>
            <span>Amount</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="font-medium text-gray-800">{receipt.plan_name} Membership</span>
            <span className="font-semibold text-gray-900">₹{receipt.amount}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm mb-6">
          <span className="text-gray-500">Payment Method</span>
          <Badge tone="gray">{receipt.payment_method.replace('_', ' ')}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm mb-6">
          <span className="text-gray-500">Status</span>
          <Badge tone={STATUS_TONE[receipt.status] || 'gray'} dot>{receipt.status}</Badge>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="font-semibold text-gray-900">Total Paid</span>
          <span className="text-xl font-bold text-gray-900">₹{receipt.amount}</span>
        </div>
      </div>
    </div>
  );
}
