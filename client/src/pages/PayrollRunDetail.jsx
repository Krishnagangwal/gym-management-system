import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { payrollApi } from '../api/payroll';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import { IconRupee, IconChevronRight } from '../components/icons.jsx';

const STATUS_TONE = { draft: 'amber', finalized: 'green' };
const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString('en-IN', { month: 'long' }));

export default function PayrollRunDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [run, setRun] = useState(null);
  const [error, setError] = useState('');
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [finalizeError, setFinalizeError] = useState('');

  function load() {
    payrollApi.getRun(token, id).then(setRun).catch((err) => setError(err.message));
  }

  useEffect(load, [token, id]);

  async function handleFinalize() {
    setFinalizeError('');
    try {
      await payrollApi.finalizeRun(token, id);
      setConfirmFinalize(false);
      load();
    } catch (err) {
      setFinalizeError(err.message);
      setConfirmFinalize(false);
    }
  }

  if (error) return <div className="alert-error">{error}</div>;
  if (!run) return <div className="text-gray-500">Loading...</div>;

  const totalGross = run.payslips.reduce((s, p) => s + Number(p.gross), 0);
  const totalNet = run.payslips.reduce((s, p) => s + Number(p.net), 0);

  const columns = [
    { key: 'employee', label: 'Employee', render: (r) => <span className="font-medium text-gray-800">{r.first_name ? `${r.first_name} ${r.last_name}` : r.employee_code}</span> },
    { key: 'days_present', label: 'Present', render: (r) => `${r.days_present} / ${r.days_present + r.days_absent}` },
    { key: 'base_salary', label: 'Base (Prorated)', render: (r) => `₹${r.base_salary}` },
    { key: 'session_commission', label: 'Commission', render: (r) => `₹${r.session_commission}` },
    { key: 'deductions', label: 'Deductions', render: (r) => <span className="text-rose-600">−₹{r.deductions}</span> },
    { key: 'net', label: 'Net Pay', render: (r) => <span className="font-semibold text-gray-900">₹{r.net}</span> },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <IconRupee style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="page-title">{MONTH_NAMES[run.month - 1]} {run.year} Payroll</h1>
            <p className="text-sm text-gray-400">
              <Badge tone={STATUS_TONE[run.status]} dot>{run.status}</Badge>
              <span className="ml-2">₹{totalNet.toFixed(2)} net · ₹{totalGross.toFixed(2)} gross across {run.payslips.length} employees</span>
            </p>
          </div>
        </div>
        {run.status === 'draft' && (
          <button onClick={() => setConfirmFinalize(true)} className="btn-primary" disabled={run.payslips.length === 0}>
            Finalize &amp; Post to Expenses
          </button>
        )}
      </div>

      {finalizeError && <div className="alert-error mb-4">{finalizeError}</div>}
      {run.status === 'draft' && (
        <div className="alert-error bg-amber-50 border-amber-200 text-amber-800 mb-4">
          This run is a draft — regenerate from the Payroll Runs page to recompute it. Finalizing locks it and posts one salary expense per employee.
        </div>
      )}

      <DataTable
        columns={columns}
        rows={run.payslips}
        emptyMessage="No payslips generated for this run."
        renderActions={(r) => (
          <Link to={`/payroll/payslips/${r.id}`} className="btn-link inline-flex items-center gap-1">
            Payslip <IconChevronRight style={{ width: 12, height: 12 }} />
          </Link>
        )}
      />

      <ConfirmDialog
        open={confirmFinalize}
        message={`Finalize ${MONTH_NAMES[run.month - 1]} ${run.year} payroll? This locks the run and posts ${run.payslips.length} salary expenses — it cannot be undone.`}
        onConfirm={handleFinalize}
        onCancel={() => setConfirmFinalize(false)}
      />
    </div>
  );
}
