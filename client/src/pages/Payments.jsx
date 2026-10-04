import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { paymentsApi } from '../api/payments';
import { membersApi } from '../api/members';
import { membershipsApi } from '../api/memberships';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { IconCard, IconPlus, IconRupee } from '../components/icons.jsx';
import { formatDate, todayISO } from '../utils/formatDate';

const METHODS = ['cash', 'card', 'upi', 'bank_transfer'];
const METHOD_TONE = { cash: 'gray', card: 'indigo', upi: 'sky', bank_transfer: 'amber' };

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

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const columns = [
    { key: 'name', label: 'Member', render: (r) => <span className="font-medium text-gray-800">{r.first_name} {r.last_name}</span> },
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-semibold text-gray-900">₹{r.amount}</span> },
    { key: 'payment_date', label: 'Date', render: (r) => formatDate(r.payment_date) },
    { key: 'payment_method', label: 'Method', render: (r) => <Badge tone={METHOD_TONE[r.payment_method] || 'gray'}>{r.payment_method.replace('_', ' ')}</Badge> },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <IconCard style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="page-title">Payments</h1>
            <p className="text-sm text-gray-400">₹{totalRevenue.toFixed(2)} collected total</p>
          </div>
        </div>
        <button onClick={() => setFormOpen(true)} className="btn-primary"><IconPlus style={{ width: 16, height: 16 }} /> Record Payment</button>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {loading ? <div className="text-gray-500">Loading payments...</div> : (
        <DataTable columns={columns} rows={payments} renderActions={(r) => (
          <button onClick={() => viewReceipt(r)} className="btn-link">View Receipt</button>
        )} />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Record Payment">
        <form onSubmit={handleSubmit}>
          {formError && <div className="alert-error mb-3">{formError}</div>}
          <div className="mb-3">
            <label className="field-label">Member</label>
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="input-field" required>
              <option value="" disabled>Select a member</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="field-label">Membership</label>
            <select value={form.membershipId} onChange={(e) => setForm({ ...form, membershipId: e.target.value })} className="input-field" required disabled={!memberId}>
              <option value="" disabled>Select a membership</option>
              {memberships.map((m) => <option key={m.id} value={m.id}>{m.plan_name} ({formatDate(m.start_date)} - {formatDate(m.end_date)})</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="field-label">Amount (₹)</label>
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" required />
          </div>
          <div className="mb-3">
            <label className="field-label">Payment Date</label>
            <input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} className="input-field" required />
          </div>
          <div className="mb-3">
            <label className="field-label">Method</label>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="input-field">
              {METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary w-full mt-2">Record Payment</button>
        </form>
      </Modal>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Receipt">
        {receipt && (
          <div className="text-sm">
            <div className="flex items-center justify-center gap-2 py-4 mb-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <IconRupee style={{ width: 20, height: 20 }} />
              <span className="text-2xl font-bold">{receipt.amount}</span>
            </div>
            <div className="space-y-2.5">
              <div className="font-mono text-gray-400 text-xs text-center mb-1">{receipt.receiptNumber}</div>
              <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Member</span><span className="font-medium">{receipt.memberName}</span></div>
              <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Plan</span><span className="font-medium">{receipt.plan}</span></div>
              <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Period</span><span className="font-medium">{formatDate(receipt.membershipPeriod.start)} – {formatDate(receipt.membershipPeriod.end)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Paid on</span><span className="font-medium">{formatDate(receipt.paymentDate)} via {receipt.paymentMethod}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
