import { useState } from 'react';
import { CheckCircle2, Circle, Clock, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Alert, PageHeader, StatusBadge } from '../../components/ui';

function Step({ done, current, title, children, last }) {
  const Icon = done ? CheckCircle2 : current ? Clock : Circle;
  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {!last && <span className={`absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} aria-hidden="true" />}
      <Icon className={`relative z-10 mt-0.5 h-6 w-6 shrink-0 rounded-full bg-white ${done ? 'text-emerald-500' : current ? 'text-amber-500' : 'text-slate-300'}`} aria-hidden="true" />
      <div><p className="font-medium text-slate-900">{title}</p><p className="mt-0.5 text-sm text-slate-500">{children}</p></div>
    </li>
  );
}

export default function Verification() {
  const { user, account, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const approved = user.verificationStatus === 'APPROVED';
  const reload = async () => { setBusy(true); await refresh(); setBusy(false); };

  return (
    <>
      <PageHeader eyebrow="Compliance" title="Verification status" subtitle="Identity verification is reviewed by an administrator"
        actions={<button type="button" className="btn-secondary" onClick={reload} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh</button>} />
      <div className="card space-y-7 p-7">
        <div className="flex flex-wrap gap-8">
          <div><p className="eyebrow mb-1.5">Verification</p><StatusBadge value={user.verificationStatus} /></div>
          <div><p className="eyebrow mb-1.5">Account</p>{account ? <StatusBadge value={account.status} /> : <span className="text-sm text-slate-500">Not opened</span>}</div>
        </div>
        <ol>
          <Step done title="Registered">Your details and identity document were submitted.</Step>
          <Step done={!!account} current={!account} title="Bank account opened">{account ? 'Your account has been created.' : <>Choose an account type — <Link to="/open-account" className="font-semibold text-brand-600 hover:underline">open your account</Link>.</>}</Step>
          <Step done={approved} current={!approved} title="Admin review">{approved ? 'Your identity was verified.' : 'An administrator is reviewing your document.'}</Step>
          <Step last done={account?.status === 'ACTIVE' || account?.status === 'FROZEN'} title="Account activated">Deposits, withdrawals and transfers are available.</Step>
        </ol>
        {account?.status === 'FROZEN' && <Alert type="error" title="Account frozen">Your account was verified but is currently frozen by an administrator.</Alert>}
        {account?.status === 'ACTIVE' && <Alert type="success">Your account is active. You can use all financial features.</Alert>}
      </div>
    </>
  );
}
