import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { payrollApi } from '../api/payroll';
import Badge from '../components/Badge';
import { IconChevronRight, IconDumbbell } from '../components/icons.jsx';
import { amountInWords } from '../utils/numberToWords';

const STATUS_TONE = { draft: 'amber', finalized: 'green' };
const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString('en-IN', { month: 'long' }));

const GYM = {
  name: 'GymAdmin Fitness Center',
  address: '221B Fitness Lane, Andheri, Mumbai, Maharashtra 400053',
};

export default function PayslipView() {
  const { id } = useParams();
  const { token } = useAuth();
  const [payslip, setPayslip] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    payrollApi.getPayslip(token, id).then(setPayslip).catch((err) => setError(err.message));
  }, [token, id]);

  if (error) return <div className="alert-error">{error}</div>;
  if (!payslip) return <div className="text-gray-500">Loading...</div>;

  const name = payslip.first_name ? `${payslip.first_name} ${payslip.last_name}` : payslip.employee_code;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to={`/payroll/${payslip.payroll_run_id}`} className="btn-link inline-flex items-center gap-1">
          <IconChevronRight style={{ width: 14, height: 14, transform: 'rotate(180deg)' }} /> Back to Payroll Run
        </Link>
        <button onClick={() => window.print()} className="btn-primary">Print Payslip</button>
      </div>

      <div className="card p-8 max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-600/30">
              <IconDumbbell className="w-5 h-5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-gray-900">{GYM.name}</div>
              <div className="text-xs text-gray-400 max-w-[220px]">{GYM.address}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Payslip</div>
            <div className="font-mono text-sm font-semibold text-gray-900">{payslip.employee_code}</div>
            <div className="text-xs text-gray-400 mt-1">{MONTH_NAMES[payslip.month - 1]} {payslip.year}</div>
            <div className="mt-2"><Badge tone={STATUS_TONE[payslip.run_status]} dot>{payslip.run_status}</Badge></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Employee</div>
            <div className="font-medium text-gray-800">{name}</div>
            <div className="text-gray-500">{payslip.designation || '—'}</div>
            {payslip.bank_account_last4 && <div className="text-gray-500">Bank A/C ending {payslip.bank_account_last4}</div>}
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Attendance</div>
            <div className="font-medium text-gray-800">{payslip.days_present} days present</div>
            <div className="text-gray-500">{payslip.days_absent} days absent</div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-right px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3.5 font-medium text-gray-800">Base Salary (prorated by attendance)</td>
                <td className="px-4 py-3.5 text-right text-gray-800">₹{payslip.base_salary}</td>
              </tr>
              {Number(payslip.session_commission) > 0 && (
                <tr>
                  <td className="px-4 py-2.5 text-gray-500">Session Commission</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">₹{payslip.session_commission}</td>
                </tr>
              )}
              {Number(payslip.allowances) > 0 && (
                <tr>
                  <td className="px-4 py-2.5 text-gray-500">Allowances</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">₹{payslip.allowances}</td>
                </tr>
              )}
              <tr>
                <td className="px-4 py-2.5 text-gray-500">Gross Pay</td>
                <td className="px-4 py-2.5 text-right text-gray-500">₹{payslip.gross}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-rose-600">Deductions (PF &amp; TDS)</td>
                <td className="px-4 py-2.5 text-right text-rose-600">−₹{payslip.deductions}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-100">
                <td className="px-4 py-3.5 font-semibold text-gray-900">Net Pay</td>
                <td className="px-4 py-3.5 text-right text-lg font-bold text-gray-900">₹{payslip.net}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="text-sm mb-6">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Amount in Words</div>
          <div className="text-gray-700 italic">{amountInWords(payslip.net)}</div>
        </div>

        <p className="text-xs text-gray-400 text-center pt-4 border-t border-gray-100">
          This is a computer-generated payslip and does not require a signature.
        </p>
      </div>
    </div>
  );
}
