import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { paymentsApi } from '../api/payments';
import { membersApi } from '../api/members';
import { membershipsApi } from '../api/memberships';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { formatDate, todayISO } from '../utils/formatDate';

const METHODS = ['cash', 'card', 'upi', 'bank_transfer'];

export default function Payments() {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [memberId, setMemberId] = useState('');
  const [memberships, setMemberships] = useState([]);
  const [form, setForm] = useState({ membershipId: '', amount: '', paymentDate: todayISO(), paymentMethod: 'cash' });
  const [receipt, setReceipt] = useState(null);

  function load() {
    setLoading(true);
    paymentsApi.list(token).then(setPayments).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [token]);
  useEffect(() => { membersApi.list(token).then(setMembers).catch(() => {}); }, [token]);

  useEffect(() => {
    if (memberId) membershipsApi.history(token, memberId).then(setMemberships).catch(() => setMemberships([]));
    else setMemberships([]);
  }, [token, memberId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      await paymentsApi.create(token, { ...form, memberId: Number(memberId), membershipId: Number(form.membershipId), amount: Number(form.amount) });
      setFormOpen(false);
      setMemberId('');
      setForm({ membershipId: '', amount: '', paymentDate: todayISO(), paymentMethod: 'cash' });
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function viewReceipt(payment) {
    setReceipt(await paymentsApi.receipt(token, payment.id));
  }

  const columns = [
    { key: 'name', label: 'Member', render: (r) => `${r.first_name} ${r.last_name}` },
    { key: 'amount', label: 'Amount', render: (r) => `₹${r.amount}` },
    { key: 'payment_date', label: 'Date', render: (r) => formatDate(r.payment_date) },
    { key: 'payment_method', label: 'Method' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        <button onClick={() => setFormOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ Record Payment</button>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {loading ? <div className="text-gray-500">Loading payments...</div> : (
        <DataTable columns={columns} rows={payments} renderActions={(r) => (
          <button onClick={() => viewReceipt(r)} className="text-blue-600 text-sm hover:underline">View Receipt</button>
        )} />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Record Payment">
        <form onSubmit={handleSubmit}>
          {formError && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{formError}</div>}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required>
              <option value="" disabled>Select a member</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Membership</label>
            <select value={form.membershipId} onChange={(e) => setForm({ ...form, membershipId: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required disabled={!memberId}>
              <option value="" disabled>Select a membership</option>
              {memberships.map((m) => <option key={m.id} value={m.id}>{m.plan_name} ({formatDate(m.start_date)} - {formatDate(m.end_date)})</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
            <input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
              {METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mt-2">Record Payment</button>
        </form>
      </Modal>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Receipt">
        {receipt && (
          <div className="text-sm space-y-2">
            <div className="font-mono text-gray-500">{receipt.receiptNumber}</div>
            <div><span className="text-gray-500">Member:</span> {receipt.memberName}</div>
            <div><span className="text-gray-500">Plan:</span> {receipt.plan}</div>
            <div><span className="text-gray-500">Period:</span> {formatDate(receipt.membershipPeriod.start)} to {formatDate(receipt.membershipPeriod.end)}</div>
            <div><span className="text-gray-500">Amount:</span> ₹{receipt.amount}</div>
            <div><span className="text-gray-500">Paid on:</span> {formatDate(receipt.paymentDate)} via {receipt.paymentMethod}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
