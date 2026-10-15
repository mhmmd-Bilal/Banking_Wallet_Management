import mongoose from 'mongoose';
import { applyJsonTransform } from './plugins/jsonTransform.js';
import { ACCOUNT_STATUSES } from './User.js';

const accountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, immutable: true },
    accountNumber: { type: String, required: true, unique: true, immutable: true, match: /^\d{12}$/ },
    ifsc: { type: String, required: true },
    branch: { type: String, required: true },
    accountType: { type: String, enum: ['SAVINGS', 'CURRENT'], default: 'SAVINGS', required: true },
    // Integer paise. Never set from client input; changed only by atomic $inc in services.
    balance: {
      type: Number,
      default: 0,
      min: 0,
      validate: { validator: Number.isSafeInteger, message: 'Balance must be an integer number of paise' },
    },
    status: { type: String, enum: ACCOUNT_STATUSES, default: 'PENDING', required: true },
  },
  { timestamps: true }
);

applyJsonTransform(accountSchema);

export const Account = mongoose.model('Account', accountSchema);
