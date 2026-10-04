import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceApi } from '../api/attendance';
import { membersApi } from '../api/members';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import { IconCalendarCheck } from '../components/icons.jsx';
import { todayISO } from '../utils/formatDate';

export default function Attendance() {
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState('');
  const [checkInError, setCheckInError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    attendanceApi.list(token, date ? { date } : {})
      .then(setRecords)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token, date]);
  useEffect(() => { membersApi.list(token, { isActive: true }).then(setMembers).catch(() => {}); }, [token]);

  async function handleCheckIn(e) {
    e.preventDefault();
    setCheckInError('');
    try {
      await attendanceApi.checkIn(token, Number(selectedMember));
      setSelectedMember('');
      load();
    } catch (err) {
      setCheckInError(err.message);
    }
  }

  async function handleCheckOut(id) {
    await attendanceApi.checkOut(token, id);
    load();
  }

  const checkedIn = records.filter((r) => !r.check_out_time).length;

  const columns = [
    { key: 'name', label: 'Member', render: (r) => <span className="font-medium text-gray-800">{r.first_name} {r.last_name}</span> },
    { key: 'check_in_time', label: 'Check In', render: (r) => new Date(r.check_in_time).toLocaleTimeString() },
    { key: 'check_out_time', label: 'Check Out', render: (r) => (r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : <Badge tone="green" dot>In Gym</Badge>) },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconCalendarCheck style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="text-sm text-gray-400">{checkedIn} currently checked in</p>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Check In a Member</h2>
        {checkInError && <div className="alert-error mb-3">{checkInError}</div>}
        <form onSubmit={handleCheckIn} className="flex gap-2 items-end">
          <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="input-field max-w-xs" required>
            <option value="" disabled>Select a member</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
          </select>
          <button type="submit" className="btn-primary">Check In</button>
        </form>
      </div>

      <div className="mb-4 flex gap-2 items-center">
        <label className="text-sm text-gray-500 font-medium">Date:</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field max-w-fit" />
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {loading ? <div className="text-gray-500">Loading...</div> : (
        <DataTable columns={columns} rows={records} renderActions={(r) => (
          !r.check_out_time && <button onClick={() => handleCheckOut(r.id)} className="btn-link">Check Out</button>
        )} />
      )}
    </div>
  );
}
