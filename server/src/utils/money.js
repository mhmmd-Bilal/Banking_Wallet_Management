// All balances and amounts are integers in paise (1 INR = 100 paise).
export const MAX_AMOUNT_PAISE = 1_000_000_000; // INR 1,00,00,000 per operation
export const MAX_BALANCE_PAISE = 1_000_000_000_000; // INR 10,000 crore per account

/**
 * Strictly parse a rupee amount ("100", "100.5", "100.50") into integer paise.
 * Returns null for anything malformed. No floating-point arithmetic is used.
 */
export function parseRupeesToPaise(input, { allowZero = false } = {}) {
  if (typeof input !== 'string' && typeof input !== 'number') return null;
  const s = String(input).trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null;
  const [rupees, fraction = ''] = s.split('.');
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise)) return null;
  if (paise === 0 && !allowZero) return null;
  if (paise > MAX_AMOUNT_PAISE) return null;
  return paise;
}

export function formatPaise(paise) {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const rupees = Math.trunc(abs / 100).toLocaleString('en-IN');
  return `${sign}\u20B9${rupees}.${String(abs % 100).padStart(2, '0')}`;
}
