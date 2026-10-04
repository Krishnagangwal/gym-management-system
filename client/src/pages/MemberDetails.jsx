import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { membersApi } from '../api/members';
import { membershipsApi } from '../api/memberships';
import { membershipPlansApi } from '../api/membershipPlans';
import { trainersApi } from '../api/trainers';
import { workoutPlansApi } from '../api/workoutPlans';
import { auditLogApi } from '../api/auditLog';
import Badge from '../components/Badge';
import DataTable from '../components/DataTable';
import AuditDiff from '../components/AuditDiff';
import {
  IconMail, IconPhone, IconCalendarCheck, IconIdCard, IconWhistle, IconDumbbell, IconUserCheck, IconHistory,
} from '../components/icons.jsx';
import { formatDate, formatTime, todayISO } from '../utils/formatDate';

const ACTION_TONE = { create: 'green', update: 'amber', delete: 'red' };

const STATUS_TONE = { active: 'green', expired: 'red' };

function initialsOf(first, last) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
}

export default function MemberDetails() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [member, setMember] = useState(null);
  const [history, setHistory] = useState([]);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [assignError, setAssignError] = useState('');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [trainer, setTrainer] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [trainerId, setTrainerId] = useState('');
  const [memberPlans, setMemberPlans] = useState([]);
  const [allPlans, setAllPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [login, setLogin] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [newInvoice, setNewInvoice] = useState(null);
  const [tab, setTab] = useState('overview');
  const [activity, setActivity] = useState(null);

  function loadHistory() {
    membershipsApi.history(token, id).then(setHistory).catch((err) => setError(err.message));
  }

  function loadLogin() {
    membersApi.getLogin(token, id).then(setLogin);
  }

  useEffect(() => {
    membersApi.get(token, id).then((m) => { setMember(m); setLoginEmail(m.email); }).catch((err) => setError(err.message));
    loadHistory();
    membershipPlansApi.list(token).then(setPlans).catch(() => {});
    trainersApi.memberTrainer(token, id).then(setTrainer);
    trainersApi.list(token).then(setTrainers).catch(() => {});
    workoutPlansApi.memberPlans(token, id).then(setMemberPlans).catch(() => {});
    workoutPlansApi.list(token).then(setAllPlans).catch(() => {});
    loadLogin();
    auditLogApi.forEntity(token, 'member', id).then(setActivity).catch(() => setActivity([]));
  }, [token, id]);

  async function handleCreateLogin(e) {
    e.preventDefault();
    setLoginError('');
    try {
      await membersApi.createLogin(token, id, { email: loginEmail, password: loginPassword });
      setLoginPassword('');
      loadLogin();
    } catch (err) {
      setLoginError(err.message);
    }
  }

  async function handleAssign(e) {
    e.preventDefault();
    setAssignError('');
    setNewInvoice(null);
    try {
      const result = await membershipsApi.assignOrRenew(token, id, { planId: Number(planId), startDate });
      setPlanId('');
      setNewInvoice(result.invoice);
      loadHistory();
    } catch (err) {
      setAssignError(err.message);
    }
  }

  async function handleAssignTrainer(e) {
    e.preventDefault();
    await trainersApi.assign(token, trainerId, id);
    trainersApi.memberTrainer(token, id).then(setTrainer);
  }

  async function handleAssignPlan(e) {
    e.preventDefault();
    await workoutPlansApi.assignToMember(token, id, selectedPlanId);
    workoutPlansApi.memberPlans(token, id).then(setMemberPlans);
  }

  if (error) return <div className="alert-error">{error}</div>;
  if (!member) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
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
        <div className="relative ml-auto flex flex-col items-end gap-2">
          <Badge tone={member.is_active ? 'green' : 'gray'} dot>{member.is_active ? 'Active' : 'Inactive'}</Badge>
          <span className="text-xs text-indigo-200/70">Joined {formatDate(member.join_date)}</span>
        </div>
      </div>

      <div className="mb-5 flex gap-2">
        <button onClick={() => setTab('overview')} className={`tab-btn ${tab === 'overview' ? 'tab-btn-active' : 'tab-btn-inactive'}`}>Overview</button>
        <button onClick={() => setTab('activity')} className={`tab-btn inline-flex items-center gap-2 ${tab === 'activity' ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
          Activity {activity && <span className="opacity-70">({activity.length})</span>}
        </button>
      </div>

      {tab === 'activity' ? (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <IconHistory className="w-4 h-4 text-slate-600" style={{ width: 16, height: 16 }} />
            </div>
            <h2 className="font-semibold text-gray-900">Change History</h2>
          </div>
          {!activity ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : (
            <DataTable
              columns={[
                { key: 'created_at', label: 'When', render: (r) => <span className="text-gray-600">{formatDate(r.created_at)} {formatTime(r.created_at)}</span> },
                { key: 'user_name', label: 'By', render: (r) => r.user_name || <span className="text-gray-300">System</span> },
                { key: 'action', label: 'Action', render: (r) => <Badge tone={ACTION_TONE[r.action] || 'gray'} dot>{r.action}</Badge> },
              ]}
              rows={activity}
              emptyMessage="No recorded changes for this member yet."
              renderExpanded={(row) => <AuditDiff row={row} />}
            />
          )}
        </div>
      ) : (
      <>
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <IconIdCard className="w-4 h-4 text-indigo-600" style={{ width: 16, height: 16 }} />
          </div>
          <h2 className="font-semibold text-gray-900">Assign / Renew Membership</h2>
        </div>
        {assignError && <div className="alert-error mb-3">{assignError}</div>}
        {newInvoice && (
          <div className="mb-3 flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-sm">
            <span>Invoice <strong className="font-mono">{newInvoice.invoice_number}</strong> generated (₹{newInvoice.total}).</span>
            {user?.role === 'admin' && <Link to={`/invoices/${newInvoice.id}`} className="btn-link flex-shrink-0">View &amp; Print</Link>}
          </div>
        )}
        <form onSubmit={handleAssign} className="flex gap-2 items-end flex-wrap">
          <div>
            <label className="field-label text-xs">Plan</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="input-field" required>
              <option value="" disabled>Select a plan</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>)}
            </select>
          </div>
          <div>
            <label className="field-label text-xs">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" required />
          </div>
          <button type="submit" className="btn-primary">Assign / Renew</button>
        </form>
      </div>

      {user?.role === 'admin' && (
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <IconUserCheck className="w-4 h-4 text-violet-600" style={{ width: 16, height: 16 }} />
            </div>
            <h2 className="font-semibold text-gray-900">Portal Access</h2>
          </div>
          {login ? (
            <p className="text-sm text-gray-600">
              Portal login active for <strong className="text-gray-900">{login.email}</strong>.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-3">This member doesn't have portal access yet.</p>
              {loginError && <div className="alert-error mb-3">{loginError}</div>}
              <form onSubmit={handleCreateLogin} className="flex gap-2 items-end flex-wrap">
                <div>
                  <label className="field-label text-xs">Login Email</label>
                  <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="input-field" required />
                </div>
                <div>
                  <label className="field-label text-xs">Initial Password</label>
                  <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="input-field" minLength={8} required />
                </div>
                <button type="submit" className="btn-secondary flex-shrink-0">Create Portal Login</button>
              </form>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <IconWhistle className="w-4 h-4 text-amber-600" style={{ width: 16, height: 16 }} />
            </div>
            <h2 className="font-semibold text-gray-900">Trainer</h2>
          </div>
          {trainer ? (
            <p className="text-sm text-gray-600 mb-2">Currently assigned: <strong className="text-gray-900">{trainer.first_name} {trainer.last_name}</strong> · <Badge tone="violet">{trainer.specialization}</Badge></p>
          ) : (
            <p className="text-sm text-gray-400 mb-2">No trainer assigned.</p>
          )}
          <form onSubmit={handleAssignTrainer} className="flex gap-2 items-end mt-2">
            <select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} className="input-field" required>
              <option value="" disabled>Select a trainer</option>
              {trainers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
            <button type="submit" className="btn-secondary flex-shrink-0">Assign</button>
          </form>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <IconDumbbell className="w-4 h-4 text-emerald-600" style={{ width: 16, height: 16 }} />
            </div>
            <h2 className="font-semibold text-gray-900">Workout Plans</h2>
          </div>
          {memberPlans.length === 0 ? <p className="text-sm text-gray-400 mb-2">No workout plan assigned.</p> : (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {memberPlans.map((p) => <Badge key={p.assignment_id} tone="indigo">{p.name} · {p.difficulty_level}</Badge>)}
            </div>
          )}
          <form onSubmit={handleAssignPlan} className="flex gap-2 items-end">
            <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="input-field" required>
              <option value="" disabled>Select a workout plan</option>
              {allPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="submit" className="btn-secondary flex-shrink-0">Assign</button>
          </form>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
            <IconCalendarCheck className="w-4 h-4 text-sky-600" style={{ width: 16, height: 16 }} />
          </div>
          <h2 className="font-semibold text-gray-900">Membership History</h2>
        </div>
        {history.length === 0 ? <p className="text-sm text-gray-400">No memberships yet.</p> : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="py-2 px-6 font-semibold">Plan</th>
                  <th className="py-2 px-2 font-semibold">Start</th>
                  <th className="py-2 px-2 font-semibold">End</th>
                  <th className="py-2 px-2 font-semibold">Status</th>
                  {user?.role === 'admin' && <th className="py-2 px-6 font-semibold">Invoice</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="py-3 px-6 font-medium text-gray-800">{h.plan_name}</td>
                    <td className="py-3 px-2 text-gray-600">{formatDate(h.start_date)}</td>
                    <td className="py-3 px-2 text-gray-600">{formatDate(h.end_date)}</td>
                    <td className="py-3 px-2"><Badge tone={STATUS_TONE[h.status] || 'gray'} dot>{h.status}</Badge></td>
                    {user?.role === 'admin' && (
                      <td className="py-3 px-6">
                        {h.invoice_id ? <Link to={`/invoices/${h.invoice_id}`} className="btn-link">{h.invoice_number}</Link> : <span className="text-gray-300">—</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
