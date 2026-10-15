import { emitToUser } from '../socket/index.js';

const brief = (tx) => ({
  transactionId: tx.transactionId,
  reference: tx.reference,
  type: tx.type,
  amount: tx.amount,
  createdAt: tx.createdAt,
});

/**
 * Called ONLY after the database transaction has committed. Emission failures are
 * swallowed: a socket problem must never affect (or appear to reverse) committed money.
 */
export function publishCommitted({ transaction, balances = [], notification }) {
  try {
    for (const { userId, balance } of balances) {
      emitToUser(userId, 'balance:update', { balance });
      emitToUser(userId, 'transaction:new', brief(transaction));
    }
    if (notification) {
      emitToUser(notification.userId, 'notification:new', notification.toJSON());
    }
  } catch (err) {
    console.error('[socket] emit failed (transfer remains committed):', err.message);
  }
}
