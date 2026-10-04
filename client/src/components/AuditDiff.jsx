const SKIP_FIELDS = ['created_at', 'updated_at'];

// Field-level before/after view for one audit_log row — used by both the
// admin Audit Log page and the member detail Activity tab.
export default function AuditDiff({ row }) {
  const oldVals = row.old_values || {};
  const newVals = row.new_values || {};
  const keys = [...new Set([...Object.keys(oldVals), ...Object.keys(newVals)])].filter((k) => !SKIP_FIELDS.includes(k));
  const changed = row.action === 'update'
    ? keys.filter((k) => JSON.stringify(oldVals[k]) !== JSON.stringify(newVals[k]))
    : keys;

  if (changed.length === 0) return <p className="text-xs text-gray-400">No field-level changes recorded.</p>;

  return (
    <div className="text-xs">
      <div className="grid grid-cols-3 gap-3 pb-2 mb-2 border-b border-gray-200 font-semibold text-gray-500 uppercase tracking-wider">
        <div>Field</div>
        <div>Before</div>
        <div>After</div>
      </div>
      <div className="space-y-1.5">
        {changed.map((k) => (
          <div key={k} className="grid grid-cols-3 gap-3">
            <div className="text-gray-600 font-medium">{k}</div>
            <div className="text-rose-600">{oldVals[k] === undefined || oldVals[k] === null ? '—' : String(oldVals[k])}</div>
            <div className="text-emerald-600">{newVals[k] === undefined || newVals[k] === null ? '—' : String(newVals[k])}</div>
          </div>
        ))}
      </div>
      {row.ip_address && <div className="mt-3 pt-2 border-t border-gray-200 text-gray-400">IP: {row.ip_address}</div>}
    </div>
  );
}
