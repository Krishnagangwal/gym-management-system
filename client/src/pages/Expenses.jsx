import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { expensesApi } from '../api/expenses';
import { expenseCategoriesApi } from '../api/expenseCategories';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import { IconTrendDown, IconPlus } from '../components/icons.jsx';
import { formatDate, todayISO } from '../utils/formatDate';

const METHODS = ['cash', 'card', 'upi', 'bank_transfer'];
const METHOD_TONE = { cash: 'gray', card: 'indigo', upi: 'sky', bank_transfer: 'amber' };
const emptyForm = { categoryId: '', amount: '', expenseDate: todayISO(), vendorName: '', paymentMethod: 'cash', description: '' };

function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// Staff can submit an expense (createExpense defers to an approval_request
// above the configured threshold) but can't browse, edit, or delete the
// ledger — so they get a lightweight submission-only view of this page.
function StaffExpenseForm({ token }) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    expenseCategoriesApi.list(token).then((cats) => {
      setCategories(cats);
      setForm((f) => ({ ...f, categoryId: cats.find((c) => c.is_active)?.id || '' }));
    }).catch(() => {});
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setConfirmation(null);
    try {
      const body = { ...form, categoryId: Number(form.categoryId), amount: Number(form.amount) };
      const result = await expensesApi.create(token, body);
      setConfirmation(result.pendingApproval
        ? 'Submitted for admin approval — this expense exceeds the auto-approval threshold.'
        : 'Expense recorded.');
      setForm({ ...emptyForm, categoryId: form.categoryId });
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="page-header-icon">
          <IconTrendDown style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <h1 className="page-title">Submit an Expense</h1>
          <p className="text-sm text-gray-400">Large expenses are routed to an admin for approval automatically.</p>
        </div>
      </div>

      <div className="card p-6 max-w-lg">
        {confirmation && <div className="mb-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-sm">{confirmation}</div>}
        {formError && <div className="alert-error mb-3">{formError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="field-label">Category</label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input-field" required>
              <option value="" disabled>Select a category</option>
              {categories.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="field-label">Amount (₹)</label>
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" required />
          </div>
          <div className="mb-3">
            <label className="field-label">Date</label>
            <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="input-field" required />
          </div>
          <div className="mb-3">
            <label className="field-label">Vendor</label>
            <input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} className="input-field" />
          </div>
          <div className="mb-3">
            <label className="field-label">Method</label>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="input-field">
              {METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="field-label">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" />
          </div>
          <button type="submit" className="btn-primary w-full mt-2">Submit Expense</button>
        </form>
      </div>
    </div>
  );
}

function AdminExpenseLedger({ token }) {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [categoryId, setCategoryId] = useState('');
  const [from, setFrom] = useState(firstOfMonthISO());
  const [to, setTo] = useState(todayISO());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  function loadCategories() {
    expenseCategoriesApi.list(token).then(setCategories).catch(() => {});
  }

  function load() {
    setLoading(true);
    const params = {};
    if (categoryId) params.categoryId = categoryId;
    if (from) params.from = from;
    if (to) params.to = to;
    expensesApi.list(token, params).then(setExpenses).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, [token, categoryId, from, to]);
  useEffect(loadCategories, [token]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id || '' });
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(expense) {
    setEditing(expense);
    setForm({
      categoryId: expense.category_id, amount: expense.amount, expenseDate: expense.expense_date?.slice(0, 10) || todayISO(),
      vendorName: expense.vendor_name || '', paymentMethod: expense.payment_method, description: expense.description || '',
    });
    setFormError('');
    setFormOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      const body = { ...form, categoryId: Number(form.categoryId), amount: Number(form.amount) };
      if (editing) await expensesApi.update(token, editing.id, body);
      else await expensesApi.create(token, body);
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleDelete() {
    await expensesApi.remove(token, confirmTarget.id);
    setConfirmTarget(null);
    load();
  }

  async function handleCreateCategory(e) {
    e.preventDefault();
    setCategoryError('');
    try {
      await expenseCategoriesApi.create(token, { name: categoryName });
      setCategoryName('');
      loadCategories();
    } catch (err) {
      setCategoryError(err.message);
    }
  }

  async function toggleCategoryActive(cat) {
    await expenseCategoriesApi.update(token, cat.id, { name: cat.name, isActive: !cat.is_active });
    loadCategories();
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const columns = [
    { key: 'expense_date', label: 'Date', render: (r) => formatDate(r.expense_date) },
    { key: 'category_name', label: 'Category', render: (r) => <Badge tone="violet">{r.category_name}</Badge> },
    { key: 'vendor_name', label: 'Vendor', render: (r) => r.vendor_name || '—' },
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-semibold text-gray-900">₹{r.amount}</span> },
    { key: 'payment_method', label: 'Method', render: (r) => <Badge tone={METHOD_TONE[r.payment_method] || 'gray'}>{r.payment_method.replace('_', ' ')}</Badge> },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <IconTrendDown style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="page-title">Expenses</h1>
            <p className="text-sm text-gray-400">₹{total.toFixed(2)} total for the selected range</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCategoryModalOpen(true)} className="btn-secondary">Categories</button>
          <button onClick={openCreate} className="btn-primary"><IconPlus style={{ width: 16, height: 16 }} /> Add Expense</button>
        </div>
      </div>

      <div className="card p-4 mb-5 flex items-end gap-3 flex-wrap">
        <div>
          <label className="field-label text-xs">Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label text-xs">From</label>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="field-label text-xs">To</label>
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="input-field" />
        </div>
      </div>

      {error && <div className="alert-error mb-4">{error}</div>}
      {loading ? <div className="text-gray-500">Loading expenses...</div> : (
        <DataTable columns={columns} rows={expenses} emptyMessage="No expenses recorded for this range." renderActions={(r) => (
          <div className="flex gap-3 justify-end">
            <button onClick={() => openEdit(r)} className="btn-link">Edit</button>
            <button onClick={() => setConfirmTarget(r)} className="btn-danger-link">Delete</button>
          </div>
        )} />
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Expense' : 'Add Expense'}>
        <form onSubmit={handleSubmit}>
          {formError && <div className="alert-error mb-3">{formError}</div>}
          <div className="mb-3">
            <label className="field-label">Category</label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input-field" required>
              <option value="" disabled>Select a category</option>
              {categories.filter((c) => c.is_active || c.id === form.categoryId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="field-label">Amount (₹)</label>
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" required />
          </div>
          <div className="mb-3">
            <label className="field-label">Date</label>
            <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="input-field" required />
          </div>
          <div className="mb-3">
            <label className="field-label">Vendor</label>
            <input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} className="input-field" />
          </div>
          <div className="mb-3">
            <label className="field-label">Method</label>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="input-field">
              {METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="field-label">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" />
          </div>
          <button type="submit" className="btn-primary w-full mt-2">{editing ? 'Save Changes' : 'Add Expense'}</button>
        </form>
      </Modal>

      <Modal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title="Expense Categories">
        {categoryError && <div className="alert-error mb-3">{categoryError}</div>}
        <form onSubmit={handleCreateCategory} className="flex gap-2 mb-4">
          <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="New category name" className="input-field" required />
          <button type="submit" className="btn-secondary flex-shrink-0">Add</button>
        </form>
        <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
          {categories.map((c) => (
            <li key={c.id} className="py-2.5 flex items-center justify-between">
              <span className={`text-sm ${c.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{c.name}</span>
              <button onClick={() => toggleCategoryActive(c)} className={c.is_active ? 'btn-danger-link' : 'btn-link'}>
                {c.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </li>
          ))}
        </ul>
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        message={confirmTarget ? `Delete this ₹${confirmTarget.amount} expense?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}

export default function Expenses() {
  const { token, user } = useAuth();
  return user?.role === 'admin' ? <AdminExpenseLedger token={token} /> : <StaffExpenseForm token={token} />;
}
