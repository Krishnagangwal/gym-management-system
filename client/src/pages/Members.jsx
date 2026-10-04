import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { membersApi } from '../api/members';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';
import { IconUsers, IconPlus, IconSearch } from '../components/icons.jsx';

const emptyForm = { firstName: '', lastName: '', email: '', phone: '' };

function initialsOf(first, last) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
}

export default function Members() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginTarget, setLoginTarget] = useState(null);
  const [loginStatus, setLoginStatus] = useState(undefined);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

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

  function openLogin(member) {
    setLoginTarget(member);
    setLoginEmail(member.email);
    setLoginPassword('');
    setLoginError('');
    setLoginStatus(undefined);
    membersApi.getLogin(token, member.id).then(setLoginStatus);
    setLoginModalOpen(true);
  }

  async function handleCreateLogin(e) {
    e.preventDefault();
    setLoginError('');
    try {
      await membersApi.createLogin(token, loginTarget.id, { email: loginEmail, password: loginPassword });
      membersApi.getLogin(token, loginTarget.id).then(setLoginStatus);
    } catch (err) {
      setLoginError(err.message);
    }
  }

  const columns = [
    { key: 'name', label: 'Name', render: (r) => (
        <Link to={`/members/${r.id}`} className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {initialsOf(r.first_name, r.last_name)}
          </div>
          <span className="font-medium text-gray-800 group-hover:text-indigo-600">{r.first_name} {r.last_name}</span>
        </Link>
      ) },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'is_active', label: 'Status', render: (r) => (
        <Badge tone={r.is_active ? 'green' : 'gray'} dot>{r.is_active ? 'Active' : 'Inactive'}</Badge>
      ) },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <IconUsers style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="page-title">Members</h1>
            <p className="text-sm text-gray-400">{members.length} members on record</p>
          </div>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <IconPlus style={{ width: 16, height: 16 }} /> Add Member
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="relative w-72">
          {/* <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ width: 16, height: 16 }} /> */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search by name, email, or phone"
            className="input-field pl-10"
          />
        </div>
        <button onClick={load} className="btn-secondary">Search</button>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {loading ? (
        <div className="text-gray-500">Loading members...</div>
      ) : (
        <DataTable
          columns={columns}
          rows={members}
          renderActions={(r) => (
            <div className="flex gap-3 justify-end">
              {isAdmin && <button onClick={() => openLogin(r)} className="btn-link">Portal</button>}
              <button onClick={() => openEdit(r)} className="btn-link">Edit</button>
              <button onClick={() => setConfirmTarget(r)} className="btn-danger-link">
                {r.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          )}
        />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Member' : 'Add Member'}>
        <form onSubmit={handleSubmit}>
          {formError && <div className="alert-error mb-3">{formError}</div>}
          {['firstName', 'lastName', 'email', 'phone'].map((field) => (
            <div key={field} className="mb-3">
              <label className="field-label capitalize">
                {field.replace(/([A-Z])/g, ' $1')}
              </label>
              <input
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="input-field"
                required
              />
            </div>
          ))}
          <button type="submit" className="btn-primary w-full mt-2">
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

      <Modal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} title={`Portal Access — ${loginTarget?.first_name || ''} ${loginTarget?.last_name || ''}`}>
        {loginStatus === undefined ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : loginStatus ? (
          <p className="text-sm text-gray-600">
            Portal login active for <strong className="text-gray-900">{loginStatus.email}</strong>.
          </p>
        ) : (
          <form onSubmit={handleCreateLogin}>
            {loginError && <div className="alert-error mb-3">{loginError}</div>}
            <div className="mb-3">
              <label className="field-label">Login Email</label>
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="input-field" required />
            </div>
            <div className="mb-3">
              <label className="field-label">Initial Password</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="input-field" minLength={8} required />
            </div>
            <button type="submit" className="btn-primary w-full mt-2">Create Portal Login</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
