const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Generic day-of-week x hour-of-day intensity grid. `data` is an array of
// { day_of_week (0=Sun..6=Sat), hour (0-23), visit_count }.
export default function Heatmap({ data }) {
  const cellValue = {};
  let max = 0;
  for (const d of data) {
    cellValue[`${d.day_of_week}-${d.hour}`] = d.visit_count;
    if (d.visit_count > max) max = d.visit_count;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]" style={{ display: 'grid', gridTemplateColumns: '44px repeat(24, 1fr)' }}>
        <div />
        {HOURS.map((h) => (
          <div key={h} className="text-[10px] text-gray-400 text-center pb-1">{h}</div>
        ))}
        {DAYS.map((day, dow) => (
          <div key={day} className="contents">
            <div className="text-xs text-gray-500 flex items-center pr-2">{day}</div>
            {HOURS.map((h) => {
              const count = cellValue[`${dow}-${h}`] || 0;
              const intensity = max === 0 ? 0 : count / max;
              return (
                <div
                  key={h}
                  title={`${day} ${h}:00 — ${count} visit${count === 1 ? '' : 's'}`}
                  className="aspect-square rounded-sm m-[1px]"
                  style={{ backgroundColor: intensity === 0 ? '#f3f4f6' : `rgba(79, 70, 229, ${0.15 + intensity * 0.85})` }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
