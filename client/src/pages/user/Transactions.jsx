import { useGetMyTransactionQuery, useListMyTransactionsQuery } from '../../services/api';
import { PageHeader } from '../../components/ui';
import TransactionsView from '../../components/TransactionsView';

export default function Transactions() {
  return (
    <>
      <PageHeader eyebrow="Activity" title="Transaction history" subtitle="Search, filter and review your transactions" />
      <TransactionsView useList={useListMyTransactionsQuery} useDetail={useGetMyTransactionQuery} />
    </>
  );
}
