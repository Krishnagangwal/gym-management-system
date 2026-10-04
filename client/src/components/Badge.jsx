const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  gray: 'bg-gray-100 text-gray-600 ring-gray-500/10',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

const DOT_TONES = {
  green: 'bg-emerald-500',
  gray: 'bg-gray-400',
  red: 'bg-rose-500',
  indigo: 'bg-indigo-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
};

export default function Badge({ tone = 'gray', dot = false, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset whitespace-nowrap ${TONES[tone] || TONES.gray}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_TONES[tone] || DOT_TONES.gray}`} />}
      {children}
    </span>
  );
}
