import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { membershipPlansApi } from '../api/membershipPlans';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';

const emptyForm = { name: '', description: '', durationDays: '', price: '' };

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

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'duration_days', label: 'Duration (days)' },
    { key: 'price', label: 'Price', render: (r) => `₹${r.price}` },
    { key: 'is_active', label: 'Status', render: (r) => (r.is_active ? 'Active' : 'Inactive') },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Membership Plans</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ Add Plan</button>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {loading ? <div className="text-gray-500">Loading plans...</div> : (
        <DataTable columns={columns} rows={plans} renderActions={(r) => (
          <button onClick={() => openEdit(r)} className="text-blue-600 text-sm hover:underline">Edit</button>
        )} />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Plan' : 'Add Plan'}>
        <form onSubmit={handleSubmit}>
          {formError && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{formError}</div>}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
            <input type="number" min="1" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
          </div>
          {editing && (
            <label className="flex items-center gap-2 mb-3 text-sm">
              <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
          )}
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mt-2">
            {editing ? 'Save Changes' : 'Add Plan'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
