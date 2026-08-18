import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceApi } from '../api/attendance';
import { membersApi } from '../api/members';
import DataTable from '../components/DataTable';
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

  const columns = [
    { key: 'name', label: 'Member', render: (r) => `${r.first_name} ${r.last_name}` },
    { key: 'check_in_time', label: 'Check In', render: (r) => new Date(r.check_in_time).toLocaleTimeString() },
    { key: 'check_out_time', label: 'Check Out', render: (r) => (r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '—') },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Attendance</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Check In a Member</h2>
        {checkInError && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{checkInError}</div>}
        <form onSubmit={handleCheckIn} className="flex gap-2 items-end">
          <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="border rounded px-3 py-2 text-sm" required>
            <option value="" disabled>Select a member</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
          </select>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Check In</button>
        </form>
      </div>

      <div className="mb-4 flex gap-2 items-center">
        <label className="text-sm text-gray-600">Date:</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-3 py-2 text-sm" />
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {loading ? <div className="text-gray-500">Loading...</div> : (
        <DataTable columns={columns} rows={records} renderActions={(r) => (
          !r.check_out_time && <button onClick={() => handleCheckOut(r.id)} className="text-blue-600 text-sm hover:underline">Check Out</button>
        )} />
      )}
    </div>
  );
}
