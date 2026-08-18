import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { membersApi } from '../api/members';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const emptyForm = { firstName: '', lastName: '', email: '', phone: '' };

export default function Members() {
  const { token } = useAuth();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);

  function load() {
    setLoading(true);
    membersApi.list(token, search ? { search } : {})
      .then(setMembers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(member) {
    setEditing(member);
    setForm({
      firstName: member.first_name, lastName: member.last_name,
      email: member.email, phone: member.phone,
    });
    setFormError('');
    setFormOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      if (editing) {
        await membersApi.update(token, editing.id, form);
      } else {
        await membersApi.create(token, form);
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function toggleStatus(member) {
    await membersApi.setStatus(token, member.id, !member.is_active);
    setConfirmTarget(null);
    load();
  }

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <Link to={`/members/${r.id}`} className="text-blue-600 hover:underline">{r.first_name} {r.last_name}</Link> },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'is_active', label: 'Status', render: (r) => (
        <span className={`px-2 py-1 rounded text-xs ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
          {r.is_active ? 'Active' : 'Inactive'}
        </span>
      ) },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Members</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Add Member
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search by name, email, or phone"
          className="border rounded px-3 py-2 w-72 text-sm"
        />
        <button onClick={load} className="px-4 py-2 border rounded text-sm hover:bg-gray-100">Search</button>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {loading ? (
        <div className="text-gray-500">Loading members...</div>
      ) : (
        <DataTable
          columns={columns}
          rows={members}
          renderActions={(r) => (
            <div className="flex gap-2 justify-end">
              <button onClick={() => openEdit(r)} className="text-blue-600 text-sm hover:underline">Edit</button>
              <button onClick={() => setConfirmTarget(r)} className="text-red-600 text-sm hover:underline">
                {r.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          )}
        />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Member' : 'Add Member'}>
        <form onSubmit={handleSubmit}>
          {formError && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{formError}</div>}
          {['firstName', 'lastName', 'email', 'phone'].map((field) => (
            <div key={field} className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                {field.replace(/([A-Z])/g, ' $1')}
              </label>
              <input
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                required
              />
            </div>
          ))}
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mt-2">
            {editing ? 'Save Changes' : 'Add Member'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        message={confirmTarget ? `${confirmTarget.is_active ? 'Deactivate' : 'Activate'} ${confirmTarget.first_name} ${confirmTarget.last_name}?` : ''}
        onConfirm={() => toggleStatus(confirmTarget)}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
