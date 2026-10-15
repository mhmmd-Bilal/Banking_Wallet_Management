import mongoose from 'mongoose';
import { applyJsonTransform } from './plugins/jsonTransform.js';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    type: { type: String, enum: ['TRANSFER_RECEIVED'], required: true, immutable: true },
    message: { type: String, required: true, maxlength: 300, immutable: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
applyJsonTransform(notificationSchema);

export const Notification = mongoose.model('Notification', notificationSchema);
