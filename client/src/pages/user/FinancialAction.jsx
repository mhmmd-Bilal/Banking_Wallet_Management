import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, Loader2, Lock, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { errorMessage, fieldErrors, useDepositMutation, useTransferMutation, useWithdrawMutation } from '../../services/api';
import { formatPaise, rupeesToPaise, validateAmount } from '../../utils/format';
import { Alert, ConfirmDialog, EmptyState, Field, PageHeader } from '../../components/ui';

const CONFIG = {
  deposit: { title: 'Deposit money', subtitle: 'Add simulated funds to your account', icon: ArrowDownToLine, verb: 'Deposit' },
  withdraw: { title: 'Withdraw money', subtitle: 'Take simulated funds out of your account', icon: ArrowUpFromLine, verb: 'Withdraw' },
  transfer: { title: 'Transfer money', subtitle: 'Send funds to another SimBank account', icon: Send, verb: 'Transfer' },
};

function FinancialAction({ kind }) {
  const cfg = CONFIG[kind];
  const Icon = cfg.icon;
  const { account, setBalance } = useAuth();
  const [deposit] = useDepositMutation();
  const [withdraw] = useWithdrawMutation();
  const [transfer] = useTransferMutation();
  const call = { deposit, withdraw, transfer }[kind];
  const [amount, setAmount] = useState('');
  const [receiver, setReceiver] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  // One idempotency key per distinct request. A retry of the same request (e.g. after a timeout)
  // re-uses the key, so the server can never apply it twice.
  const attempt = useRef({ sig: '', key: '' });

  if (account?.status !== 'ACTIVE') {
    const message = !account
      ? <>You need a bank account first. <Link to="/open-account" className="font-semibold text-brand-600 hover:underline">Open your account</Link>.</>
      : <>{account.status === 'FROZEN' ? 'Your account is frozen.' : 'Your account has not been activated yet.'} See your <Link to="/verification" className="font-semibold text-brand-600 hover:underline">verification status</Link>.</>;
    return (
      <>
        <PageHeader title={cfg.title} subtitle={cfg.subtitle} />
        <div className="card"><EmptyState icon={Lock} title="This action is unavailable">{message}</EmptyState></div>
      </>
    );
  }

  const validate = () => {
    const e = {};
    const amountError = validateAmount(amount);
    if (amountError) e.amount = amountError;
    else if (kind !== 'deposit' && rupeesToPaise(amount) > account.balance) e.amount = 'Amount exceeds your available balance';
    if (kind === 'transfer') {
      if (!/^\d{12}$/.test(receiver.trim())) e.receiverAccountNumber = 'Enter the 12-digit receiver account number';
      else if (receiver.trim() === account.accountNumber) e.receiverAccountNumber = 'You cannot transfer to your own account';
    }
    return e;
  };

  const onSubmit = (ev) => {
    ev.preventDefault();
    setResult(null);
    setError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) setConfirming(true);
  };

  const execute = async () => {
    const amt = amount.trim();
    const rcv = receiver.trim();
    const sig = `${kind}|${rcv}|${amt}`;
    if (attempt.current.sig !== sig) attempt.current = { sig, key: crypto.randomUUID() };
    setBusy(true);
    setError('');
    try {
      const body = kind === 'transfer' ? { receiverAccountNumber: rcv, amount: amt } : { amount: amt };
      const res = await call({ body, key: attempt.current.key }).unwrap();
      setBalance(res.balance); // server-confirmed balance
      setResult(res);
      setAmount('');
      setReceiver('');
      attempt.current = { sig: '', key: '' };
    } catch (e) {
      setError(errorMessage(e));
      setErrors(fieldErrors(e));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Money" title={cfg.title} subtitle={cfg.subtitle} />
      <div className="grid gap-5 lg:grid-cols-3">
        <form onSubmit={onSubmit} className="card space-y-5 p-7 lg:col-span-2" noValidate>
          {result && (
            <Alert type="success" title={result.replayed ? 'Already processed' : `${cfg.verb} successful`}>
              Reference <span className="font-mono">{result.transaction.reference}</span> · New balance <strong>{formatPaise(result.balance)}</strong>
            </Alert>
          )}
          <Alert type="error">{error}</Alert>
          {kind === 'transfer' && (
            <Field label="Receiver account number" htmlFor="receiver" error={errors.receiverAccountNumber}>
              <input id="receiver" inputMode="numeric" maxLength={12} className="input font-mono tracking-wider" placeholder="12-digit account number" value={receiver} onChange={(e) => setReceiver(e.target.value.replace(/\D/g, ''))} aria-invalid={!!errors.receiverAccountNumber} />
            </Field>
          )}
          <Field label="Amount" htmlFor="amount" error={errors.amount} hint="Up to 2 decimal places">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
              <input id="amount" inputMode="decimal" className="input pl-8 text-base font-medium" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!errors.amount} />
            </div>
          </Field>
          <button type="submit" className="btn-primary h-11 px-6" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />} {cfg.verb}
          </button>
        </form>
        <div className="relative h-fit overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 to-brand-900 p-6 text-white shadow-lift">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/30 blur-2xl" aria-hidden="true" />
          <p className="relative text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Available balance</p>
          <p className="relative mt-2 text-3xl font-semibold tracking-tight">{formatPaise(account.balance)}</p>
          <p className="relative mt-4 text-xs text-slate-400">Balances are always confirmed by the server.</p>
        </div>
      </div>
      <ConfirmDialog open={confirming} title={`Confirm ${cfg.verb.toLowerCase()}`} confirmLabel={`Confirm ${cfg.verb.toLowerCase()}`} busy={busy} onConfirm={execute} onCancel={() => setConfirming(false)}>
        <p>
          {kind === 'deposit' && <>Deposit <strong>₹{amount.trim()}</strong> into your account?</>}
          {kind === 'withdraw' && <>Withdraw <strong>₹{amount.trim()}</strong> from your account?</>}
          {kind === 'transfer' && <>Send <strong>₹{amount.trim()}</strong> to account <span className="font-mono">{receiver.trim()}</span>? This cannot be undone.</>}
        </p>
      </ConfirmDialog>
    </>
  );
}

export const DepositPage = () => <FinancialAction kind="deposit" />;
export const WithdrawPage = () => <FinancialAction kind="withdraw" />;
export const TransferPage = () => <FinancialAction kind="transfer" />;
