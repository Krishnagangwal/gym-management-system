import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditLogApi } from '../api/auditLog';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import DateRangeFilter from '../components/DateRangeFilter';
import AuditDiff from '../components/AuditDiff';
import { IconHistory } from '../components/icons.jsx';
import { formatDate, formatTime, isoDaysAgo, todayISO } from '../utils/formatDate';

const ACTION_TONE = { create: 'green', update: 'amber', delete: 'red' };

export default function AuditLog() {
  const { token } = useAuth();
  const [from, setFrom] = useState(isoDaysAgo(90));
  const [to, setTo] = useState(todayISO());
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    setEntries(null);
    auditLogApi.list(token, { from, to }).then(setEntries).catch((err) => setError(err.message));
  }, [token, from, to]);

  const users = useMemo(() => (entries ? [...new Map(entries.map((e) => [e.user_id, e.user_name])).entries()] : []), [entries]);
  const entityTypes = useMemo(() => (entries ? [...new Set(entries.map((e) => e.entity_type))].sort() : []), [entries]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    return entries.filter((e) =>
      (!userFilter || String(e.user_id) === userFilter) &&
      (!entityFilter || e.entity_type === entityFilter) &&
      (!actionFilter || e.action === actionFilter)
    );
  }, [entries, userFilter, entityFilter, actionFilter]);

  const columns = [
    { key: 'created_at', label: 'When', render: (r) => <span className="text-gray-600">{formatDate(r.created_at)} {formatTime(r.created_at)}</span> },
    { key: 'user_name', label: 'User', render: (r) => r.user_name || <span className="text-gray-300">System</span> },
    { key: 'action', label: 'Action', render: (r) => <Badge tone={ACTION_TONE[r.action] || 'gray'} dot>{r.action}</Badge> },
    { key: 'entity_type', label: 'Entity', render: (r) => <Badge tone="indigo">{r.entity_type}</Badge> },
    { key: 'entity_id', label: 'Entity ID', render: (r) => r.entity_id ?? '—' },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconHistory style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="text-sm text-gray-400">{entries ? `${filtered.length} of ${entries.length} entries shown` : '...'}</p>
        </div>
      </div>

      <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />

      <div className="card p-4 mb-5 flex items-end gap-3 flex-wrap">
        <div>
          <label className="field-label text-xs">User</label>
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="input-field">
            <option value="">All users</option>
            {users.map(([id, name]) => <option key={id} value={id}>{name || `User #${id}`}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label text-xs">Entity Type</label>
          <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="input-field">
            <option value="">All entities</option>
            {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label text-xs">Action</label>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input-field">
            <option value="">All actions</option>
            <option value="create">create</option>
            <option value="update">update</option>
            <option value="delete">delete</option>
          </select>
        </div>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {!entries && !error ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          emptyMessage="No audit entries match these filters."
          renderExpanded={(row) => <AuditDiff row={row} />}
        />
      )}
    </div>
  );
}
