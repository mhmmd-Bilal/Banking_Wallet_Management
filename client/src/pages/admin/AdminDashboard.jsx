import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, ClipboardCheck, Send, Snowflake, Users, Wallet } from 'lucide-react';
import { useGetAdminTransactionsQuery, useGetAdminUsersQuery, useGetReportsQuery } from '../../services/api';
import { formatDate, formatPaise } from '../../utils/format';
import { Alert, ListSkeleton, PageHeader, StatCard, StatusBadge } from '../../components/ui';

const total = (q) => q.data?.pagination.total ?? 0;

export default function AdminDashboard() {
  const all = useGetAdminUsersQuery({ limit: 1 });
  const pending = useGetAdminUsersQuery({ verificationStatus: 'PENDING', limit: 1 });
  const active = useGetAdminUsersQuery({ accountStatus: 'ACTIVE', limit: 1 });
  const frozen = useGetAdminUsersQuery({ accountStatus: 'FROZEN', limit: 1 });
  const report = useGetReportsQuery({});
  const recent = useGetAdminTransactionsQuery({ limit: 5 });
  const totals = report.data?.totals;
  const failure = [all, pending, active, frozen, report, recent].find((q) => q.error)?.error;

  return (
    <>
      <PageHeader eyebrow="Administration" title="Admin overview" subtitle="Live figures from the database" />
      {failure && <div className="mb-5"><Alert type="error">{failure.message}</Alert></div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered users" value={total(all)} loading={all.isLoading} icon={Users} />
        <StatCard label="Pending verifications" value={total(pending)} loading={pending.isLoading} icon={ClipboardCheck} />
        <StatCard label="Active accounts" value={total(active)} loading={active.isLoading} icon={CheckCircle2} />
        <StatCard label="Frozen accounts" value={total(frozen)} loading={frozen.isLoading} icon={Snowflake} />
        <StatCard label="Total deposits" value={formatPaise(totals?.totalDeposits)} loading={report.isLoading} icon={ArrowDownToLine} hint={totals && `${totals.depositCount} successful`} />
        <StatCard label="Total withdrawals" value={formatPaise(totals?.totalWithdrawals)} loading={report.isLoading} icon={ArrowUpFromLine} hint={totals && `${totals.withdrawalCount} successful`} />
        <StatCard label="Total transfers" value={formatPaise(totals?.totalTransfers)} loading={report.isLoading} icon={Send} hint={totals && `${totals.transferCount} successful`} />
        <StatCard label="Successful transactions" value={totals?.successfulCount ?? 0} loading={report.isLoading} icon={Wallet} />
      </div>
      <div className="card mt-6 overflow-hidden">
        <h2 className="border-b border-slate-100 px-5 py-4 font-semibold">Latest transactions</h2>
        {recent.isLoading && <ListSkeleton rows={3} />}
        {recent.data?.items.length === 0 && <p className="p-5 text-sm text-slate-500">No transactions yet.</p>}
        <ul className="divide-y divide-slate-100">
          {recent.data?.items.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
              <div><span className="font-mono text-xs font-medium">{t.transactionId}</span><p className="text-xs text-slate-500">{formatDate(t.createdAt)}</p></div>
              <StatusBadge value={t.type} />
              <span className="font-semibold tabular-nums">{formatPaise(t.amount)}</span>
              <StatusBadge value={t.status} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
