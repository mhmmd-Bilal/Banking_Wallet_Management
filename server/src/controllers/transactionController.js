import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as txService from '../services/transactionService.js';
import { getTransaction, listTransactions, serialize } from '../services/transactionQueryService.js';
import { publishCommitted } from '../services/realtimeService.js';
import { Transaction } from '../models/index.js';

async function respond(res, result, userId, successMessage) {
  if (!result.replayed) publishCommitted(result); // after commit only
  const tx = await Transaction.findById(result.transaction._id).populate('senderId', 'name').populate('receiverId', 'name');
  sendSuccess(
    res,
    result.replayed ? 'This request was already processed; returning the original result' : successMessage,
    { transaction: serialize(tx, userId), balance: result.balance, replayed: result.replayed },
    result.replayed ? 200 : 201
  );
}

export const deposit = asyncHandler(async (req, res) => {
  const result = await txService.deposit(req.user._id, req.body.amount, req.idempotencyKey);
  await respond(res, result, req.user._id, 'Deposit completed successfully');
});

export const withdraw = asyncHandler(async (req, res) => {
  const result = await txService.withdraw(req.user._id, req.body.amount, req.idempotencyKey);
  await respond(res, result, req.user._id, 'Withdrawal completed successfully');
});

export const transfer = asyncHandler(async (req, res) => {
  const result = await txService.transfer({
    senderId: req.user._id, // always from the authenticated session
    senderName: req.user.name,
    receiverAccountNumber: req.body.receiverAccountNumber,
    amount: req.body.amount,
    key: req.idempotencyKey,
  });
  await respond(res, result, req.user._id, 'Transfer completed successfully');
});

export const myTransactions = asyncHandler(async (req, res) => {
  sendSuccess(res, 'Transactions', await listTransactions(req.query, req.user._id));
});

export const myTransaction = asyncHandler(async (req, res) => {
  sendSuccess(res, 'Transaction details', { transaction: await getTransaction(req.params.id, req.user._id) });
});
