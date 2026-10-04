import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { workoutPlansApi } from '../api/workoutPlans';
import { exercisesApi } from '../api/exercises';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { IconDumbbell, IconPlus, IconChevronRight } from '../components/icons.jsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DIFFICULTY_TONE = { beginner: 'green', intermediate: 'amber', advanced: 'red' };

export default function WorkoutPlans() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [plans, setPlans] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState('');
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', description: '', difficultyLevel: 'beginner' });
  const [exerciseFormOpen, setExerciseFormOpen] = useState(false);
  const [exerciseForm, setExerciseForm] = useState({ exerciseId: '', dayOfWeek: 'Monday', sets: 3, reps: 10 });

  function loadPlans() {
    workoutPlansApi.list(token).then(setPlans).catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadPlans();
    exercisesApi.list(token).then(setExercises).catch(() => {});
  }, [token]);

  async function openPlan(planSummary) {
    const full = await workoutPlansApi.get(token, planSummary.id);
    setSelectedPlan(full);
  }

  async function handleCreatePlan(e) {
    e.preventDefault();
    const created = await workoutPlansApi.create(token, planForm);
    setPlanFormOpen(false);
    setPlanForm({ name: '', description: '', difficultyLevel: 'beginner' });
    loadPlans();
    openPlan(created);
  }

  async function handleAddExercise(e) {
    e.preventDefault();
    await workoutPlansApi.addExercise(token, selectedPlan.id, {
      ...exerciseForm,
      exerciseId: Number(exerciseForm.exerciseId),
      sets: Number(exerciseForm.sets),
      reps: Number(exerciseForm.reps),
    });
    setExerciseFormOpen(false);
    openPlan(selectedPlan);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <IconDumbbell style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="page-title">Workout Plans</h1>
            <p className="text-sm text-gray-400">{plans.length} plans built</p>
          </div>
        </div>
        {isAdmin && <button onClick={() => setPlanFormOpen(true)} className="btn-primary"><IconPlus style={{ width: 16, height: 16 }} /> New Plan</button>}
      </div>
      {error && <div className="alert-error mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 card p-4">
          <h2 className="font-semibold text-gray-900 mb-3 px-1">Plans</h2>
          <div className="space-y-1.5">
            {plans.map((p) => {
              const active = selectedPlan?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => openPlan(p)}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-3 rounded-xl text-left transition ${active ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : 'hover:bg-gray-50'}`}
                >
                  <div className="min-w-0">
                    <div className={`font-medium text-sm truncate ${active ? 'text-indigo-700' : 'text-gray-800'}`}>{p.name}</div>
                    <Badge tone={DIFFICULTY_TONE[p.difficulty_level] || 'gray'}>{p.difficulty_level}</Badge>
                  </div>
                  <IconChevronRight className={`w-4 h-4 flex-shrink-0 ${active ? 'text-indigo-500' : 'text-gray-300'}`} style={{ width: 16, height: 16 }} />
                </button>
              );
            })}
            {plans.length === 0 && <p className="text-sm text-gray-400 px-1 py-4">No plans yet.</p>}
          </div>
        </div>

        <div className="lg:col-span-2 card p-5">
          {!selectedPlan ? (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                <IconDumbbell className="w-6 h-6 text-gray-400" style={{ width: 24, height: 24 }} />
              </div>
              <p className="text-sm text-gray-500">Select a plan to view its exercises.</p>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedPlan.name}</h2>
                  <Badge tone={DIFFICULTY_TONE[selectedPlan.difficulty_level] || 'gray'}>{selectedPlan.difficulty_level}</Badge>
                </div>
                {isAdmin && <button onClick={() => setExerciseFormOpen(true)} className="btn-link">+ Add Exercise</button>}
              </div>

              {selectedPlan.exercises.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No exercises added to this plan yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedPlan.exercises.map((ex) => (
                    <div key={ex.id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full w-24 text-center flex-shrink-0">
                        {ex.day_of_week.slice(0, 3)}
                      </span>
                      <span className="font-medium text-gray-800 flex-1">{ex.exercise_name}</span>
                      <span className="text-sm text-gray-500">{ex.sets} × {ex.reps}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal open={planFormOpen} onClose={() => setPlanFormOpen(false)} title="New Workout Plan">
        <form onSubmit={handleCreatePlan}>
          <div className="mb-3">
            <label className="field-label">Name</label>
            <input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} className="input-field" required />
          </div>
          <div className="mb-3">
            <label className="field-label">Difficulty</label>
            <select value={planForm.difficultyLevel} onChange={(e) => setPlanForm({ ...planForm, difficultyLevel: e.target.value })} className="input-field">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <button type="submit" className="btn-primary w-full mt-2">Create Plan</button>
        </form>
      </Modal>

      <Modal open={exerciseFormOpen} onClose={() => setExerciseFormOpen(false)} title="Add Exercise to Plan">
        <form onSubmit={handleAddExercise}>
          <div className="mb-3">
            <label className="field-label">Exercise</label>
            <select value={exerciseForm.exerciseId} onChange={(e) => setExerciseForm({ ...exerciseForm, exerciseId: e.target.value })} className="input-field" required>
              <option value="" disabled>Select an exercise</option>
              {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="field-label">Day</label>
            <select value={exerciseForm.dayOfWeek} onChange={(e) => setExerciseForm({ ...exerciseForm, dayOfWeek: e.target.value })} className="input-field">
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="field-label">Sets</label>
              <input type="number" min="1" value={exerciseForm.sets} onChange={(e) => setExerciseForm({ ...exerciseForm, sets: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="field-label">Reps</label>
              <input type="number" min="1" value={exerciseForm.reps} onChange={(e) => setExerciseForm({ ...exerciseForm, reps: e.target.value })} className="input-field" required />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full mt-2">Add Exercise</button>
        </form>
      </Modal>
    </div>
  );
}
