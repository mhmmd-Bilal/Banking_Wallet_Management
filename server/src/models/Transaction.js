import mongoose from 'mongoose';
import { applyJsonTransform } from './plugins/jsonTransform.js';
import { makeImmutable } from './plugins/immutable.js';

export const TRANSACTION_TYPES = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'];
export const TRANSACTION_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];

const ref = { type: mongoose.Schema.Types.ObjectId, ref: 'User', immutable: true };

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true, immutable: true },
    reference: { type: String, required: true, unique: true, immutable: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true, immutable: true },
    // Integer paise
    amount: {
      type: Number,
      required: true,
      immutable: true,
      min: 1,
      validate: { validator: Number.isSafeInteger, message: 'Amount must be an integer number of paise' },
    },
    senderId: ref, // absent for deposits
    receiverId: ref, // absent for withdrawals
    senderAccountNumber: { type: String, immutable: true },
    receiverAccountNumber: { type: String, immutable: true },
    // Only SUCCESS records are written by the application; the other values are reserved
    // lifecycle states (no refund feature is implemented).
    status: { type: String, enum: TRANSACTION_STATUSES, required: true, default: 'SUCCESS', immutable: true },
    // Idempotency: one operation key per initiating user
    initiatedBy: { ...ref },
    idempotencyKey: { type: String, immutable: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

transactionSchema.pre('validate', function checkShape(next) {
  if (this.type === 'DEPOSIT' && (!this.receiverId || this.senderId)) {
    return next(new Error('A deposit needs a receiver and no sender'));
  }
  if (this.type === 'WITHDRAWAL' && (!this.senderId || this.receiverId)) {
    return next(new Error('A withdrawal needs a sender and no receiver'));
  }
  if (this.type === 'TRANSFER') {
    if (!this.senderId || !this.receiverId) return next(new Error('A transfer needs a sender and a receiver'));
    if (String(this.senderId) === String(this.receiverId)) return next(new Error('Cannot transfer to the same account'));
  }
  return next();
});

transactionSchema.index({ senderId: 1, createdAt: -1 });
transactionSchema.index({ receiverId: 1, createdAt: -1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ type: 1, status: 1, createdAt: -1 });
transactionSchema.index(
  { initiatedBy: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

makeImmutable(transactionSchema, 'Transaction');
applyJsonTransform(transactionSchema, ['initiatedBy', 'idempotencyKey']);

export const Transaction = mongoose.model('Transaction', transactionSchema);
