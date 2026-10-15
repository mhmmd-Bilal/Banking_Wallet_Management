import { Account } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Early, friendly gate for financial operations: verified user + ACTIVE account.
 * The services re-check account status atomically inside the database transaction,
 * so this is not the only line of defence.
 */
export const requireActiveAccount = asyncHandler(async (req, res, next) => {
  if (req.user.verificationStatus !== 'APPROVED') {
    throw new ApiError(403, 'Your identity verification is pending admin approval');
  }
  const account = await Account.findOne({ userId: req.user._id });
  if (!account) throw new ApiError(403, 'Open a bank account before using financial features');
  if (account.status === 'PENDING') throw new ApiError(403, 'Your account is not active yet');
  if (account.status === 'FROZEN') throw new ApiError(403, 'Your account is frozen. Please contact support');
  req.account = account;
  next();
});
