import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { meApi } from '../../api/me';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import { IconDumbbell, IconTarget } from '../../components/icons.jsx';

export default function TodaysWorkout() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [completionRate, setCompletionRate] = useState(null);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(null);

  function load() {
    meApi.todaysWorkout(token).then(setData).catch((err) => setError(err.message));
    meApi.workoutLogs(token).then((r) => setCompletionRate(r.weeklyCompletionRate)).catch(() => {});
  }

  useEffect(load, [token]);

  async function markComplete(ex) {
    setMarking(ex.id);
    try {
      await meApi.logWorkout(token, { planId: ex.plan_id, exerciseId: ex.exercise_id, setsDone: ex.sets, repsDone: ex.reps });
      load();
    } finally {
      setMarking(null);
    }
  }

  if (error) return <div className="alert-error">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconDumbbell style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <h1 className="page-title">Today's Workout</h1>
          <p className="text-sm text-gray-400">{data.day}</p>
        </div>
      </div>

      {completionRate != null && (
        <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
          <StatCard label="Weekly Completion" value={`${completionRate}%`} icon={IconTarget} tone="emerald" />
          <StatCard label="Exercises Today" value={data.exercises.length} icon={IconDumbbell} tone="indigo" />
        </div>
      )}

      {data.exercises.length === 0 ? (
        <div className="card py-16 text-center text-gray-500 text-sm">No exercises scheduled for today. Rest day!</div>
      ) : (
        <div className="space-y-2.5">
          {data.exercises.map((ex) => (
            <div key={ex.id} className={`card p-4 flex items-center gap-4 ${ex.completed ? 'opacity-70' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-gray-800">{ex.exercise_name}</span>
                  {ex.plan_name && <Badge tone="indigo">{ex.plan_name}</Badge>}
                </div>
                <p className="text-xs text-gray-400">{ex.muscle_group} · {ex.sets} sets × {ex.reps} reps</p>
              </div>
              {ex.completed ? (
                <Badge tone="green" dot>Completed</Badge>
              ) : (
                <button onClick={() => markComplete(ex)} disabled={marking === ex.id} className="btn-secondary flex-shrink-0">
                  {marking === ex.id ? 'Saving...' : 'Mark Complete'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
