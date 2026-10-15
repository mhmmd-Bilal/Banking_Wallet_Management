import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Bell, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { createSocket } from '../services/socket';
import { appApi, useGetUnreadCountQuery } from '../services/api';

const RealtimeContext = createContext(null);
export const useRealtime = () => useContext(RealtimeContext);

export function RealtimeProvider({ children }) {
  const { user, setBalance } = useAuth();
  const dispatch = useDispatch();
  const isUser = user?.role === 'USER';
  const { data: unreadData } = useGetUnreadCountQuery(undefined, { skip: !isUser });
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  const pushToast = useCallback((message) => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 7000);
  }, []);

  useEffect(() => {
    if (!isUser) return undefined;
    const socket = createSocket();
    // Tag invalidation makes every mounted list (history, dashboard, notifications, badge) refetch itself
    const refresh = () => dispatch(appApi.util.invalidateTags(['Transactions', 'Notifications', 'Unread']));
    socket.on('balance:update', ({ balance }) => setBalance(balance));
    socket.on('transaction:new', refresh);
    socket.on('notification:new', (n) => { refresh(); pushToast(n.message); });
    socket.on('connect', refresh); // re-sync anything missed while offline / disconnected
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isUser]);

  const value = useMemo(() => ({ unread: isUser ? unreadData?.count ?? 0 : 0 }), [isUser, unreadData]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex animate-pop-in items-start gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-lift">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-brand-500 to-brand-700 text-white"><Bell className="h-4 w-4" aria-hidden="true" /></span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">Money received</p>
              <p className="text-sm text-slate-600">{t.message}</p>
            </div>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </RealtimeContext.Provider>
  );
}
