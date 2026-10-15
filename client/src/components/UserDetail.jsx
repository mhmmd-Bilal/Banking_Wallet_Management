import { useEffect, useState } from 'react';
import { FileText, Loader2, Snowflake } from 'lucide-react';
import {
  errorMessage, useFreezeAccountMutation, useGetAdminUserQuery, useLazyGetAdminDocumentQuery,
  useUnfreezeAccountMutation, useVerifyUserMutation,
} from '../services/api';
import { formatDate, formatDay, formatPaise } from '../utils/format';
import { Alert, ConfirmDialog, DetailList, ListSkeleton, StatusBadge } from './ui';

/** The document is fetched as a blob with the admin's cookie; there is no public URL. */
function DocumentViewer({ userId, meta }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState('');
  const [loadDocument, { isFetching }] = useLazyGetAdminDocumentQuery();

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => { setUrl(null); setError(''); }, [userId]);

  const load = async () => {
    setError('');
    try {
      const blob = await loadDocument(userId).unwrap();
      setUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (!meta) return <Alert type="warning">No document uploaded.</Alert>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-brand-600 shadow-sm"><FileText className="h-4 w-4" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{meta.originalName} <span className="text-slate-400">({Math.ceil(meta.size / 1024)} KB)</span></span>
        {!url && <button type="button" className="btn-secondary h-9" onClick={load} disabled={isFetching}>{isFetching && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} View document</button>}
        {url && <button type="button" className="btn-secondary h-9" onClick={() => setUrl(null)}>Hide</button>}
      </div>
      <Alert type="error">{error}</Alert>
      {url && (meta.mimeType.startsWith('image/')
        ? <img src={url} alt="Submitted identity document" className="max-h-96 rounded-xl border border-slate-200" />
        : <iframe src={url} title="Submitted identity document" className="h-96 w-full rounded-xl border border-slate-200" />)}
    </div>
  );
}

/** Admin panel for one user: details, document, and the verify / freeze / unfreeze actions. */
export default function UserDetail({ userId }) {
  const { data, isLoading, error } = useGetAdminUserQuery(userId);
  const [verify] = useVerifyUserMutation();
  const [freeze] = useFreezeAccountMutation();
  const [unfreeze] = useUnfreezeAccountMutation();
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { setMessage({ type: '', text: '' }); }, [userId]);

  if (isLoading) return <ListSkeleton rows={3} />;
  if (error) return <Alert type="error">{error.message}</Alert>;
  if (!data) return null;
  const { user, account } = data;

  const run = async () => {
    setBusy(true);
    setMessage({ type: '', text: '' });
    try {
      if (action === 'verify') await verify(user.id).unwrap();
      if (action === 'freeze') await freeze(account.id).unwrap();
      if (action === 'unfreeze') await unfreeze(account.id).unwrap();
      setMessage({ type: 'success', text: { verify: 'User verified.', freeze: 'Account frozen.', unfreeze: 'Account unfrozen.' }[action] });
    } catch (e) {
      setMessage({ type: 'error', text: errorMessage(e) });
    } finally {
      setBusy(false);
      setAction(null);
    }
  };

  const labels = {
    verify: ['Approve verification', `Approve ${user.name}? ${account ? 'Their account will become active.' : 'They have not opened an account yet; it will be active as soon as they open one.'}`],
    freeze: ['Freeze account', `Freeze ${user.name}'s account? They will not be able to deposit, withdraw, send or receive money.`],
    unfreeze: ['Unfreeze account', `Unfreeze ${user.name}'s account and restore financial access?`],
  };

  return (
    <div className="space-y-6">
      <Alert type={message.type || 'info'}>{message.text}</Alert>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={user.verificationStatus} />
        {account ? <StatusBadge value={account.status} /> : <span className="text-xs font-medium text-slate-500">No account opened</span>}
        <div className="ml-auto flex gap-2">
          {user.verificationStatus === 'PENDING' && <button type="button" className="btn-primary" onClick={() => setAction('verify')}>Approve verification</button>}
          {account?.status === 'ACTIVE' && <button type="button" className="btn-danger" onClick={() => setAction('freeze')}><Snowflake className="h-4 w-4" aria-hidden="true" /> Freeze</button>}
          {account?.status === 'FROZEN' && <button type="button" className="btn-primary" onClick={() => setAction('unfreeze')}>Unfreeze</button>}
        </div>
      </div>
      <DetailList items={[
        ['Name', user.name], ['Email', user.email], ['Phone', user.phone], ['Date of birth', formatDay(user.dateOfBirth)],
        ['Address', user.address], ['Registered', formatDate(user.createdAt)],
        ['Identity type', user.identityDetails?.type], ['Identity number', user.identityDetails?.number],
        ['Account number', account?.accountNumber ?? '—'], ['IFSC / Branch', account ? `${account.ifsc} · ${account.branch}` : '—'],
        ['Account type', account?.accountType ?? '—'], ['Balance', account ? formatPaise(account.balance) : '—'],
      ]} />
      <div>
        <h3 className="eyebrow mb-2">Identity document</h3>
        <DocumentViewer userId={user.id} meta={user.identityDocument?.originalName ? user.identityDocument : null} />
      </div>
      <ConfirmDialog open={!!action} title={action ? labels[action][0] : ''} confirmLabel={action ? labels[action][0] : ''} danger={action === 'freeze'} busy={busy} onConfirm={run} onCancel={() => setAction(null)}>
        {action && labels[action][1]}
      </ConfirmDialog>
    </div>
  );
}
