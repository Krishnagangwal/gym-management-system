export default function ConfirmDialog({ open, message, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100">
        <p className="mb-6 text-gray-700 text-sm">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className="inline-flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-sm shadow-rose-600/25 hover:bg-rose-700 transition">Confirm</button>
        </div>
      </div>
    </div>
  );
}
