import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { membershipPlansApi } from '../api/membershipPlans';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { IconClipboard, IconPlus, IconRupee } from '../components/icons.jsx';

const emptyForm = { name: '', description: '', durationDays: '', price: '' };
const CARD_STYLES = [
  'from-indigo-500 to-indigo-700',
  'from-violet-500 to-purple-700',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-rose-500 to-pink-600',
];

export default function MembershipPlans() {
  const { token } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  function load() {
    setLoading(true);
    membershipPlansApi.list(token).then(setPlans).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(plan) {
    setEditing(plan);
    setForm({ name: plan.name, description: plan.description || '', durationDays: plan.duration_days, price: plan.price, isActive: plan.is_active });
    setFormError('');
    setFormOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      const body = { ...form, durationDays: Number(form.durationDays), price: Number(form.price) };
      if (editing) {
        await membershipPlansApi.update(token, editing.id, { ...body, isActive: form.isActive ?? true });
      } else {
        await membershipPlansApi.create(token, body);
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <IconClipboard style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="page-title">Membership Plans</h1>
            <p className="text-sm text-gray-400">{plans.length} plans available</p>
          </div>
        </div>
        <button onClick={openCreate} className="btn-primary"><IconPlus style={{ width: 16, height: 16 }} /> Add Plan</button>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      {loading ? (
        <div className="text-gray-500">Loading plans...</div>
      ) : plans.length === 0 ? (
        <div className="card py-16 text-center text-gray-500 text-sm">No plans yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <div key={plan.id} className="card overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className={`bg-gradient-to-br ${CARD_STYLES[i % CARD_STYLES.length]} text-white p-5 relative overflow-hidden`}>
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
                <div className="relative flex items-center justify-between">
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <Badge tone={plan.is_active ? 'green' : 'gray'}>{plan.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="relative flex items-baseline gap-1 mt-3">
                  <IconRupee style={{ width: 20, height: 20 }} />
                  <span className="text-3xl font-bold">{plan.price}</span>
                </div>
                <p className="relative text-white/75 text-xs mt-1">{plan.duration_days} days</p>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <p className="text-sm text-gray-500 flex-1">{plan.description || 'No description provided.'}</p>
                <button onClick={() => openEdit(plan)} className="btn-secondary mt-4 w-full">Edit Plan</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Plan' : 'Add Plan'}>
        <form onSubmit={handleSubmit}>
          {formError && <div className="alert-error mb-3">{formError}</div>}
          <div className="mb-3">
            <label className="field-label">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div className="mb-3">
            <label className="field-label">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" />
          </div>
          <div className="mb-3">
            <label className="field-label">Duration (days)</label>
            <input type="number" min="1" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} className="input-field" required />
          </div>
          <div className="mb-3">
            <label className="field-label">Price (₹)</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-field" required />
          </div>
          {editing && (
            <label className="flex items-center gap-2 mb-3 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
          )}
          <button type="submit" className="btn-primary w-full mt-2">
            {editing ? 'Save Changes' : 'Add Plan'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
