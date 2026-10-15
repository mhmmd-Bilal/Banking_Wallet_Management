import { Transaction } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function toBound(b, isEnd) {
  if (!b) return undefined;
  if (b.dateOnly && isEnd) return new Date(b.date.getTime() + 24 * 60 * 60 * 1000 - 1);
  return b.date;
}

export function buildFilter(query, scopeUserId) {
  const and = [];
  if (scopeUserId) and.push({ $or: [{ senderId: scopeUserId }, { receiverId: scopeUserId }] });
  if (query.q) {
    const rx = new RegExp(`^${escapeRegex(query.q)}`, 'i');
    and.push({ $or: [{ transactionId: rx }, { reference: rx }] });
  }
  if (query.type) and.push({ type: query.type });
  if (query.status) and.push({ status: query.status });
  const from = toBound(query.from, false);
  const to = toBound(query.to, true);
  if (from || to) {
    const range = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    and.push({ createdAt: range });
  }
  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    const range = {};
    if (query.minAmount !== undefined) range.$gte = query.minAmount;
    if (query.maxAmount !== undefined) range.$lte = query.maxAmount;
    and.push({ amount: range });
  }
  return and.length ? { $and: and } : {};
}

const party = (user, accountNumber) =>
  user || accountNumber ? { name: user?.name ?? null, accountNumber: accountNumber ?? null } : null;

export function serialize(tx, viewerId) {
  const sender = party(tx.senderId && tx.senderId.name ? tx.senderId : null, tx.senderAccountNumber);
  const receiver = party(tx.receiverId && tx.receiverId.name ? tx.receiverId : null, tx.receiverAccountNumber);
  const out = {
    id: String(tx._id),
    transactionId: tx.transactionId,
    reference: tx.reference,
    type: tx.type,
    amount: tx.amount,
    status: tx.status,
    createdAt: tx.createdAt,
    sender,
    receiver,
  };
  if (viewerId) {
    const sid = String(tx.senderId?._id ?? tx.senderId ?? '');
    out.direction = sid === String(viewerId) ? 'DEBIT' : 'CREDIT';
  }
  return out;
}

export async function listTransactions(query, scopeUserId) {
  const filter = buildFilter(query, scopeUserId);
  const sort = { [query.sortBy]: query.order === 'asc' ? 1 : -1, _id: -1 };
  const skip = (query.page - 1) * query.limit;
  const [docs, total] = await Promise.all([
    Transaction.find(filter).sort(sort).skip(skip).limit(query.limit)
      .populate('senderId', 'name').populate('receiverId', 'name'),
    Transaction.countDocuments(filter),
  ]);
  return {
    items: docs.map((d) => serialize(d, scopeUserId)),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

/** scopeUserId = null means admin (any transaction). Non-participants get 404, not 403. */
export async function getTransaction(transactionId, scopeUserId) {
  const filter = { transactionId };
  if (scopeUserId) filter.$or = [{ senderId: scopeUserId }, { receiverId: scopeUserId }];
  const tx = await Transaction.findOne(filter).populate('senderId', 'name').populate('receiverId', 'name');
  if (!tx) throw new ApiError(404, 'Transaction not found');
  return serialize(tx, scopeUserId);
}
