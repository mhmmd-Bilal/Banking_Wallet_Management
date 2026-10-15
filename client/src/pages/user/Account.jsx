import { Link } from 'react-router-dom';
import { PlusCircle, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DetailList, EmptyState, PageHeader, StatusBadge } from '../../components/ui';
import { formatDate, formatPaise } from '../../utils/format';

export default function Account() {
  const { account } = useAuth();
  if (!account) {
    return (
      <>
        <PageHeader title="Account details" />
        <div className="card"><EmptyState icon={Wallet} title="No bank account yet" action={<Link to="/open-account" className="btn-primary"><PlusCircle className="h-4 w-4" aria-hidden="true" /> Open account</Link>}>Open a Savings or Current account to see its details here.</EmptyState></div>
      </>
    );
  }
  return (
    <>
      <PageHeader eyebrow="Account" title="Account details" subtitle="Your simulated bank account" />
      <div className="card p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-6">
          <div>
            <p className="eyebrow">Current balance</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{formatPaise(account.balance)}</p>
          </div>
          <div className="flex gap-2"><StatusBadge value={account.accountType} /><StatusBadge value={account.status} /></div>
        </div>
        <DetailList items={[
          ['Account number', <span key="n" className="font-mono tracking-wider">{account.accountNumber}</span>],
          ['IFSC', account.ifsc],
          ['Branch', account.branch],
          ['Account type', account.accountType.charAt(0) + account.accountType.slice(1).toLowerCase()],
          ['Account status', <StatusBadge key="s" value={account.status} />],
          ['Opened', formatDate(account.createdAt)],
        ]} />
      </div>
    </>
  );
}
