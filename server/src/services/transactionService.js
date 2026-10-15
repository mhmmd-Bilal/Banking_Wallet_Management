import { Account, Transaction, Notification } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { runTransaction } from '../utils/dbTransaction.js';
import { isDuplicateKey } from '../utils/dbErrors.js';
import { generateReference, generateTransactionId } from '../utils/ids.js';
import { MAX_BALANCE_PAISE, formatPaise } from '../utils/money.js';
import { audit, auditSafe } from './auditService.js';

const MAX_ID_ATTEMPTS = 3;

/** Explains why an atomic conditional update matched nothing (read inside the same session). */
function accountProblem(account, { needsFunds = 0, label = 'Your' } = {}) {
  if (!account) return new ApiError(404, 'Account not found');
  if (account.status === 'PENDING') return new ApiError(403, `${label} account is not active yet`);
  if (account.status === 'FROZEN') return new ApiError(403, `${label} account is frozen`);
  if (needsFunds && account.balance < needsFunds) return new ApiError(422, 'Insufficient balance');
  return new ApiError(422, 'Operation would exceed the maximum allowed balance');
}

/** Finds an earlier operation with the same idempotency key from the same user. */
async function findReplay(initiatedBy, key, expected) {
  const existing = await Transaction.findOne({ initiatedBy, idempotencyKey: key });
  if (!existing) return null;
  const same =
    existing.type === expected.type &&
    existing.amount === expected.amount &&
    (expected.receiverAccountNumber === undefined || existing.receiverAccountNumber === expected.receiverAccountNumber);
  if (!same) {
    throw new ApiError(409, 'This Idempotency-Key was already used for a different request');
  }
  return existing;
}

async function replayResult(tx, userId) {
  const account = await Account.findOne({ userId });
  return { transaction: tx, replayed: true, balances: [], balance: account?.balance ?? 0 };
}

/**
 * Shared driver: replay check -> transaction -> duplicate-key handling.
 *  - duplicate idempotency key (concurrent double-submit): the loser's transaction aborts,
 *    nothing is applied, and the original result is returned.
 *  - duplicate generated id/reference (practically impossible): nothing was committed,
 *    so a fresh attempt with new identifiers is safe.
 */
async function execute({ userId, key, expected, failureAction, failureTarget, failureMeta, work }) {
  const replay = await findReplay(userId, key, expected);
  if (replay) return replayResult(replay, userId);

  try {
    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
      try {
        return await runTransaction(work);
      } catch (err) {
        if (isDuplicateKey(err, 'idempotencyKey')) {
          const winner = await findReplay(userId, key, expected);
          if (winner) return await replayResult(winner, userId);
        }
        if ((isDuplicateKey(err, 'transactionId') || isDuplicateKey(err, 'reference')) && attempt < MAX_ID_ATTEMPTS - 1) continue;
        throw err;
      }
    }
    throw new ApiError(500, 'Could not complete the operation');
  } catch (err) {
    if (err instanceof ApiError) {
      await auditSafe({
        actorId: userId,
        action: failureAction,
        targetId: failureTarget,
        metadata: { ...failureMeta, reason: err.message },
      });
    }
    throw err;
  }
}

export async function deposit(userId, amount, key) {
  return execute({
    userId,
    key,
    expected: { type: 'DEPOSIT', amount },
    failureAction: 'DEPOSIT_FAILED',
    failureTarget: userId,
    failureMeta: { amount },
    work: async (session) => {
      const account = await Account.findOneAndUpdate(
        { userId, status: 'ACTIVE', balance: { $lte: MAX_BALANCE_PAISE - amount } },
        { $inc: { balance: amount } },
        { new: true, session }
      );
      if (!account) {
        throw accountProblem(await Account.findOne({ userId }).session(session));
      }
      const [tx] = await Transaction.create(
        [{
          transactionId: generateTransactionId(),
          reference: generateReference(),
          type: 'DEPOSIT',
          amount,
          receiverId: userId,
          receiverAccountNumber: account.accountNumber,
          status: 'SUCCESS',
          initiatedBy: userId,
          idempotencyKey: key,
        }],
        { session }
      );
      await audit({ actorId: userId, action: 'DEPOSIT_SUCCESS', targetId: tx._id, metadata: { amount, reference: tx.reference } }, session);
      return { transaction: tx, replayed: false, balance: account.balance, balances: [{ userId, balance: account.balance }] };
    },
  });
}

export async function withdraw(userId, amount, key) {
  return execute({
    userId,
    key,
    expected: { type: 'WITHDRAWAL', amount },
    failureAction: 'WITHDRAWAL_FAILED',
    failureTarget: userId,
    failureMeta: { amount },
    work: async (session) => {
      // Conditional atomic debit: the balance check and the decrement are one operation,
      // so concurrent withdrawals can never overspend.
      const account = await Account.findOneAndUpdate(
        { userId, status: 'ACTIVE', balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true, session }
      );
      if (!account) {
        throw accountProblem(await Account.findOne({ userId }).session(session), { needsFunds: amount });
      }
      const [tx] = await Transaction.create(
        [{
          transactionId: generateTransactionId(),
          reference: generateReference(),
          type: 'WITHDRAWAL',
          amount,
          senderId: userId,
          senderAccountNumber: account.accountNumber,
          status: 'SUCCESS',
          initiatedBy: userId,
          idempotencyKey: key,
        }],
        { session }
      );
      await audit({ actorId: userId, action: 'WITHDRAWAL_SUCCESS', targetId: tx._id, metadata: { amount, reference: tx.reference } }, session);
      return { transaction: tx, replayed: false, balance: account.balance, balances: [{ userId, balance: account.balance }] };
    },
  });
}

export async function transfer({ senderId, senderName, receiverAccountNumber, amount, key }) {
  return execute({
    userId: senderId,
    key,
    expected: { type: 'TRANSFER', amount, receiverAccountNumber },
    failureAction: 'TRANSFER_FAILED',
    failureTarget: senderId,
    failureMeta: { amount, receiverAccountNumber },
    work: async (session) => {
      // 1. Validate both accounts inside the transaction snapshot
      const senderAccount = await Account.findOne({ userId: senderId }).session(session);
      if (!senderAccount) throw new ApiError(404, 'Your account was not found');
      const receiverAccount = await Account.findOne({ accountNumber: receiverAccountNumber }).session(session);
      if (!receiverAccount) throw new ApiError(404, 'Receiver account not found');
      if (String(receiverAccount.userId) === String(senderId)) {
        throw new ApiError(400, 'You cannot transfer money to your own account');
      }
      if (senderAccount.status !== 'ACTIVE') throw accountProblem(senderAccount);
      if (receiverAccount.status !== 'ACTIVE') {
        throw new ApiError(422, 'Receiver account is not active or is frozen');
      }

      // 2. Conditional atomic debit (also re-checks status: covers "frozen while processing")
      const debited = await Account.findOneAndUpdate(
        { _id: senderAccount._id, status: 'ACTIVE', balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true, session }
      );
      if (!debited) {
        throw accountProblem(await Account.findById(senderAccount._id).session(session), { needsFunds: amount });
      }

      // 3. Credit. If this fails, throwing aborts the transaction and the debit is rolled back.
      const credited = await Account.findOneAndUpdate(
        { _id: receiverAccount._id, status: 'ACTIVE', balance: { $lte: MAX_BALANCE_PAISE - amount } },
        { $inc: { balance: amount } },
        { new: true, session }
      );
      if (!credited) {
        throw new ApiError(422, 'Receiver account cannot accept this transfer right now');
      }

      // 4. Immutable record + persistent notification + audit entry, in the same transaction
      const [tx] = await Transaction.create(
        [{
          transactionId: generateTransactionId(),
          reference: generateReference(),
          type: 'TRANSFER',
          amount,
          senderId,
          receiverId: receiverAccount.userId,
          senderAccountNumber: senderAccount.accountNumber,
          receiverAccountNumber: receiverAccount.accountNumber,
          status: 'SUCCESS',
          initiatedBy: senderId,
          idempotencyKey: key,
        }],
        { session }
      );
      const [notification] = await Notification.create(
        [{
          userId: receiverAccount.userId,
          type: 'TRANSFER_RECEIVED',
          message: `You received ${formatPaise(amount)} from ${senderName} (Ref: ${tx.reference})`,
        }],
        { session }
      );
      await audit({
        actorId: senderId,
        action: 'TRANSFER_SUCCESS',
        targetId: tx._id,
        metadata: { amount, reference: tx.reference, receiverAccountNumber },
      }, session);

      return {
        transaction: tx,
        replayed: false,
        balance: debited.balance,
        notification,
        balances: [
          { userId: senderId, balance: debited.balance },
          { userId: receiverAccount.userId, balance: credited.balance },
        ],
      };
    },
  });
}

