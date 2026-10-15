import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, Bell, History, PlusCircle, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useListMyTransactionsQuery } from '../../services/api';
import { formatDate, formatPaise } from '../../utils/format';
import { Alert, EmptyState, ListSkeleton, PageHeader, StatusBadge } from '../../components/ui';

const ACTIONS = [
  { to: '/deposit', label: 'Deposit', icon: ArrowDownToLine },
  { to: '/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { to: '/transfer', label: 'Transfer', icon: Send },
  { to: '/transactions', label: 'History', icon: History },
  { to: '/notifications', label: 'Alerts', icon: Bell },
];

export default function Dashboard() {
  const { user, account } = useAuth();
  const { data, isLoading, error } = useListMyTransactionsQuery({ limit: 5 }, { skip: !account });
  const active = account?.status === 'ACTIVE';

  return (
    <>
      <PageHeader eyebrow="Overview" title={`Welcome back, ${user.name.split(' ')[0]}`} subtitle="Your simulated banking at a glance" />

      <div className="grid gap-5 lg:grid-cols-3">
        {account ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900 p-7 text-white shadow-lift lg:col-span-2">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-gold-400/10 blur-3xl" aria-hidden="true" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Available balance</p>
                <p className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl" data-testid="balance">{formatPaise(account.balance)}</p>
              </div>
              <div className="h-9 w-12 rounded-md bg-gradient-to-br from-gold-300 to-gold-500 opacity-90" aria-hidden="true" />
            </div>
            <div className="relative mt-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-slate-400">Account number</p>
                <p className="mt-1 font-mono text-lg tracking-[0.18em]">{account.accountNumber.replace(/(\d{4})(?=\d)/g, '$1 ')}</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span>{account.ifsc}</span><span aria-hidden="true">·</span><span className="capitalize">{account.accountType.toLowerCase()}</span>
                <StatusBadge value={account.status} />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-violet-700 p-8 text-white shadow-lift lg:col-span-2">
            <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-100">Next step</p>
            <h2 className="mt-3 text-2xl font-semibold !text-white sm:text-3xl">Open your bank account</h2>
            <p className="mt-2 max-w-md text-sm text-brand-100">Choose Savings or Current and you're ready to go. Your account number is generated for you.</p>
            <Link to="/open-account" className="btn mt-6 bg-white text-brand-700 shadow-lg hover:bg-brand-50"><PlusCircle className="h-4 w-4" aria-hidden="true" /> Open account</Link>
          </div>
        )}

        <div className="card grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 lg:grid-cols-2 lg:p-4">
          {ACTIONS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="group flex flex-col items-center gap-2 rounded-xl p-3 text-sm font-medium text-slate-700 transition hover:bg-brand-50">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {account && !active && <div className="mt-5"><Alert type="info">Financial actions are unavailable until your account is active.</Alert></div>}

      <div className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold">Recent transactions</h2>
          <Link to="/transactions" className="text-sm font-semibold text-brand-600 hover:text-brand-700">View all</Link>
        </div>
        {!account && <EmptyState icon={History} title="No transactions yet">Open an account to start moving simulated money.</EmptyState>}
        {account && isLoading && <ListSkeleton rows={4} />}
        {error && <div className="p-4"><Alert type="error">{error.message}</Alert></div>}
        {data && data.items.length === 0 && <EmptyState icon={History} title="No transactions yet">Your deposits, withdrawals and transfers will show up here.</EmptyState>}
        <ul className="divide-y divide-slate-100">
          {data?.items.map((tx) => {
            const debit = tx.direction === 'DEBIT';
            const Icon = tx.type === 'DEPOSIT' ? ArrowDownToLine : tx.type === 'WITHDRAWAL' ? ArrowUpFromLine : Send;
            return (
              <li key={tx.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${debit ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{tx.type === 'TRANSFER' ? (debit ? `Sent to ${tx.receiver?.name ?? 'account'}` : `Received from ${tx.sender?.name ?? 'account'}`) : tx.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}</p>
                  <p className="truncate text-xs text-slate-500">{formatDate(tx.createdAt)} · {tx.reference}</p>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${debit ? 'text-rose-600' : 'text-emerald-600'}`}>{debit ? '-' : '+'}{formatPaise(tx.amount)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
