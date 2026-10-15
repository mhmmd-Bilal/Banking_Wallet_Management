import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Send, Wallet } from 'lucide-react';
import { useGetReportsQuery } from '../../services/api';
import { endOfLocalDay, formatPaise, startOfLocalDay } from '../../utils/format';
import { Alert, ListSkeleton, PageHeader, StatCard, StatusBadge } from '../../components/ui';

const pct = (v, max) => (max > 0 ? Math.max(3, Math.round((v / max) * 100)) : 0);

export default function AdminReports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState('');
  const { data, isLoading, isFetching, error } = useGetReportsQuery({ from: from ? startOfLocalDay(from) : '', to: to ? endOfLocalDay(to) : '', type });
  const maxAmount = data ? Math.max(...data.byType.map((b) => b.amount), 0) : 0;
  const maxCount = data ? Math.max(...data.byStatus.map((b) => b.count), 0) : 0;

  return (
    <>
      <PageHeader eyebrow="Insights" title="Transaction reports" subtitle="Money-movement totals count successful transactions only" />
      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-3">
        <label className="text-xs font-medium text-slate-500">From<input type="date" className="input mt-1" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-xs font-medium text-slate-500">To<input type="date" className="input mt-1" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label className="text-xs font-medium text-slate-500">Type
          <select className="input mt-1" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option><option value="DEPOSIT">Deposit</option><option value="WITHDRAWAL">Withdrawal</option><option value="TRANSFER">Transfer</option>
          </select>
        </label>
      </div>
      {error && <Alert type="error">{error.message}</Alert>}
      {isLoading && <div className="card"><ListSkeleton rows={4} /></div>}
      {data && (
        <div className={isFetching ? 'opacity-60 transition-opacity' : ''}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total deposits" value={formatPaise(data.totals.totalDeposits)} icon={ArrowDownToLine} hint={`${data.totals.depositCount} transactions`} />
            <StatCard label="Total withdrawals" value={formatPaise(data.totals.totalWithdrawals)} icon={ArrowUpFromLine} hint={`${data.totals.withdrawalCount} transactions`} />
            <StatCard label="Total transfers" value={formatPaise(data.totals.totalTransfers)} icon={Send} hint={`${data.totals.transferCount} transactions`} />
            <StatCard label="All transactions" value={data.totals.allTransactionCount} icon={Wallet} hint={`${data.totals.successfulCount} successful`} />
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="card p-6">
              <h2 className="mb-5 font-semibold">Amount by type (successful)</h2>
              <ul className="space-y-5">
                {data.byType.map((b) => (
                  <li key={b.type}>
                    <div className="mb-2 flex items-center justify-between text-sm"><StatusBadge value={b.type} /><span className="tabular-nums text-slate-600">{formatPaise(b.amount)} · {b.count} txns</span></div>
                    <div className="h-2.5 rounded-full bg-slate-100"><div className="h-2.5 rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500" style={{ width: `${pct(b.amount, maxAmount)}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-6">
              <h2 className="mb-5 font-semibold">Transactions by status</h2>
              <ul className="space-y-5">
                {data.byStatus.map((b) => (
                  <li key={b.status}>
                    <div className="mb-2 flex items-center justify-between text-sm"><StatusBadge value={b.status} /><span className="tabular-nums text-slate-600">{b.count}</span></div>
                    <div className="h-2.5 rounded-full bg-slate-100"><div className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500" style={{ width: `${pct(b.count, maxCount)}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
