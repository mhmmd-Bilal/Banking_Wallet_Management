import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { errorMessage, useListNotificationsQuery, useMarkNotificationReadMutation } from '../../services/api';
import { formatDate } from '../../utils/format';
import { Alert, EmptyState, ListSkeleton, PageHeader, Pagination } from '../../components/ui';

export default function Notifications() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useListNotificationsQuery({ page, limit: 10 });
  const [markRead, { isLoading: marking, originalArgs }] = useMarkNotificationReadMutation();
  const [actionError, setActionError] = useState('');

  const onMark = async (id) => {
    setActionError('');
    try { await markRead(id).unwrap(); } catch (e) { setActionError(errorMessage(e)); }
  };

  return (
    <>
      <PageHeader eyebrow="Alerts" title="Notifications" subtitle={data ? `${data.unread} unread` : undefined} />
      <div className="card overflow-hidden">
        {(error || actionError) && <div className="p-4"><Alert type="error">{error?.message || actionError}</Alert></div>}
        {isLoading && <ListSkeleton rows={4} />}
        {data && data.items.length === 0 && <EmptyState icon={Bell} title="You're all caught up">You will be notified here when you receive a transfer.</EmptyState>}
        <ul className="divide-y divide-slate-100">
          {data?.items.map((n) => (
            <li key={n.id} className={`flex items-start gap-4 px-5 py-4 ${n.read ? '' : 'bg-brand-50/50'}`}>
              <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${n.read ? 'bg-slate-100 text-slate-400' : 'bg-brand-100 text-brand-600'}`}><Bell className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${n.read ? 'text-slate-600' : 'font-medium text-slate-900'}`}>{n.message}</p>
                <p className="mt-0.5 text-xs text-slate-500">{formatDate(n.createdAt)}{n.read ? '' : ' · Unread'}</p>
              </div>
              {!n.read && (
                <button type="button" className="btn-secondary h-8 px-3 text-xs" disabled={marking && originalArgs === n.id} onClick={() => onMark(n.id)}>
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" /> Mark as read
                </button>
              )}
            </li>
          ))}
        </ul>
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </div>
    </>
  );
}
