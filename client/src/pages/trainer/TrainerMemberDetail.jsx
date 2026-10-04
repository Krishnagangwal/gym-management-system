import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { trainerPortalApi } from '../../api/trainerPortal';
import { workoutPlansApi } from '../../api/workoutPlans';
import Badge from '../../components/Badge';
import DataTable from '../../components/DataTable';
import { IconChevronRight, IconMail, IconPhone } from '../../components/icons.jsx';
import { formatDate, formatTime } from '../../utils/formatDate';
import { CHART_GRID_STROKE, CHART_TICK_STYLE, CHART_TOOLTIP_STYLE } from '../../utils/chartTheme';

const STATUS_TONE = { active: 'green', expired: 'red' };

function initialsOf(first, last) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
}

export default function TrainerMemberDetail() {
  const { memberId } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [allPlans, setAllPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [assignError, setAssignError] = useState('');

  function load() {
    trainerPortalApi.myMember(token, memberId).then((d) => { setData(d); setNotes(d.trainerNotes || ''); }).catch((err) => setError(err.message));
  }

  useEffect(load, [token, memberId]);
  useEffect(() => { workoutPlansApi.list(token).then(setAllPlans).catch(() => {}); }, [token]);

  async function saveNotes() {
    setNotesSaving(true);
    setNotesSaved(false);
    try {
      await trainerPortalApi.updateNotes(token, memberId, notes);
      setNotesSaved(true);
    } finally {
      setNotesSaving(false);
    }
  }

  async function handleAssignPlan(e) {
    e.preventDefault();
    setAssignError('');
    try {
      await trainerPortalApi.assignWorkoutPlan(token, memberId, Number(selectedPlanId));
      setSelectedPlanId('');
      load();
    } catch (err) {
      setAssignError(err.message);
    }
  }

  if (error) return <div className="alert-error">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading...</div>;

  const { member, membershipHistory, attendance, progress, workoutLogs, workoutPlans } = data;
  const progressChart = progress.map((p) => ({
    date: formatDate(p.date),
    weight: p.weight != null ? Number(p.weight) : null,
  }));

  const historyColumns = [
    { key: 'plan_name', label: 'Plan', render: (r) => <Badge tone="indigo">{r.plan_name}</Badge> },
    { key: 'start_date', label: 'Start', render: (r) => formatDate(r.start_date) },
    { key: 'end_date', label: 'End', render: (r) => formatDate(r.end_date) },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.is_expired ? 'expired' : 'active']} dot>{r.is_expired ? 'Expired' : 'Active'}</Badge> },
  ];

  const attendanceColumns = [
    { key: 'check_in_time', label: 'Date', render: (r) => formatDate(r.check_in_time) },
    { key: 'time', label: 'Check In', render: (r) => formatTime(r.check_in_time) },
    { key: 'check_out_time', label: 'Check Out', render: (r) => r.check_out_time ? formatTime(r.check_out_time) : '—' },
  ];

  const logColumns = [
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'exercise_name', label: 'Exercise' },
    { key: 'sets_done', label: 'Sets × Reps', render: (r) => `${r.sets_done} × ${r.reps_done}` },
    { key: 'weight_used', label: 'Weight', render: (r) => r.weight_used ? `${r.weight_used} kg` : '—' },
  ];

  return (
    <div>
      <div className="mb-6 print:hidden">
        <Link to="/trainer/members" className="btn-link inline-flex items-center gap-1">
          <IconChevronRight style={{ width: 14, height: 14, transform: 'rotate(180deg)' }} /> Back to My Members
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 text-white p-6 mb-6 shadow-lg flex items-center gap-4">
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-xl font-bold flex-shrink-0">
          {initialsOf(member.first_name, member.last_name)}
        </div>
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight">{member.first_name} {member.last_name}</h1>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-indigo-200/80">
            <span className="inline-flex items-center gap-1.5"><IconMail style={{ width: 14, height: 14 }} /> {member.email}</span>
            <span className="inline-flex items-center gap-1.5"><IconPhone style={{ width: 14, height: 14 }} /> {member.phone}</span>
          </div>
        </div>
        <div className="relative ml-auto">
          <Badge tone={member.is_active ? 'green' : 'gray'} dot>{member.is_active ? 'Active' : 'Inactive'}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Private Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
            className="input-field"
            rows={5}
            placeholder="Only visible to you — training cues, injuries to watch for, goals discussed..."
          />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={saveNotes} disabled={notesSaving} className="btn-secondary">{notesSaving ? 'Saving...' : 'Save Notes'}</button>
            {notesSaved && <span className="text-xs text-emerald-600">Saved</span>}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Assign Workout Plan</h2>
          {workoutPlans.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {workoutPlans.map((p) => <Badge key={p.assignment_id} tone="indigo">{p.name} · {p.difficulty_level}</Badge>)}
            </div>
          )}
          {assignError && <div className="alert-error mb-3">{assignError}</div>}
          <form onSubmit={handleAssignPlan} className="flex gap-2 items-end">
            <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="input-field" required>
              <option value="" disabled>Select a workout plan</option>
              {allPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="submit" className="btn-secondary flex-shrink-0">Assign</button>
          </form>
        </div>
      </div>

      <div className="card p-5 mb-5">
        <h3 className="font-semibold text-gray-900 mb-1">Weight Progress</h3>
        <p className="text-xs text-gray-400 mb-4">{progress.length} logged entries</p>
        {progress.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No progress entries logged yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={progressChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} />
              <YAxis tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} domain={['auto', 'auto']} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="weight" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Membership History</h3>
          <DataTable columns={historyColumns} rows={membershipHistory} emptyMessage="No membership history." />
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Workout Logs</h3>
          <DataTable columns={logColumns} rows={workoutLogs.slice(0, 10)} emptyMessage="No workouts logged yet." />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Attendance</h3>
        <DataTable columns={attendanceColumns} rows={attendance.slice(0, 10)} emptyMessage="No attendance recorded." />
      </div>
    </div>
  );
}
