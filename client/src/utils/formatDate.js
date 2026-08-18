export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Local calendar date as YYYY-MM-DD, for defaulting <input type="date"> values.
// Using toISOString() here would give the UTC date, which can be a day off
// from the user's local date (e.g. IST is UTC+5:30).
export function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
