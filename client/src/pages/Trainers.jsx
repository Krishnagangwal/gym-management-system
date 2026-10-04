import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { trainersApi } from '../api/trainers';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { IconWhistle, IconPlus, IconClock } from '../components/icons.jsx';

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
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginTarget, setLoginTarget] = useState(null);
  const [loginStatus, setLoginStatus] = useState(undefined);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

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

  function openLogin(trainer) {
    setLoginTarget(trainer);
    setLoginEmail(trainer.email);
    setLoginPassword('');
    setLoginError('');
    setLoginStatus(undefined);
    trainersApi.getLogin(token, trainer.id).then(setLoginStatus);
    setLoginModalOpen(true);
  }

  async function handleCreateLogin(e) {
    e.preventDefault();
    setLoginError('');
    try {
      await trainersApi.createLogin(token, loginTarget.id, { email: loginEmail, password: loginPassword });
      trainersApi.getLogin(token, loginTarget.id).then(setLoginStatus);
    } catch (err) {
      setLoginError(err.message);
    }
  }

  const columns = [
    { key: 'name', label: 'Name', render: (r) => (
        <span className="font-medium text-gray-800">{r.first_name} {r.last_name}</span>
      ) },
    { key: 'specialization', label: 'Specialization', render: (r) => r.specialization ? <Badge tone="violet">{r.specialization}</Badge> : '—' },
    { key: 'availability', label: 'Availability', render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-gray-500 text-sm">
          <IconClock style={{ width: 14, height: 14 }} /> {r.availability || '—'}
        </span>
      ) },
    { key: 'is_active', label: 'Status', render: (r) => <Badge tone={r.is_active ? 'green' : 'gray'} dot>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <IconWhistle style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="page-title">Trainers</h1>
            <p className="text-sm text-gray-400">{trainers.length} trainers on staff</p>
          </div>
        </div>
        {isAdmin && <button onClick={openCreate} className="btn-primary"><IconPlus style={{ width: 16, height: 16 }} /> Add Trainer</button>}
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {loading ? <div className="text-gray-500">Loading trainers...</div> : (
        <DataTable columns={columns} rows={trainers} renderActions={isAdmin ? (r) => (
          <div className="flex gap-3 justify-end">
            <button onClick={() => openLogin(r)} className="btn-link">Portal</button>
            <button onClick={() => openEdit(r)} className="btn-link">Edit</button>
            <button onClick={() => toggleStatus(r)} className="btn-danger-link">{r.is_active ? 'Deactivate' : 'Activate'}</button>
          </div>
        ) : undefined} />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Trainer' : 'Add Trainer'}>
        <form onSubmit={handleSubmit}>
          {formError && <div className="alert-error mb-3">{formError}</div>}
          {['firstName', 'lastName', 'email', 'phone', 'specialization', 'availability'].map((field) => (
            <div key={field} className="mb-3">
              <label className="field-label capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
              <input
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="input-field"
                required={['firstName', 'lastName', 'email'].includes(field)}
              />
            </div>
          ))}
          <button type="submit" className="btn-primary w-full mt-2">
            {editing ? 'Save Changes' : 'Add Trainer'}
          </button>
        </form>
      </Modal>

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
