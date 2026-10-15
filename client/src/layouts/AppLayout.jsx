import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine, ArrowUpFromLine, BarChart3, Bell, ClipboardCheck, History, Landmark, LayoutDashboard,
  LogOut, Menu, PlusCircle, Send, ShieldCheck, Users, Wallet, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { Alert, Avatar } from '../components/ui';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/verification', label: 'Verification', icon: ClipboardCheck },
  { to: '/admin/accounts', label: 'Accounts', icon: Users },
  { to: '/admin/transactions', label: 'Transactions', icon: History },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

function userLinks(hasAccount) {
  return [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    hasAccount
      ? { to: '/account', label: 'Account', icon: Wallet }
      : { to: '/open-account', label: 'Open account', icon: PlusCircle },
    { to: '/deposit', label: 'Deposit', icon: ArrowDownToLine },
    { to: '/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
    { to: '/transfer', label: 'Transfer', icon: Send },
    { to: '/transactions', label: 'Transactions', icon: History },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: true },
    { to: '/verification', label: 'Verification', icon: ShieldCheck },
  ];
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-2 text-white">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-violet-600 shadow-glow"><Landmark className="h-5 w-5" aria-hidden="true" /></span>
      <span className="text-lg font-semibold tracking-tight">SimBank</span>
    </Link>
  );
}

export default function AppLayout() {
  const { user, account, logout } = useAuth();
  const { unread } = useRealtime();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isAdmin = user.role === 'ADMIN';
  const links = isAdmin ? ADMIN_LINKS : userLinks(!!account);

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const nav = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Main navigation">
      {links.map(({ to, label, icon: Icon, badge, end }) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
          className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-brand-400" aria-hidden="true" />}
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {badge && unread > 0 && <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white" aria-label={`${unread} unread`}>{unread}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const profile = (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-slate-400">{isAdmin ? 'Administrator' : 'Customer'}</p>
        </div>
        <button type="button" onClick={onLogout} aria-label="Log out" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" /></button>
      </div>
    </div>
  );

  const Sidebar = (
    <>
      <div className="px-4 py-5"><Brand /></div>
      {nav}
      {profile}
    </>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-ink-900 to-ink-950 lg:flex">{Sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 animate-pop-in flex-col bg-gradient-to-b from-ink-900 to-ink-950 shadow-lift">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            {Sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
            <span className="hidden items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20 sm:inline-flex">Simulation · no real money</span>
          </div>
          <div className="flex items-center gap-2">
            {!isAdmin && (
              <Link to="/notifications" className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
                <Bell className="h-5 w-5" />
                {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
              </Link>
            )}
            <div className="ml-1 hidden items-center gap-2.5 sm:flex"><Avatar name={user.name} className="h-8 w-8 text-xs" /><span className="text-sm font-medium text-slate-700">{user.name}</span></div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
          {!isAdmin && !account && (
            <div className="mb-6">
              <Alert type="info" title="You don't have a bank account yet" action={<Link to="/open-account" className="btn-primary h-9 shrink-0">Open account</Link>}>
                Open a Savings or Current account to start depositing, withdrawing and transferring.
              </Alert>
            </div>
          )}
          {!isAdmin && account?.status === 'PENDING' && (
            <div className="mb-6"><Alert type="warning" title="Verification pending">Your identity documents are being reviewed. Financial actions unlock once an admin approves your account.</Alert></div>
          )}
          {!isAdmin && account?.status === 'FROZEN' && (
            <div className="mb-6"><Alert type="error" title="Account frozen">Financial actions are disabled while your account is frozen. Please contact support.</Alert></div>
          )}
          <div className="page"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
