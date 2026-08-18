import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { membersApi } from '../api/members';
import { membershipsApi } from '../api/memberships';
import { membershipPlansApi } from '../api/membershipPlans';
import { trainersApi } from '../api/trainers';
import { formatDate, todayISO } from '../utils/formatDate';

export default function MemberDetails() {
  const { id } = useParams();
  const { token } = useAuth();
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

  function loadHistory() {
    membershipsApi.history(token, id).then(setHistory).catch((err) => setError(err.message));
  }

  useEffect(() => {
    membersApi.get(token, id).then(setMember).catch((err) => setError(err.message));
    loadHistory();
    membershipPlansApi.list(token).then(setPlans).catch(() => {});
    trainersApi.memberTrainer(token, id).then(setTrainer);
    trainersApi.list(token).then(setTrainers).catch(() => {});
  }, [token, id]);

  async function handleAssign(e) {
    e.preventDefault();
    setAssignError('');
    try {
      await membershipsApi.assignOrRenew(token, id, { planId: Number(planId), startDate });
      setPlanId('');
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

  if (error) return <div className="bg-red-100 text-red-700 px-4 py-3 rounded">{error}</div>;
  if (!member) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{member.first_name} {member.last_name}</h1>
      <div className="bg-white rounded-lg shadow p-6 grid grid-cols-2 gap-4 text-sm mb-6">
        <div><span className="text-gray-500">Email</span><div>{member.email}</div></div>
        <div><span className="text-gray-500">Phone</span><div>{member.phone}</div></div>
        <div><span className="text-gray-500">Join Date</span><div>{formatDate(member.join_date)}</div></div>
        <div><span className="text-gray-500">Status</span><div>{member.is_active ? 'Active' : 'Inactive'}</div></div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold mb-3">Assign / Renew Membership</h2>
        {assignError && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{assignError}</div>}
        <form onSubmit={handleAssign} className="flex gap-2 items-end flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Plan</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="border rounded px-3 py-2 text-sm" required>
              <option value="" disabled>Select a plan</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded px-3 py-2 text-sm" required />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Assign / Renew</button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-semibold mb-3">Trainer</h2>
        {trainer ? (
          <p className="text-sm">Currently assigned: <strong>{trainer.first_name} {trainer.last_name}</strong> ({trainer.specialization})</p>
        ) : (
          <p className="text-sm text-gray-500 mb-2">No trainer assigned.</p>
        )}
        <form onSubmit={handleAssignTrainer} className="flex gap-2 items-end mt-2">
          <select value={trainerId} onChange={(e) => setTrainerId(e.target.value)} className="border rounded px-3 py-2 text-sm" required>
            <option value="" disabled>Select a trainer</option>
            {trainers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
          </select>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Assign Trainer</button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-3">Membership History</h2>
        {history.length === 0 ? <p className="text-sm text-gray-500">No memberships yet.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr><th className="py-1">Plan</th><th>Start</th><th>End</th><th>Status</th></tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t">
                  <td className="py-1">{h.plan_name}</td><td>{formatDate(h.start_date)}</td><td>{formatDate(h.end_date)}</td><td>{h.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
