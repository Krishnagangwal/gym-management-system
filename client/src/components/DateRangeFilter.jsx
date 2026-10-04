import { isoDaysAgo, todayISO } from '../utils/formatDate';

const PRESETS = [
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '6M', days: 182 },
  { label: '12M', days: 365 },
];

export default function DateRangeFilter({ from, to, onChange }) {
  return (
    <div className="card p-4 mb-6 flex items-end gap-3 flex-wrap">
      <div className="flex gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => onChange(isoDaysAgo(p.days), todayISO())}
            className="tab-btn tab-btn-inactive"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="h-9 w-px bg-gray-200 hidden sm:block" />
      <div>
        <label className="field-label text-xs">From</label>
        <input type="date" value={from} max={to} onChange={(e) => onChange(e.target.value, to)} className="input-field" />
      </div>
      <div>
        <label className="field-label text-xs">To</label>
        <input type="date" value={to} min={from} onChange={(e) => onChange(from, e.target.value)} className="input-field" />
      </div>
    </div>
  );
}
