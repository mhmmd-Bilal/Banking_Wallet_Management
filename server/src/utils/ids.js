import crypto from 'node:crypto';

export const generateTransactionId = () => `TXN${crypto.randomBytes(10).toString('hex').toUpperCase()}`;
export const generateReference = () => `REF${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
// 12-digit account number from a CSPRNG, first digit never zero
export const generateAccountNumber = () => String(crypto.randomInt(100_000_000_000, 1_000_000_000_000));
