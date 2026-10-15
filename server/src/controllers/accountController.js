import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { getAccountForUser, openOwnAccount } from '../services/accountService.js';

export const myAccount = asyncHandler(async (req, res) => {
  sendSuccess(res, 'Account details', { account: await getAccountForUser(req.user._id) });
});

export const myBalance = asyncHandler(async (req, res) => {
  const account = await getAccountForUser(req.user._id);
  sendSuccess(res, 'Current balance', { balance: account.balance, currency: 'INR', status: account.status });
});

export const openAccount = asyncHandler(async (req, res) => {
  const account = await openOwnAccount(req.user._id, req.body.accountType);
  sendSuccess(res, account.status === 'ACTIVE' ? 'Bank account opened and active' : 'Bank account opened. It will activate once your identity is verified', { account }, 201);
});
