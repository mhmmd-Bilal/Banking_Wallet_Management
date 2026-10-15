// Amounts from the API are integer paise. Formatting uses integer maths only.
export function formatPaise(paise) {
  if (typeof paise !== 'number' || Number.isNaN(paise)) return '—';
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const rupees = Math.trunc(abs / 100).toLocaleString('en-IN');
  return `${sign}\u20B9${rupees}.${String(abs % 100).padStart(2, '0')}`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatDay(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export const AMOUNT_RE = /^\d{1,9}(\.\d{1,2})?$/;

/** Returns an error string or '' for a rupee amount typed by the user. */
export function validateAmount(text) {
  const s = String(text ?? '').trim();
  if (!s) return 'Enter an amount';
  if (!AMOUNT_RE.test(s)) return 'Enter a valid amount with at most 2 decimal places';
  const [r, f = ''] = s.split('.');
  const paise = Number(r) * 100 + Number(f.padEnd(2, '0'));
  if (paise <= 0) return 'Amount must be greater than zero';
  if (paise > 1_000_000_000) return 'Amount cannot exceed \u20B91,00,00,000';
  return '';
}

export function rupeesToPaise(text) {
  const [r, f = ''] = String(text).trim().split('.');
  return Number(r) * 100 + Number(f.padEnd(2, '0'));
}

export const titleCase = (s = '') => s.charAt(0) + s.slice(1).toLowerCase();

// Local-day boundaries so date filters match the user's own calendar day.
export const startOfLocalDay = (yyyyMmDd) => {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
};
export const endOfLocalDay = (yyyyMmDd) => {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
};

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';

export const maskAccount = (n = '') => (n.length > 4 ? `•••• •••• ${n.slice(-4)}` : n);
