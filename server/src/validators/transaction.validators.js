import { z } from 'zod';
import { positiveAmount } from './common.js';

export const moneyBody = z.object({ amount: positiveAmount });

export const transferBody = z.object({
  receiverAccountNumber: z
    .string({ required_error: 'Receiver account number is required' })
    .trim()
    .regex(/^\d{12}$/, 'Receiver account number must be 12 digits'),
  amount: positiveAmount,
});

export const openAccountBody = z.object({
  accountType: z.enum(['SAVINGS', 'CURRENT'], { errorMap: () => ({ message: 'Choose Savings or Current' }) }),
});
