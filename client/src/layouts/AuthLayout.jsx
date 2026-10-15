import { Landmark, LockKeyhole, ShieldCheck, Zap } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';

const POINTS = [
  [ShieldCheck, 'Admin-verified identity', 'Every customer is reviewed before money can move.'],
  [LockKeyhole, 'Atomic, consistent transfers', 'Debit and credit succeed together or not at all.'],
  [Zap, 'Real-time notifications', 'Balances and alerts update the moment a transfer lands.'],
];

export default function AuthLayout() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" aria-hidden="true" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-violet-600 shadow-glow"><Landmark className="h-5 w-5" aria-hidden="true" /></span>
          <span className="text-xl font-semibold tracking-tight">SimBank</span>
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white">Banking, built on trust and precision.</h2>
          <p className="mt-4 text-slate-300">A secure simulation of modern account management with simulated funds only.</p>
          <ul className="mt-10 space-y-6">
            {POINTS.map(([Icon, title, text]) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10"><Icon className="h-5 w-5 text-brand-200" aria-hidden="true" /></span>
                <div><p className="font-medium text-white">{title}</p><p className="text-sm text-slate-400">{text}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">Academic simulation · simulated funds only</p>
      </aside>

      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-8">
        <Link to="/" className="mb-8 flex items-center gap-2 text-xl font-semibold text-slate-900 lg:hidden">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white"><Landmark className="h-5 w-5" aria-hidden="true" /></span> SimBank
        </Link>
        <div className="page w-full max-w-xl"><Outlet /></div>
      </main>
    </div>
  );
}
