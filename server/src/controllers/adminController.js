import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as admin from '../services/adminService.js';
import { getTransaction, listTransactions } from '../services/transactionQueryService.js';
import { createCustomer as createCustomerAccount } from '../services/authService.js';
import { readDocument } from '../utils/fileStorage.js';
import { ApiError } from '../utils/ApiError.js';

export const users = asyncHandler(async (req, res) => {
  sendSuccess(res, 'Users', await admin.listUsers(req.query));
});

export const pendingUsers = asyncHandler(async (req, res) => {
  sendSuccess(res, 'Pending verification requests', await admin.listUsers({ ...req.query, verificationStatus: 'PENDING' }));
});

export const userDetail = asyncHandler(async (req, res) => {
  sendSuccess(res, 'User details', await admin.getUserDetail(req.params.id));
});

export const userDocument = asyncHandler(async (req, res) => {
  const meta = await admin.getDocumentMeta(req.params.id);
  const bytes = await readDocument(meta); // local disk or Cloudinary (signed, 60 s URL, fetched server-side)
  res.set({
    'Content-Type': meta.mimeType,
    'Content-Disposition': 'inline; filename="identity-document"',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  });
  res.send(bytes);
});

export const createCustomer = asyncHandler(async (req, res) => {
  const { activate, accountType, ...fields } = req.body;
  if (!activate && !req.file) {
    throw new ApiError(400, 'An identity document is required unless the account is activated immediately', [
      { field: 'identityDocument', message: 'Upload an identity document or activate the account now' },
    ]);
  }
  const result = await createCustomerAccount(fields, req.file, { actorId: req.user._id, verified: activate, accountType, withAccount: true });
  sendSuccess(res, activate ? 'Customer account created and activated' : 'Customer account created and queued for verification', result, 201);
});

export const verify = asyncHandler(async (req, res) => {
  sendSuccess(res, 'User verified and account activated', await admin.approveUser(req.user._id, req.params.id));
});

export const freeze = asyncHandler(async (req, res) => {
  sendSuccess(res, 'Account frozen', { account: await admin.freezeAccount(req.user._id, req.params.id) });
});

export const unfreeze = asyncHandler(async (req, res) => {
  sendSuccess(res, 'Account unfrozen', { account: await admin.unfreezeAccount(req.user._id, req.params.id) });
});

export const transactions = asyncHandler(async (req, res) => {
  sendSuccess(res, 'Transactions', await listTransactions(req.query, null));
});

export const transactionDetail = asyncHandler(async (req, res) => {
  sendSuccess(res, 'Transaction details', { transaction: await getTransaction(req.params.id, null) });
});

export const reports = asyncHandler(async (req, res) => {
  sendSuccess(res, 'Transaction report', await admin.getReport(req.query));
});
