import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { exercisesApi } from '../api/exercises';
import Modal from '../components/Modal';
import { IconBox, IconDumbbell, IconFlame, IconPlus } from '../components/icons.jsx';

const emptyForm = { name: '', description: '', muscleGroup: '' };

const MUSCLE_STYLES = {
  chest: { gradient: 'from-rose-400 to-rose-600', badge: 'bg-rose-50 text-rose-700' },
  back: { gradient: 'from-indigo-400 to-indigo-600', badge: 'bg-indigo-50 text-indigo-700' },
  legs: { gradient: 'from-emerald-400 to-emerald-600', badge: 'bg-emerald-50 text-emerald-700' },
  shoulders: { gradient: 'from-amber-400 to-amber-600', badge: 'bg-amber-50 text-amber-700' },
  arms: { gradient: 'from-violet-400 to-violet-600', badge: 'bg-violet-50 text-violet-700' },
  core: { gradient: 'from-sky-400 to-sky-600', badge: 'bg-sky-50 text-sky-700' },
};
const DEFAULT_STYLE = { gradient: 'from-slate-400 to-slate-600', badge: 'bg-slate-100 text-slate-700' };

function styleFor(muscleGroup) {
  return MUSCLE_STYLES[(muscleGroup || '').trim().toLowerCase()] || DEFAULT_STYLE;
}

export default function Exercises() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  function load() {
    setLoading(true);
    exercisesApi.list(token).then(setExercises).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      await exercisesApi.create(token, form);
      setForm(emptyForm);
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <IconFlame style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="page-title">Exercises</h1>
            <p className="text-sm text-gray-400">{exercises.length} exercises in your library</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setFormOpen(true)} className="btn-primary">
            <IconPlus style={{ width: 16, height: 16 }} /> Add Exercise
          </button>
        )}
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}

      {loading ? (
        <div className="text-gray-500">Loading exercises...</div>
      ) : exercises.length === 0 ? (
        <div className="card py-16 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
            <IconBox className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">No exercises yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {exercises.map((ex) => {
            const style = styleFor(ex.muscle_group);
            return (
              <div key={ex.id} className="card overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className={`relative h-28 bg-gradient-to-br ${style.gradient} flex items-center justify-center overflow-hidden`}>
                  <IconDumbbell className="absolute -right-3 -bottom-3 w-24 h-24 text-white/15" style={{ width: 96, height: 96 }} />
                  <IconDumbbell className="w-10 h-10 text-white drop-shadow" style={{ width: 40, height: 40 }} />
                  {ex.muscle_group && (
                    <span className={`absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/90 ${style.badge.split(' ')[1]}`}>
                      {ex.muscle_group}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{ex.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{ex.description || 'No description provided.'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Exercise">
        <form onSubmit={handleSubmit}>
          {formError && <div className="alert-error mb-3">{formError}</div>}
          <div className="mb-3">
            <label className="field-label">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div className="mb-3">
            <label className="field-label">Muscle Group</label>
            <input value={form.muscleGroup} onChange={(e) => setForm({ ...form, muscleGroup: e.target.value })} className="input-field" placeholder="e.g. Chest, Back, Legs" />
          </div>
          <div className="mb-3">
            <label className="field-label">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" />
          </div>
          <button type="submit" className="btn-primary w-full mt-2">Add Exercise</button>
        </form>
      </Modal>
    </div>
  );
}
