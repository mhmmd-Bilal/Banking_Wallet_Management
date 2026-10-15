import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Briefcase, Check, PiggyBank } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { errorMessage, useOpenAccountMutation } from '../../services/api';
import { Alert, ConfirmDialog, PageHeader } from '../../components/ui';

const TYPES = [
  { value: 'SAVINGS', title: 'Savings account', icon: PiggyBank, text: 'Everyday banking for personal use. Deposit, withdraw and send money.' },
  { value: 'CURRENT', title: 'Current account', icon: Briefcase, text: 'Built for frequent, business-style transactions with the same simulated features.' },
];

export default function OpenAccount() {
  const { user, account } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState('SAVINGS');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [openAccount, { isLoading }] = useOpenAccountMutation();

  if (account) return <Navigate to="/account" replace />;
  const verified = user.verificationStatus === 'APPROVED';

  const submit = async () => {
    setError('');
    try {
      await openAccount({ accountType: type }).unwrap();
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Get started" title="Open your bank account" subtitle="Choose the account type you want. Your account number is generated securely and the opening balance is ₹0.00." />
      <div className="space-y-6">
        <Alert type={verified ? 'success' : 'info'} title={verified ? 'Your identity is verified' : 'Verification required before use'}>
          {verified ? 'Your account will be active immediately.' : 'Your account will be created now and activates as soon as an admin approves your identity document.'}
        </Alert>
        <Alert type="error">{error}</Alert>
        <div role="radiogroup" aria-label="Account type" className="grid gap-4 sm:grid-cols-2">
          {TYPES.map(({ value, title, icon: Icon, text }) => {
            const selected = type === value;
            return (
              <button key={value} type="button" role="radio" aria-checked={selected} onClick={() => setType(value)}
                className={`card relative p-6 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lift ${selected ? 'border-brand-500 ring-4 ring-brand-500/10' : ''}`}>
                {selected && <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span>}
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="h-6 w-6" aria-hidden="true" /></span>
                <p className="mt-4 font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{text}</p>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end"><button type="button" className="btn-primary h-11 px-6" onClick={() => setConfirming(true)}>Open {type === 'SAVINGS' ? 'savings' : 'current'} account</button></div>
      </div>
      <ConfirmDialog open={confirming} title="Open bank account" confirmLabel="Open account" busy={isLoading} onConfirm={submit} onCancel={() => setConfirming(false)}>
        Open a <strong>{type === 'SAVINGS' ? 'Savings' : 'Current'}</strong> account? You can hold one account, and the type cannot be changed afterwards.
      </ConfirmDialog>
    </>
  );
}
