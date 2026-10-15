import mongoose from 'mongoose';

/**
 * Runs `work(session)` inside a MongoDB transaction.
 * session.withTransaction() re-runs the callback ONLY for TransientTransactionError
 * (nothing has been committed in that case) and retries only the commit step for
 * UnknownTransactionCommitResult, so a committed money movement is never executed twice.
 */
export async function runTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(
      async () => {
        result = await work(session);
      },
      {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
        readPreference: 'primary',
      }
    );
    return result;
  } finally {
    await session.endSession();
  }
}
