import mongoose from 'mongoose';
import { applyJsonTransform } from './plugins/jsonTransform.js';
import { makeImmutable } from './plugins/immutable.js';

export const AUDIT_ACTIONS = [
  'USER_REGISTERED', 'USER_CREATED_BY_ADMIN', 'ACCOUNT_OPENED', 'USER_VERIFIED', 'ACCOUNT_FROZEN', 'ACCOUNT_UNFROZEN',
  'DEPOSIT_SUCCESS', 'WITHDRAWAL_SUCCESS', 'TRANSFER_SUCCESS',
  'DEPOSIT_FAILED', 'WITHDRAWAL_FAILED', 'TRANSFER_FAILED',
];

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
makeImmutable(auditLogSchema, 'AuditLog');
applyJsonTransform(auditLogSchema);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
