import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { approvalsApi } from '../api/approvals';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { IconShieldCheck } from '../components/icons.jsx';
import { formatDate } from '../utils/formatDate';

const STATUS_TONE = { pending: 'amber', approved: 'green', rejected: 'red' };
const STATUSES = ['pending', 'approved', 'rejected'];

function payloadSummary(request) {
  const p = request.request_payload || {};
  switch (request.request_type) {
    case 'expense': return `₹${p.amount} — ${p.description || p.vendorName || 'expense'}`;
    case 'refund': return `₹${p.amount} refund${p.reason ? ` — ${p.reason}` : ''}`;
    case 'membership_deletion': return `Delete membership${p.memberName ? ` — ${p.memberName}` : ''}`;
    case 'discount': return `${p.discountPercent}% discount${p.memberName ? ` — ${p.memberName}` : ''}`;
    case 'leave': return `${p.days}-day ${p.leaveType} leave — ${p.employeeName || ''} (${p.fromDate} to ${p.toDate})`;
    default: return JSON.stringify(p);
  }
}

export default function Approvals() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('pending');
  const [reviewTarget, setReviewTarget] = useState(null); // { request, action }
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState('');

  function load() {
    approvalsApi.list(token, isAdmin ? status : undefined).then(setRequests).catch((err) => setError(err.message));
  }

  useEffect(load, [token, status]);

  function openReview(request, action) {
    setReviewTarget({ request, action });
    setReviewNote('');
    setReviewError('');
  }

  async function submitReview(e) {
    e.preventDefault();
    setReviewError('');
    try {
      if (reviewTarget.action === 'approve') await approvalsApi.approve(token, reviewTarget.request.id, reviewNote);
      else await approvalsApi.reject(token, reviewTarget.request.id, reviewNote);
      setReviewTarget(null);
      load();
    } catch (err) {
      setReviewError(err.message);
    }
  }

  const columns = [
    { key: 'request_type', label: 'Type', render: (r) => <Badge tone="violet">{r.request_type.replace('_', ' ')}</Badge> },
    { key: 'summary', label: 'Request', render: (r) => <span className="text-gray-700">{payloadSummary(r)}</span> },
    ...(isAdmin ? [{ key: 'requester_name', label: 'Requested By' }] : []),
    { key: 'created_at', label: 'Submitted', render: (r) => formatDate(r.created_at) },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status] || 'gray'} dot>{r.status}</Badge> },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconShieldCheck style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <h1 className="page-title">Approvals</h1>
          <p className="text-sm text-gray-400">{isAdmin ? 'Requests awaiting review' : 'Your submitted requests'}</p>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-5 flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`tab-btn ${status === s ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <div className="alert-error mb-4">{error}</div>}
      {!requests && !error ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          rows={requests}
          emptyMessage={isAdmin ? 'No requests in this status.' : "You haven't submitted any requests."}
          renderExpanded={(r) => (
            <div className="text-xs space-y-1.5">
              {r.reason && <p><span className="text-gray-400">Reason:</span> <span className="text-gray-700">{r.reason}</span></p>}
              {r.review_note && <p><span className="text-gray-400">Review note:</span> <span className="text-gray-700">{r.review_note}</span></p>}
              {r.reviewer_name && <p><span className="text-gray-400">Reviewed by:</span> <span className="text-gray-700">{r.reviewer_name}</span> on {formatDate(r.reviewed_at)}</p>}
              <p><span className="text-gray-400">Payload:</span> <span className="font-mono text-gray-600">{JSON.stringify(r.request_payload)}</span></p>
            </div>
          )}
          renderActions={isAdmin && status === 'pending' ? (r) => (
            <div className="flex gap-3 justify-end">
              <button onClick={() => openReview(r, 'approve')} className="btn-link">Approve</button>
              <button onClick={() => openReview(r, 'reject')} className="btn-danger-link">Reject</button>
            </div>
          ) : undefined}
        />
      )}

      <Modal open={!!reviewTarget} onClose={() => setReviewTarget(null)} title={reviewTarget?.action === 'approve' ? 'Approve Request' : 'Reject Request'}>
        {reviewTarget && (
          <form onSubmit={submitReview}>
            {reviewError && <div className="alert-error mb-3">{reviewError}</div>}
            <p className="text-sm text-gray-600 mb-3">{payloadSummary(reviewTarget.request)}</p>
            <div className="mb-3">
              <label className="field-label">
                Review Note {reviewTarget.action === 'reject' && <span className="text-rose-500">(required)</span>}
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="input-field"
                rows={3}
                required={reviewTarget.action === 'reject'}
              />
            </div>
            <button type="submit" className={reviewTarget.action === 'approve' ? 'btn-primary w-full mt-2' : 'btn-primary w-full mt-2 bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600'}>
              {reviewTarget.action === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
