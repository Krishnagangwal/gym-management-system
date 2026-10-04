import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { meApi } from '../../api/me';
import Modal from '../../components/Modal';
import { IconTrendUp, IconPlus } from '../../components/icons.jsx';
import { formatDate, todayISO } from '../../utils/formatDate';
import { CHART_GRID_STROKE, CHART_TICK_STYLE, CHART_TOOLTIP_STYLE } from '../../utils/chartTheme';

const emptyForm = { date: todayISO(), weight: '', bodyFat: '', chest: '', waist: '', arms: '', thighs: '', notes: '' };

export default function MyProgress() {
  const { token } = useAuth();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  function load() {
    meApi.progress(token).then(setEntries).catch((err) => setError(err.message));
  }

  useEffect(load, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      const body = {};
      Object.entries(form).forEach(([k, v]) => { if (v !== '') body[k] = ['weight', 'bodyFat', 'chest', 'waist', 'arms', 'thighs'].includes(k) ? Number(v) : v; });
      await meApi.logProgress(token, body);
      setFormOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  if (error) return <div className="alert-error">{error}</div>;
  if (!entries) return <div className="text-gray-500">Loading...</div>;

  const chartData = entries.map((e) => ({
    date: formatDate(e.date),
    weight: e.weight != null ? Number(e.weight) : null,
    chest: e.chest != null ? Number(e.chest) : null,
    waist: e.waist != null ? Number(e.waist) : null,
    arms: e.arms != null ? Number(e.arms) : null,
    thighs: e.thighs != null ? Number(e.thighs) : null,
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <IconTrendUp style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="page-title">My Progress</h1>
            <p className="text-sm text-gray-400">{entries.length} logged entries</p>
          </div>
        </div>
        <button onClick={() => setFormOpen(true)} className="btn-primary"><IconPlus style={{ width: 16, height: 16 }} /> Log Metrics</button>
      </div>

      {entries.length === 0 ? (
        <div className="card py-16 text-center text-gray-500 text-sm">No progress logged yet — click "Log Metrics" to get started.</div>
      ) : (
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Weight</h3>
            <p className="text-xs text-gray-400 mb-4">In kilograms, over time</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} />
                <YAxis tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} domain={['auto', 'auto']} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="weight" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3, fill: '#4f46e5' }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Body Measurements</h3>
            <p className="text-xs text-gray-400 mb-4">In centimeters, over time</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} />
                <YAxis tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} domain={['auto', 'auto']} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="chest" name="Chest" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                <Line type="monotone" dataKey="waist" name="Waist" stroke="#f43f5e" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                <Line type="monotone" dataKey="arms" name="Arms" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                <Line type="monotone" dataKey="thighs" name="Thighs" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Log Body Metrics">
        <form onSubmit={handleSubmit}>
          {formError && <div className="alert-error mb-3">{formError}</div>}
          <div className="mb-3">
            <label className="field-label">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="field-label">Weight (kg)</label>
              <input type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="field-label">Body Fat (%)</label>
              <input type="number" step="0.1" value={form.bodyFat} onChange={(e) => setForm({ ...form, bodyFat: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="field-label">Chest (cm)</label>
              <input type="number" step="0.1" value={form.chest} onChange={(e) => setForm({ ...form, chest: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="field-label">Waist (cm)</label>
              <input type="number" step="0.1" value={form.waist} onChange={(e) => setForm({ ...form, waist: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="field-label">Arms (cm)</label>
              <input type="number" step="0.1" value={form.arms} onChange={(e) => setForm({ ...form, arms: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="field-label">Thighs (cm)</label>
              <input type="number" step="0.1" value={form.thighs} onChange={(e) => setForm({ ...form, thighs: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="mb-3">
            <label className="field-label">Notes</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" />
          </div>
          <button type="submit" className="btn-primary w-full mt-2">Save Entry</button>
        </form>
      </Modal>
    </div>
  );
}
