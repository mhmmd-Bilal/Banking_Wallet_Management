import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useGetAdminUsersQuery, useGetPendingUsersQuery } from '../../services/api';
import { formatDay } from '../../utils/format';
import { Alert, Avatar, EmptyState, ListSkeleton, PageHeader, Pagination, StatusBadge } from '../../components/ui';
import UserDetail from '../../components/UserDetail';

export default function AdminVerification() {
  const [tab, setTab] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  // Both hooks always run; the inactive one is skipped
  const pending = useGetPendingUsersQuery({ page, limit: 8 }, { skip: tab !== 'PENDING' });
  const verified = useGetAdminUsersQuery({ verificationStatus: 'APPROVED', page, limit: 8 }, { skip: tab !== 'APPROVED' });
  const { data, isLoading, error } = tab === 'PENDING' ? pending : verified;

  const switchTab = (t) => { setTab(t); setPage(1); setSelected(null); };

  return (
    <>
      <PageHeader eyebrow="Compliance" title="User verification" subtitle="Review identity documents and approve new customers" />
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="card overflow-hidden lg:col-span-2">
          <div className="flex border-b border-slate-100 text-sm font-semibold" role="tablist">
            {[['PENDING', 'Pending'], ['APPROVED', 'Verified']].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => switchTab(k)}
                className={`flex-1 px-4 py-3.5 transition ${tab === k ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}>{l}</button>
            ))}
          </div>
          {isLoading && <ListSkeleton rows={5} />}
          {error && <div className="p-4"><Alert type="error">{error.message}</Alert></div>}
          {data && data.items.length === 0 && <EmptyState icon={ClipboardCheck} title={tab === 'PENDING' ? 'No pending requests' : 'No verified users yet'}>{tab === 'PENDING' ? 'New registrations will appear here for review.' : undefined}</EmptyState>}
          <ul className="divide-y divide-slate-100">
            {data?.items.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => setSelected(u.id)} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 ${selected === u.id ? 'bg-brand-50/60' : ''}`}>
                  <Avatar name={u.name} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-900">{u.name}</span><span className="block truncate text-xs text-slate-500">{u.email} · {formatDay(u.createdAt)}</span></span>
                  <StatusBadge value={u.verificationStatus} />
                </button>
              </li>
            ))}
          </ul>
          <Pagination pagination={data?.pagination} onPage={setPage} />
        </div>
        <div className="card p-6 lg:col-span-3">
          {selected ? <UserDetail userId={selected} /> : <EmptyState title="Select a user">Choose a user from the list to see their details and document.</EmptyState>}
        </div>
      </div>
    </>
  );
}
