import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { invoicesApi } from '../api/invoices';
import Badge from '../components/Badge';
import { IconChevronRight, IconDumbbell } from '../components/icons.jsx';
import { formatDate } from '../utils/formatDate';
import { amountInWords } from '../utils/numberToWords';

const STATUS_TONE = { draft: 'gray', issued: 'sky', paid: 'green', overdue: 'red' };

const GYM = {
  name: 'GymAdmin Fitness Center',
  address: '221B Fitness Lane, Andheri, Mumbai, Maharashtra 400053',
  gstin: '27ABCDE1234F1Z5',
};

export default function InvoiceView() {
  const { id } = useParams();
  const { token } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    invoicesApi.get(token, id).then(setInvoice).catch((err) => setError(err.message));
  }, [token, id]);

  if (error) return <div className="alert-error">{error}</div>;
  if (!invoice) return <div className="text-gray-500">Loading...</div>;

  const halfTax = Number(invoice.tax_amount) / 2;
  const halfRate = Number(invoice.tax_rate) / 2;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to="/invoices" className="btn-link inline-flex items-center gap-1">
          <IconChevronRight style={{ width: 14, height: 14, transform: 'rotate(180deg)' }} /> Back to Invoices
        </Link>
        <button onClick={() => window.print()} className="btn-primary">Print Invoice</button>
      </div>

      <div className="card p-8 max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-600/30">
              <IconDumbbell className="w-5 h-5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-gray-900">{GYM.name}</div>
              <div className="text-xs text-gray-400 max-w-[220px]">{GYM.address}</div>
              <div className="text-xs text-gray-400">GSTIN: {GYM.gstin}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Tax Invoice</div>
            <div className="font-mono text-sm font-semibold text-gray-900">{invoice.invoice_number}</div>
            <div className="text-xs text-gray-400 mt-1">Issued {formatDate(invoice.issue_date)}</div>
            <div className="text-xs text-gray-400">Due {formatDate(invoice.due_date)}</div>
            <div className="mt-2"><Badge tone={STATUS_TONE[invoice.status] || 'gray'} dot>{invoice.status}</Badge></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Billed To</div>
            <div className="font-medium text-gray-800">{invoice.first_name} {invoice.last_name}</div>
            <div className="text-gray-500">{invoice.email}</div>
            {invoice.phone && <div className="text-gray-500">{invoice.phone}</div>}
            {invoice.address && <div className="text-gray-500">{invoice.address}</div>}
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Membership Period</div>
            <div className="font-medium text-gray-800">{formatDate(invoice.start_date)} – {formatDate(invoice.end_date)}</div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-right px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3.5 font-medium text-gray-800">{invoice.plan_name} Membership</td>
                <td className="px-4 py-3.5 text-right text-gray-800">₹{invoice.subtotal}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-gray-500">CGST @ {halfRate}%</td>
                <td className="px-4 py-2.5 text-right text-gray-500">₹{halfTax.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-gray-500">SGST @ {halfRate}%</td>
                <td className="px-4 py-2.5 text-right text-gray-500">₹{halfTax.toFixed(2)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-100">
                <td className="px-4 py-3.5 font-semibold text-gray-900">Total</td>
                <td className="px-4 py-3.5 text-right text-lg font-bold text-gray-900">₹{invoice.total}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="text-sm mb-6">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Amount in Words</div>
          <div className="text-gray-700 italic">{amountInWords(invoice.total)}</div>
        </div>

        <p className="text-xs text-gray-400 text-center pt-4 border-t border-gray-100">
          This is a computer-generated invoice and does not require a signature.
        </p>
      </div>
    </div>
  );
}
