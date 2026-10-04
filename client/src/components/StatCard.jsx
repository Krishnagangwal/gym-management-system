const TONES = {
  indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/30',
  emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30',
  rose: 'from-rose-500 to-rose-600 shadow-rose-500/30',
  amber: 'from-amber-500 to-amber-600 shadow-amber-500/30',
  sky: 'from-sky-500 to-sky-600 shadow-sky-500/30',
  violet: 'from-violet-500 to-violet-600 shadow-violet-500/30',
};

export default function StatCard({ label, value, icon: Icon, tone = 'indigo', highlight = false }) {
  if (highlight) {
    return (
      <div className={`relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br ${TONES[tone]} shadow-lg`}>
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute -right-8 -bottom-10 w-28 h-28 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white/85">{label}</span>
          {Icon && (
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" style={{ width: 18, height: 18 }} />
            </div>
          )}
        </div>
        <div className="relative text-3xl font-bold tracking-tight">{value}</div>
      </div>
    );
  }

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${TONES[tone]} shadow-sm flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-4.5 h-4.5 text-white" style={{ width: 17, height: 17 }} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 tracking-tight">{value}</div>
    </div>
  );
}
