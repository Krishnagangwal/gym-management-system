const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toLocalDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// A compact month grid marking which days a visit was logged. `visitDates`
// is any iterable of 'YYYY-MM-DD' strings (or Date-parseable values).
export default function AttendanceCalendar({ visitDates, year, month }) {
  const visited = new Set([...visitDates].map((d) => toLocalDateStr(new Date(d))));
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const todayStr = toLocalDateStr(new Date());

  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i} className="text-[10px] text-gray-400 text-center font-medium">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dateStr = toLocalDateStr(new Date(year, month - 1, d));
          const isVisited = visited.has(dateStr);
          const isToday = dateStr === todayStr;
          return (
            <div
              key={i}
              title={dateStr}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${
                isVisited ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white' : 'bg-gray-50 text-gray-400'
              } ${isToday ? 'ring-2 ring-indigo-300' : ''}`}
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}
