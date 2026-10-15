import { useGetAdminTransactionQuery, useGetAdminTransactionsQuery } from '../../services/api';
import { PageHeader } from '../../components/ui';
import TransactionsView from '../../components/TransactionsView';

export default function AdminTransactions() {
  return (
    <>
      <PageHeader eyebrow="Monitoring" title="Transaction monitoring" subtitle="All transactions across the platform (read-only)" />
      <TransactionsView admin useList={useGetAdminTransactionsQuery} useDetail={useGetAdminTransactionQuery} />
    </>
  );
}
