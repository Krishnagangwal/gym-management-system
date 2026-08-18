import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { exercisesApi } from '../api/exercises';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';

const emptyForm = { name: '', description: '', muscleGroup: '' };

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

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'muscle_group', label: 'Muscle Group' },
    { key: 'description', label: 'Description' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Exercises</h1>
        {isAdmin && <button onClick={() => setFormOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ Add Exercise</button>}
      </div>
      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {loading ? <div className="text-gray-500">Loading exercises...</div> : <DataTable columns={columns} rows={exercises} />}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Exercise">
        <form onSubmit={handleSubmit}>
          {formError && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-3 text-sm">{formError}</div>}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" required />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Muscle Group</label>
            <input value={form.muscleGroup} onChange={(e) => setForm({ ...form, muscleGroup: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mt-2">Add Exercise</button>
        </form>
      </Modal>
    </div>
  );
}
