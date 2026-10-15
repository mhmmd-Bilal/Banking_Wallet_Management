import { User, Account, Transaction } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { runTransaction } from '../utils/dbTransaction.js';
import { audit } from './auditService.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function listUsers(query) {
  const filter = { role: 'USER' };
  if (query.verificationStatus) filter.verificationStatus = query.verificationStatus;
  if (query.accountStatus) filter.accountStatus = query.accountStatus;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit),
    User.countDocuments(filter),
  ]);
  const accounts = await Account.find({ userId: { $in: users.map((u) => u._id) } });
  const byUser = new Map(accounts.map((a) => [String(a.userId), a]));
  return {
    items: users.map((u) => ({ ...u.toJSON(), account: byUser.get(String(u._id))?.toJSON() ?? null })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

export async function getUserDetail(id) {
  const user = await User.findOne({ _id: id, role: 'USER' });
  if (!user) throw new ApiError(404, 'User not found');
  const account = await Account.findOne({ userId: user._id });
  return { user, account };
}

export async function getDocumentMeta(id) {
  const user = await User.findOne({ _id: id, role: 'USER' });
  const doc = user?.toObject().identityDocument;
  if (!doc?.mimeType || !(doc.storedName || doc.publicId)) throw new ApiError(404, 'Document not found');
  return doc;
}

export async function approveUser(adminId, userId) {
  return runTransaction(async (session) => {
    let user = await User.findOneAndUpdate(
      { _id: userId, role: 'USER', verificationStatus: 'PENDING' },
      { verificationStatus: 'APPROVED' },
      { new: true, session }
    );
    if (!user) {
      const exists = await User.findOne({ _id: userId, role: 'USER' }).session(session);
      if (!exists) throw new ApiError(404, 'User not found');
      throw new ApiError(409, 'User is already verified');
    }
    const account = await Account.findOneAndUpdate(
      { userId: user._id, status: 'PENDING' },
      { status: 'ACTIVE' },
      { new: true, session }
    );
    // The user may not have opened an account yet; it will then be created ACTIVE because they are verified.
    if (account) user = await User.findByIdAndUpdate(user._id, { accountStatus: 'ACTIVE' }, { new: true, session });
    await audit({ actorId: adminId, action: 'USER_VERIFIED', targetId: user._id, metadata: { accountNumber: account?.accountNumber ?? null } }, session);
    return { user, account };
  });
}

async function setAccountStatus(adminId, accountId, from, to, action) {
  return runTransaction(async (session) => {
    const account = await Account.findOneAndUpdate({ _id: accountId, status: from }, { status: to }, { new: true, session });
    if (!account) {
      const exists = await Account.findById(accountId).session(session);
      if (!exists) throw new ApiError(404, 'Account not found');
      throw new ApiError(409, `Account is ${exists.status.toLowerCase()}; only ${from.toLowerCase()} accounts can be ${to === 'FROZEN' ? 'frozen' : 'unfrozen'}`);
    }
    await User.updateOne({ _id: account.userId }, { accountStatus: to }, { session });
    await audit({ actorId: adminId, action, targetId: account._id, metadata: { accountNumber: account.accountNumber } }, session);
    return account;
  });
}

export const freezeAccount = (adminId, accountId) => setAccountStatus(adminId, accountId, 'ACTIVE', 'FROZEN', 'ACCOUNT_FROZEN');
export const unfreezeAccount = (adminId, accountId) => setAccountStatus(adminId, accountId, 'FROZEN', 'ACTIVE', 'ACCOUNT_UNFROZEN');

export async function getReport(query) {
  const match = {};
  const from = query.from ? query.from.date : undefined;
  const to = query.to ? (query.to.dateOnly ? new Date(query.to.date.getTime() + 86_399_999) : query.to.date) : undefined;
  if (from || to) match.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  if (query.type) match.type = query.type;

  const rows = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: { type: '$type', status: '$status' }, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
  ]);

  const types = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'];
  const statuses = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];
  const find = (type, status) => rows.find((r) => r._id.type === type && r._id.status === status);

  // Money-movement figures use SUCCESS transactions only.
  const byType = types.map((type) => {
    const ok = find(type, 'SUCCESS');
    return { type, count: ok?.count ?? 0, amount: ok?.amount ?? 0 };
  });
  const byStatus = statuses.map((status) => ({
    status,
    count: rows.filter((r) => r._id.status === status).reduce((n, r) => n + r.count, 0),
  }));
  const sum = (t) => byType.find((b) => b.type === t);
  return {
    filters: { from: from ?? null, to: to ?? null, type: query.type ?? null },
    totals: {
      totalDeposits: sum('DEPOSIT').amount,
      totalWithdrawals: sum('WITHDRAWAL').amount,
      totalTransfers: sum('TRANSFER').amount,
      depositCount: sum('DEPOSIT').count,
      withdrawalCount: sum('WITHDRAWAL').count,
      transferCount: sum('TRANSFER').count,
      successfulCount: byType.reduce((n, b) => n + b.count, 0),
      successfulAmount: byType.reduce((n, b) => n + b.amount, 0),
      allTransactionCount: byStatus.reduce((n, b) => n + b.count, 0),
    },
    byType,
    byStatus,
  };
}
