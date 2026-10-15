import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, History, Search, Send } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { endOfLocalDay, formatDate, formatPaise, startOfLocalDay } from '../utils/format';
import { Alert, DetailList, EmptyState, ListSkeleton, Modal, Pagination, StatusBadge } from './ui';

const EMPTY = { q: '', type: '', status: '', from: '', to: '', minAmount: '', maxAmount: '', sort: 'createdAt:desc' };
const ICONS = { DEPOSIT: ArrowDownToLine, WITHDRAWAL: ArrowUpFromLine, TRANSFER: Send };

function partyText(tx, admin) {
  if (tx.type === 'DEPOSIT') return 'Deposit to own account';
  if (tx.type === 'WITHDRAWAL') return 'Withdrawal from own account';
  if (admin) return `${tx.sender?.name ?? '—'} → ${tx.receiver?.name ?? '—'}`;
  return tx.direction === 'DEBIT'
    ? `To ${tx.receiver?.name ?? 'account'} (${tx.receiver?.accountNumber ?? ''})`
    : `From ${tx.sender?.name ?? 'account'} (${tx.sender?.accountNumber ?? ''})`;
}

function Amount({ tx, admin }) {
  if (admin) return <span className="font-semibold tabular-nums text-slate-900">{formatPaise(tx.amount)}</span>;
  const debit = tx.direction === 'DEBIT';
  return <span className={`font-semibold tabular-nums ${debit ? 'text-rose-600' : 'text-emerald-600'}`}>{debit ? '-' : '+'}{formatPaise(tx.amount)}</span>;
}

export function TransactionDetailModal({ transactionId, useDetail, admin, onClose }) {
  const { data, isLoading, error } = useDetail(transactionId);
  const tx = data?.transaction;
  return (
    <Modal open onClose={onClose} title="Transaction details">
      {isLoading && <ListSkeleton rows={3} />}
      {error && <Alert type="error">{error.message}</Alert>}
      {tx && (
        <DetailList items={[
          ['Transaction ID', <span key="i" className="font-mono text-xs">{tx.transactionId}</span>],
          ['Reference', <span key="r" className="font-mono text-xs">{tx.reference}</span>],
          ['Type', <StatusBadge key="t" value={tx.type} />],
          ['Status', <StatusBadge key="s" value={tx.status} />],
          ['Amount', <span key="a" className="text-lg font-semibold">{formatPaise(tx.amount)}</span>],
          ['Date', formatDate(tx.createdAt)],
          ['Sender', tx.sender ? `${tx.sender.name ?? '—'} · ${tx.sender.accountNumber ?? ''}` : '—'],
          ['Receiver', tx.receiver ? `${tx.receiver.name ?? '—'} · ${tx.receiver.accountNumber ?? ''}` : '—'],
          ...(admin ? [] : [['Direction', tx.direction === 'DEBIT' ? 'Money out' : 'Money in']]),
        ]} />
      )}
    </Modal>
  );
}

/**
 * Shared search / filter / sort / paginate view for user history and admin monitoring.
 * `useList` / `useDetail` are RTK Query hooks; tag invalidation (socket events, new transactions)
 * refreshes the current page automatically.
 */
export default function TransactionsView({ useList, useDetail, admin = false, pageSize = 10 }) {
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const q = useDebounce(filters.q.trim());
  const [sortBy, order] = filters.sort.split(':');

  const params = useMemo(() => ({
    q,
    type: filters.type,
    status: filters.status,
    from: filters.from ? startOfLocalDay(filters.from) : '',
    to: filters.to ? endOfLocalDay(filters.to) : '',
    minAmount: filters.minAmount.trim(),
    maxAmount: filters.maxAmount.trim(),
    sortBy, order, page, limit: pageSize,
  }), [q, filters, sortBy, order, page, pageSize]);

  const { data, isLoading, isFetching, error } = useList(params);
  const set = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };
  const items = data?.items ?? [];
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY);

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input aria-label="Search by transaction ID or reference" className="input pl-10" placeholder="Search transaction ID or reference" value={filters.q} onChange={set('q')} />
        </div>
        <select aria-label="Filter by type" className="input" value={filters.type} onChange={set('type')}>
          <option value="">All types</option><option value="DEPOSIT">Deposit</option><option value="WITHDRAWAL">Withdrawal</option><option value="TRANSFER">Transfer</option>
        </select>
        <select aria-label="Filter by status" className="input" value={filters.status} onChange={set('status')}>
          <option value="">All statuses</option><option value="SUCCESS">Success</option><option value="PENDING">Pending</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option>
        </select>
        <label className="text-xs font-medium text-slate-500">From<input type="date" className="input mt-1" value={filters.from} onChange={set('from')} /></label>
        <label className="text-xs font-medium text-slate-500">To<input type="date" className="input mt-1" value={filters.to} onChange={set('to')} /></label>
        <label className="text-xs font-medium text-slate-500">Min amount (₹)<input inputMode="decimal" className="input mt-1" placeholder="0" value={filters.minAmount} onChange={set('minAmount')} /></label>
        <label className="text-xs font-medium text-slate-500">Max amount (₹)<input inputMode="decimal" className="input mt-1" placeholder="No limit" value={filters.maxAmount} onChange={set('maxAmount')} /></label>
        <label className="text-xs font-medium text-slate-500 sm:col-span-2">Sort by
          <select className="input mt-1" value={filters.sort} onChange={set('sort')}>
            <option value="createdAt:desc">Newest first</option><option value="createdAt:asc">Oldest first</option>
            <option value="amount:desc">Amount: high to low</option><option value="amount:asc">Amount: low to high</option>
          </select>
        </label>
        <div className="flex items-end sm:col-span-2">
          <button type="button" className="btn-secondary" disabled={!hasFilters} onClick={() => { setFilters(EMPTY); setPage(1); }}>Clear filters</button>
        </div>
      </div>

      {error && <div className="p-4"><Alert type="error">{error.message}</Alert></div>}
      {isLoading && <ListSkeleton rows={6} />}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState icon={History} title="No transactions found">{hasFilters ? 'Try changing or clearing your filters.' : 'Transactions will appear here once money moves.'}</EmptyState>
      )}

      {items.length > 0 && (
        <>
          {/* Desktop table */}
          <div className={`hidden overflow-x-auto md:block ${isFetching ? 'opacity-60 transition-opacity' : ''}`}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/70"><tr>
                <th className="th">Date</th><th className="th">Transaction</th><th className="th">Type</th><th className="th">Details</th><th className="th text-right">Amount</th><th className="th">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((tx) => (
                  <tr key={tx.id} className="transition hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{formatDate(tx.createdAt)}</td>
                    <td className="px-4 py-3.5">
                      <button type="button" className="font-mono text-xs font-medium text-brand-600 hover:underline" onClick={() => setSelected(tx.transactionId)}>{tx.transactionId}</button>
                      <div className="font-mono text-xs text-slate-400">{tx.reference}</div>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge value={tx.type} /></td>
                    <td className="px-4 py-3.5 text-slate-600">{partyText(tx, admin)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right"><Amount tx={tx} admin={admin} /></td>
                    <td className="px-4 py-3.5"><StatusBadge value={tx.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className={`divide-y divide-slate-100 md:hidden ${isFetching ? 'opacity-60' : ''}`}>
            {items.map((tx) => {
              const Icon = ICONS[tx.type];
              return (
                <li key={tx.id}>
                  <button type="button" onClick={() => setSelected(tx.transactionId)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{partyText(tx, admin)}</span>
                      <span className="block truncate text-xs text-slate-500">{formatDate(tx.createdAt)}</span>
                    </span>
                    <span className="text-right"><Amount tx={tx} admin={admin} /><span className="mt-1 block"><StatusBadge value={tx.status} /></span></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <Pagination pagination={data?.pagination} onPage={setPage} />
      {selected && <TransactionDetailModal transactionId={selected} useDetail={useDetail} admin={admin} onClose={() => setSelected(null)} />}
    </div>
  );
}
