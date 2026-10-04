import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { employeesApi } from '../api/employees';
import { trainersApi } from '../api/trainers';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { IconBriefcase, IconPlus } from '../components/icons.jsx';
import { formatDate, todayISO } from '../utils/formatDate';

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract'];
const emptyForm = {
  trainerId: '', designation: '', department: '', dateOfJoining: todayISO(),
  employmentType: 'full_time', baseSalary: '', perSessionRate: '', bankAccountLast4: '',
};

export default function Employees() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  function load() {
    setLoading(true);
    employeesApi.list(token).then(setEmployees).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [token]);
  useEffect(() => { trainersApi.list(token).then(setTrainers).catch(() => {}); }, [token]);

  const linkedTrainerIds = new Set(employees.map((e) => e.trainer_id).filter(Boolean));

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(employee) {
    setEditing(employee);
    setForm({
      trainerId: employee.trainer_id || '', designation: employee.designation || '', department: employee.department || '',
      dateOfJoining: employee.date_of_joining?.slice(0, 10) || todayISO(), employmentType: employee.employment_type,
      baseSalary: employee.base_salary, perSessionRate: employee.per_session_rate, bankAccountLast4: employee.bank_account_last4 || '',
    });
    setFormError('');
    setFormOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      const body = {
        ...form,
        trainerId: form.trainerId ? Number(form.trainerId) : null,
        baseSalary: Number(form.baseSalary),
        perSessionRate: Number(form.perSessionRate) || 0,
      };
      if (editing) await employeesApi.update(token, editing.id, body);
      else await employeesApi.create(token, body);
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function toggleActive(employee) {
    await employeesApi.setStatus(token, employee.id, !employee.is_active);
    load();
  }

  const columns = [
    { key: 'employee_code', label: 'Code', render: (r) => <span className="font-mono text-xs text-gray-500">{r.employee_code}</span> },
    { key: 'name', label: 'Name', render: (r) => (
        <span className="font-medium text-gray-800">
          {r.trainer_first_name ? `${r.trainer_first_name} ${r.trainer_last_name}` : <span className="text-gray-400 italic">Unlinked</span>}
        </span>
      ) },
    { key: 'designation', label: 'Designation', render: (r) => r.designation || '—' },
    { key: 'employment_type', label: 'Type', render: (r) => <Badge tone="indigo">{r.employment_type.replace('_', ' ')}</Badge> },
    { key: 'base_salary', label: 'Base Salary', render: (r) => <span className="font-semibold text-gray-900">₹{r.base_salary}</span> },
    { key: 'date_of_joining', label: 'Joined', render: (r) => formatDate(r.date_of_joining) },
    { key: 'is_active', label: 'Status', render: (r) => <Badge tone={r.is_active ? 'green' : 'gray'} dot>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <IconBriefcase style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="page-title">Employees</h1>
            <p className="text-sm text-gray-400">{employees.length} employee records</p>
          </div>
        </div>
        <button onClick={openCreate} className="btn-primary"><IconPlus style={{ width: 16, height: 16 }} /> Add Employee</button>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {loading ? <div className="text-gray-500">Loading employees...</div> : (
        <DataTable columns={columns} rows={employees} emptyMessage="No employee records yet." renderActions={(r) => (
          <div className="flex gap-3 justify-end">
            <button onClick={() => openEdit(r)} className="btn-link">Edit</button>
            <button onClick={() => toggleActive(r)} className="btn-danger-link">{r.is_active ? 'Deactivate' : 'Activate'}</button>
          </div>
        )} />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Employee' : 'Add Employee'}>
        <form onSubmit={handleSubmit}>
          {formError && <div className="alert-error mb-3">{formError}</div>}
          <div className="mb-3">
            <label className="field-label">Link to Trainer</label>
            <select value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })} className="input-field" disabled={!!editing}>
              <option value="">Not linked to a trainer</option>
              {trainers.filter((t) => !linkedTrainerIds.has(t.id) || t.id === Number(form.trainerId)).map((t) => (
                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="field-label">Designation</label>
            <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="input-field" />
          </div>
          <div className="mb-3">
            <label className="field-label">Department</label>
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="input-field" />
          </div>
          <div className="mb-3">
            <label className="field-label">Date of Joining</label>
            <input type="date" value={form.dateOfJoining} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} className="input-field" required />
          </div>
          <div className="mb-3">
            <label className="field-label">Employment Type</label>
            <select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} className="input-field">
              {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="field-label">Base Salary (₹/month)</label>
            <input type="number" min="0" step="0.01" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} className="input-field" required />
          </div>
          <div className="mb-3">
            <label className="field-label">Per-Session Rate (₹, for trainers)</label>
            <input type="number" min="0" step="0.01" value={form.perSessionRate} onChange={(e) => setForm({ ...form, perSessionRate: e.target.value })} className="input-field" />
          </div>
          <div className="mb-3">
            <label className="field-label">Bank Account (last 4 digits)</label>
            <input value={form.bankAccountLast4} onChange={(e) => setForm({ ...form, bankAccountLast4: e.target.value })} maxLength={4} className="input-field" />
          </div>
          <button type="submit" className="btn-primary w-full mt-2">{editing ? 'Save Changes' : 'Add Employee'}</button>
        </form>
      </Modal>
    </div>
  );
}
