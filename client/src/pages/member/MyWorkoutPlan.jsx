import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { meApi } from '../../api/me';
import Badge from '../../components/Badge';
import { IconDumbbell, IconBox } from '../../components/icons.jsx';

const DIFFICULTY_TONE = { beginner: 'green', intermediate: 'amber', advanced: 'red' };

export default function MyWorkoutPlan() {
  const { token } = useAuth();
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    meApi.workoutPlans(token).then(setPlans).catch((err) => setError(err.message));
  }, [token]);

  if (error) return <div className="alert-error">{error}</div>;
  if (!plans) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconDumbbell style={{ width: 22, height: 22 }} />
        </div>
        <h1 className="page-title">My Workout Plan</h1>
      </div>

      {plans.length === 0 ? (
        <div className="card py-16 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
            <IconBox className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">No workout plan assigned yet. Ask your trainer to assign one.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {plans.map((plan) => (
            <div key={plan.assignment_id} className="card p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="font-semibold text-gray-900">{plan.name}</h2>
                  {plan.description && <p className="text-sm text-gray-400 mt-0.5">{plan.description}</p>}
                </div>
                <Badge tone={DIFFICULTY_TONE[plan.difficulty_level] || 'gray'}>{plan.difficulty_level}</Badge>
              </div>

              {plan.exercises.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No exercises added to this plan yet.</p>
              ) : (
                <div className="space-y-2">
                  {plan.exercises.map((ex) => (
                    <div key={ex.id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full w-24 text-center flex-shrink-0">
                        {ex.day_of_week.slice(0, 3)}
                      </span>
                      <span className="font-medium text-gray-800 flex-1">{ex.exercise_name}</span>
                      <span className="text-xs text-gray-400">{ex.muscle_group}</span>
                      <span className="text-sm text-gray-500">{ex.sets} × {ex.reps}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
