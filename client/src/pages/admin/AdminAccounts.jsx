import { useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { useCreateCustomerMutation, useGetAdminUsersQuery } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { formatPaise } from '../../utils/format';
import { Alert, Avatar, EmptyState, ListSkeleton, Modal, PageHeader, Pagination, StatusBadge } from '../../components/ui';
import UserDetail from '../../components/UserDetail';
import CustomerForm from '../../components/CustomerForm';

export default function AdminAccounts() {
  const [q, setQ] = useState('');
  const [verificationStatus, setVerification] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState('');
  const dq = useDebounce(q.trim());
  const { data, isLoading, isFetching, error } = useGetAdminUsersQuery({ q: dq, verificationStatus, accountStatus, page, limit: 10 });
  const [createCustomer] = useCreateCustomerMutation();
  const change = (setter) => (e) => { setter(e.target.value); setPage(1); };

  return (
    <>
      <PageHeader eyebrow="Administration" title="Account management" subtitle="Add customers, inspect accounts, freeze or unfreeze"
        actions={<button type="button" className="btn-primary" onClick={() => { setCreated(''); setAdding(true); }}><UserPlus className="h-4 w-4" aria-hidden="true" /> Add account</button>} />
      {created && <div className="mb-5"><Alert type="success">{created}</Alert></div>}
      <div className="card overflow-hidden">
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-3">
          <input aria-label="Search users" className="input" placeholder="Search name, email or phone" value={q} onChange={change(setQ)} />
          <select aria-label="Verification status" className="input" value={verificationStatus} onChange={change(setVerification)}>
            <option value="">All verification statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option>
          </select>
          <select aria-label="Account status" className="input" value={accountStatus} onChange={change(setAccountStatus)}>
            <option value="">All account statuses</option><option value="PENDING">Pending</option><option value="ACTIVE">Active</option><option value="FROZEN">Frozen</option>
          </select>
        </div>
        {error && <div className="p-4"><Alert type="error">{error.message}</Alert></div>}
        {isLoading && <ListSkeleton rows={6} />}
        {data && data.items.length === 0 && <EmptyState icon={Users} title="No users match">Try a different search or filter.</EmptyState>}
        {data && data.items.length > 0 && (
          <div className={`overflow-x-auto ${isFetching ? 'opacity-60 transition-opacity' : ''}`}>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/70"><tr><th className="th">User</th><th className="th">Account</th><th className="th">Verification</th><th className="th">Status</th><th className="th text-right">Balance</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((u) => (
                  <tr key={u.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3.5"><div className="flex items-center gap-3"><Avatar name={u.name} /><div><p className="font-medium text-slate-900">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div></div></td>
                    <td className="px-4 py-3.5">{u.account ? <><span className="font-mono text-xs">{u.account.accountNumber}</span><div className="mt-1"><StatusBadge value={u.account.accountType} /></div></> : <span className="text-xs text-slate-400">Not opened</span>}</td>
                    <td className="px-4 py-3.5"><StatusBadge value={u.verificationStatus} /></td>
                    <td className="px-4 py-3.5">{u.account ? <StatusBadge value={u.account.status} /> : '—'}</td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums">{u.account ? formatPaise(u.account.balance) : '—'}</td>
                    <td className="px-4 py-3.5 text-right"><button type="button" className="btn-secondary h-9" onClick={() => setSelected(u.id)}>Manage</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={data?.pagination} onPage={setPage} />
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="User account" wide>
        {selected && <UserDetail userId={selected} />}
      </Modal>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add customer account" wide>
        <CustomerForm mode="admin" submitLabel="Create account"
          onSubmit={(fd) => createCustomer(fd).unwrap()}
          onSuccess={() => { setAdding(false); setCreated('Customer account created.'); }} />
      </Modal>
    </>
  );
}
