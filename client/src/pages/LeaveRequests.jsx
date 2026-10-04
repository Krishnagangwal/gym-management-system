import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { employeesApi } from '../api/employees';
import { leaveRequestsApi } from '../api/leaveRequests';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { IconClock, IconPlus } from '../components/icons.jsx';
import { formatDate, todayISO } from '../utils/formatDate';

const STATUS_TONE = { pending: 'amber', approved: 'green', rejected: 'red' };
const LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid'];
const emptyForm = { employeeId: '', leaveType: 'casual', fromDate: todayISO(), toDate: todayISO(), days: 1, reason: '' };

function employeeName(e) {
  return e.trainer_first_name ? `${e.trainer_first_name} ${e.trainer_last_name}` : e.employee_code;
}

export default function LeaveRequests() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [confirmation, setConfirmation] = useState('');

  function load() {
    setLoading(true);
    leaveRequestsApi.list(token).then(setRequests).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [token]);
  useEffect(() => { employeesApi.list(token).then(setEmployees).catch(() => {}); }, [token]);

  function openApply() {
    setForm({ ...emptyForm, employeeId: employees[0]?.id || '' });
    setFormError('');
    setConfirmation('');
    setFormOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      await leaveRequestsApi.apply(token, { ...form, employeeId: Number(form.employeeId), days: Number(form.days) });
      setFormOpen(false);
      setConfirmation('Leave request submitted for admin approval.');
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  const columns = [
    { key: 'employee', label: 'Employee', render: (r) => <span className="font-medium text-gray-800">{r.first_name ? `${r.first_name} ${r.last_name}` : r.employee_code}</span> },
    { key: 'leave_type', label: 'Type', render: (r) => <Badge tone="violet">{r.leave_type}</Badge> },
    { key: 'from_date', label: 'From', render: (r) => formatDate(r.from_date) },
    { key: 'to_date', label: 'To', render: (r) => formatDate(r.to_date) },
    { key: 'days', label: 'Days' },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status] || 'gray'} dot>{r.status}</Badge> },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <IconClock style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="page-title">Leave Requests</h1>
            <p className="text-sm text-gray-400">Applications route through Approvals for admin review</p>
          </div>
        </div>
        <button onClick={openApply} className="btn-primary"><IconPlus style={{ width: 16, height: 16 }} /> Apply for Leave</button>
      </div>

      {confirmation && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-sm">{confirmation}</div>}
      {error && <div className="alert-error mb-4">{error}</div>}
      {loading ? <div className="text-gray-500">Loading leave requests...</div> : (
        <DataTable columns={columns} rows={requests} emptyMessage="No leave requests yet." />
      )}

      <p className="text-xs text-gray-400 mt-3">
        Pending requests can be approved or rejected on the <Link to="/approvals" className="btn-link">Approvals</Link> page.
      </p>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Apply for Leave">
        <form onSubmit={handleSubmit}>
          {formError && <div className="alert-error mb-3">{formError}</div>}
          <div className="mb-3">
            <label className="field-label">Employee</label>
            <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="input-field" required>
              <option value="" disabled>Select an employee</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{employeeName(e)}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="field-label">Leave Type</label>
            <select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="input-field">
              {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="field-label">From</label>
              <input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="field-label">To</label>
              <input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div className="mb-3">
            <label className="field-label">Days</label>
            <input type="number" min="1" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} className="input-field" required />
          </div>
          <div className="mb-3">
            <label className="field-label">Reason</label>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="input-field" />
          </div>
          <button type="submit" className="btn-primary w-full mt-2">Submit</button>
        </form>
      </Modal>
    </div>
  );
}
