import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { trainersApi } from '../api/trainers';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', specialization: '', availability: '' };

export default function Trainers() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  function load() {
    setLoading(true);
    trainersApi.list(token).then(setTrainers).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(trainer) {
    setEditing(trainer);
    setForm({
      firstName: trainer.first_name, lastName: trainer.last_name, email: trainer.email,
      phone: trainer.phone || '', specialization: trainer.specialization || '', availability: trainer.availability || '',
    });
    setFormError('');
    setFormOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      if (editing) await trainersApi.update(token, editing.id, form);
      else await trainersApi.create(token, form);
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function toggleStatus(trainer) {
    await trainersApi.setStatus(token, trainer.id, !trainer.is_active);
    load();
  }

  const columns = [
    { key: 'name', label: 'Name', render: (r) => `${r.first_name} ${r.last_name}` },
    { key: 'specialization', label: 'Specialization' },
    { key: 'availability', label: 'Availability' },
    { key: 'is_active', label: 'Status', render: (r) => (r.is_active ? 'Active' : 'Inactive') },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Trainers</h1>
        {isAdmin && <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ Add Trainer</button>}
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {loading ? <div className="text-gray-500">Loading trainers...</div> : (
        <DataTable columns={columns} rows={trainers} renderActions={isAdmin ? (r) => (
          <div className="flex gap-2 justify-end">
            <button onClick={() => openEdit(r)} className="text-blue-600 text-sm hover:underline">Edit</button>
            <button onClick={() => toggleStatus(r)} className="text-red-600 text-sm hover:underline">{r.is_active ? 'Deactivate' : 'Activate'}</button>
          </div>
        ) : undefined} />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Trainer' : 'Add Trainer'}>
        <form onSubmit={handleSubmit}>
          {formError && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{formError}</div>}
          {['firstName', 'lastName', 'email', 'phone', 'specialization', 'availability'].map((field) => (
            <div key={field} className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
              <input
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                required={['firstName', 'lastName', 'email'].includes(field)}
              />
            </div>
          ))}
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mt-2">
            {editing ? 'Save Changes' : 'Add Trainer'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
