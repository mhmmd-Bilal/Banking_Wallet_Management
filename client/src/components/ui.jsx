import { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, X } from 'lucide-react';

export const Skeleton = ({ className = '' }) => <div className={`skeleton ${className}`} aria-hidden="true" />;

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden="true" /> {label}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3 p-4" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

const ALERT_STYLES = {
  error: ['border-rose-200 bg-rose-50 text-rose-900', AlertTriangle, 'text-rose-500'],
  success: ['border-emerald-200 bg-emerald-50 text-emerald-900', CheckCircle2, 'text-emerald-500'],
  info: ['border-sky-200 bg-sky-50 text-sky-900', Info, 'text-sky-500'],
  warning: ['border-amber-200 bg-amber-50 text-amber-900', AlertTriangle, 'text-amber-500'],
};

export function Alert({ type = 'info', title, children, action }) {
  if (!children && !title) return null;
  const [cls, Icon, iconCls] = ALERT_STYLES[type];
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3.5 text-sm ${cls}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconCls}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      {Icon && <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="h-6 w-6" aria-hidden="true" /></span>}
      <p className="font-semibold text-slate-900">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const BADGE = {
  ACTIVE: ['bg-emerald-50 text-emerald-700 ring-emerald-600/20', 'bg-emerald-500'],
  APPROVED: ['bg-emerald-50 text-emerald-700 ring-emerald-600/20', 'bg-emerald-500'],
  SUCCESS: ['bg-emerald-50 text-emerald-700 ring-emerald-600/20', 'bg-emerald-500'],
  PENDING: ['bg-amber-50 text-amber-700 ring-amber-600/20', 'bg-amber-500'],
  FROZEN: ['bg-sky-50 text-sky-700 ring-sky-600/20', 'bg-sky-500'],
  FAILED: ['bg-rose-50 text-rose-700 ring-rose-600/20', 'bg-rose-500'],
  REFUNDED: ['bg-slate-100 text-slate-700 ring-slate-500/20', 'bg-slate-400'],
  DEPOSIT: ['bg-emerald-50 text-emerald-700 ring-emerald-600/20', 'bg-emerald-500'],
  WITHDRAWAL: ['bg-orange-50 text-orange-700 ring-orange-600/20', 'bg-orange-500'],
  TRANSFER: ['bg-brand-50 text-brand-700 ring-brand-600/20', 'bg-brand-500'],
  SAVINGS: ['bg-brand-50 text-brand-700 ring-brand-600/20', 'bg-brand-500'],
  CURRENT: ['bg-violet-50 text-violet-700 ring-violet-600/20', 'bg-violet-500'],
};

export function StatusBadge({ value }) {
  if (!value) return null;
  const [cls, dot] = BADGE[value] || ['bg-slate-100 text-slate-700 ring-slate-500/20', 'bg-slate-400'];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {value.charAt(0) + value.slice(1).toLowerCase()}
    </span>
  );
}

export function Avatar({ name = '?', className = 'h-9 w-9 text-sm' }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-violet-600 font-semibold text-white ${className}`} aria-hidden="true">
      {initials || '?'}
    </span>
  );
}

export function StatCard({ label, value, icon: Icon, hint, loading }) {
  return (
    <div className="card group p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>}
      </div>
      {loading ? <Skeleton className="mt-3 h-8 w-28" /> : <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-[26px] font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600" id={`${htmlFor}-error`}>{error}</p>}
    </div>
  );
}

export function Pagination({ pagination, onPage }) {
  if (!pagination) return null;
  const { page, totalPages, total } = pagination;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>{total} result{total === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary h-8 w-8 !px-0" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <span className="tabular-nums">Page {page} of {totalPages}</span>
        <button type="button" className="btn-secondary h-8 w-8 !px-0" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={`card flex max-h-[92vh] w-full animate-pop-in flex-col overflow-hidden rounded-b-none shadow-lift focus:outline-none sm:rounded-b-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={busy ? () => {} : onCancel} title={title}>
      <div className="text-sm leading-relaxed text-slate-600">{children}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function DetailList({ items }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="eyebrow">{k}</dt>
          <dd className="mt-1 break-words text-sm text-slate-900">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
