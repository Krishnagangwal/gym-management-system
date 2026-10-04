import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { employeesApi } from '../api/employees';
import { staffAttendanceApi } from '../api/staffAttendance';
import Modal from '../components/Modal';
import { IconCalendarCheck, IconPlus } from '../components/icons.jsx';
import { todayISO } from '../utils/formatDate';

const STATUS_STYLE = {
  present: 'bg-emerald-500 text-white',
  half_day: 'bg-amber-400 text-white',
  absent: 'bg-rose-500 text-white',
  leave: 'bg-sky-400 text-white',
};
const STATUS_LABEL = { present: 'P', half_day: 'H', absent: 'A', leave: 'L' };
const STATUSES = ['present', 'half_day', 'absent', 'leave'];

function employeeName(e) {
  return e.trainer_first_name ? `${e.trainer_first_name} ${e.trainer_last_name}` : e.employee_code;
}

export default function StaffAttendance() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [grid, setGrid] = useState(null);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: '', date: todayISO(), status: 'present', checkIn: '', checkOut: '' });
  const [formError, setFormError] = useState('');

  function loadGrid() {
    staffAttendanceApi.grid(token, year, month).then(setGrid).catch((err) => setError(err.message));
  }

  useEffect(() => { employeesApi.list(token).then(setEmployees).catch(() => {}); }, [token]);
  useEffect(loadGrid, [token, year, month]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const cellFor = useMemo(() => {
    const map = new Map();
    (grid || []).forEach((row) => {
      const day = new Date(row.date).getUTCDate();
      map.set(`${row.employee_id}-${day}`, row.status);
    });
    return map;
  }, [grid]);

  async function handleMark(e) {
    e.preventDefault();
    setFormError('');
    try {
      await staffAttendanceApi.mark(token, { ...form, employeeId: Number(form.employeeId) });
      setFormOpen(false);
      loadGrid();
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <IconCalendarCheck style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="page-title">Staff Attendance</h1>
            <p className="text-sm text-gray-400">Monthly grid for all employees</p>
          </div>
        </div>
        <button onClick={() => { setForm({ employeeId: employees[0]?.id || '', date: todayISO(), status: 'present', checkIn: '', checkOut: '' }); setFormError(''); setFormOpen(true); }} className="btn-primary">
          <IconPlus style={{ width: 16, height: 16 }} /> Mark Attendance
        </button>
      </div>

      <div className="card p-4 mb-5 flex items-end gap-3">
        <div>
          <label className="field-label text-xs">Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-field">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString('en-IN', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label text-xs">Year</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-field w-24" />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 ml-4">
          {STATUSES.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${STATUS_STYLE[s]}`}>{STATUS_LABEL[s]}</span>
              {s.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50/80">Employee</th>
                {days.map((d) => <th key={d} className="w-7 py-3 text-center font-semibold text-gray-400">{d}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap sticky left-0 bg-white">{employeeName(emp)}</td>
                  {days.map((d) => {
                    const status = cellFor.get(`${emp.id}-${d}`);
                    return (
                      <td key={d} className="text-center py-2">
                        {status ? (
                          <span className={`inline-flex w-5 h-5 rounded items-center justify-center text-[10px] font-bold ${STATUS_STYLE[status]}`}>
                            {STATUS_LABEL[status]}
                          </span>
                        ) : <span className="text-gray-200">·</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={days.length + 1} className="text-center py-10 text-gray-400">No employees yet — add one on the Employees page.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Mark Attendance">
        <form onSubmit={handleMark}>
          {formError && <div className="alert-error mb-3">{formError}</div>}
          <div className="mb-3">
            <label className="field-label">Employee</label>
            <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="input-field" required>
              <option value="" disabled>Select an employee</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{employeeName(e)}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="field-label">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
          </div>
          <div className="mb-3">
            <label className="field-label">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          {(form.status === 'present' || form.status === 'half_day') && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="field-label">Check In</label>
                <input type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="field-label">Check Out</label>
                <input type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} className="input-field" />
              </div>
            </div>
          )}
          <button type="submit" className="btn-primary w-full mt-2">Save</button>
        </form>
      </Modal>
    </div>
  );
}
