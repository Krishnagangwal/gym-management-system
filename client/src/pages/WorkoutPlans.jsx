import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { workoutPlansApi } from '../api/workoutPlans';
import { exercisesApi } from '../api/exercises';
import Modal from '../components/Modal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
        <h1 className="text-2xl font-bold">Workout Plans</h1>
        {isAdmin && <button onClick={() => setPlanFormOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ New Plan</button>}
      </div>
      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-2">Plans</h2>
          <ul className="text-sm divide-y">
            {plans.map((p) => (
              <li key={p.id}>
                <button onClick={() => openPlan(p)} className="w-full text-left py-2 hover:text-blue-600">
                  {p.name} <span className="text-gray-400">({p.difficulty_level})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-2 bg-white rounded-lg shadow p-4">
          {!selectedPlan ? (
            <p className="text-sm text-gray-500">Select a plan to view its exercises.</p>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold">{selectedPlan.name}</h2>
                {isAdmin && <button onClick={() => setExerciseFormOpen(true)} className="text-blue-600 text-sm hover:underline">+ Add Exercise</button>}
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr><th className="py-1">Day</th><th>Exercise</th><th>Sets</th><th>Reps</th></tr>
                </thead>
                <tbody>
                  {selectedPlan.exercises.map((ex) => (
                    <tr key={ex.id} className="border-t">
                      <td className="py-1">{ex.day_of_week}</td><td>{ex.exercise_name}</td><td>{ex.sets}</td><td>{ex.reps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={planFormOpen} onClose={() => setPlanFormOpen(false)} title="New Workout Plan">
        <form onSubmit={handleCreatePlan}>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select value={planForm.difficultyLevel} onChange={(e) => setPlanForm({ ...planForm, difficultyLevel: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mt-2">Create Plan</button>
        </form>
      </Modal>

      <Modal open={exerciseFormOpen} onClose={() => setExerciseFormOpen(false)} title="Add Exercise to Plan">
        <form onSubmit={handleAddExercise}>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Exercise</label>
            <select value={exerciseForm.exerciseId} onChange={(e) => setExerciseForm({ ...exerciseForm, exerciseId: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required>
              <option value="" disabled>Select an exercise</option>
              {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
            <select value={exerciseForm.dayOfWeek} onChange={(e) => setExerciseForm({ ...exerciseForm, dayOfWeek: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sets</label>
              <input type="number" min="1" value={exerciseForm.sets} onChange={(e) => setExerciseForm({ ...exerciseForm, sets: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reps</label>
              <input type="number" min="1" value={exerciseForm.reps} onChange={(e) => setExerciseForm({ ...exerciseForm, reps: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mt-2">Add Exercise</button>
        </form>
      </Modal>
    </div>
  );
}
