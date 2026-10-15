import { z } from 'zod';
import { parseRupeesToPaise } from '../utils/money.js';

export const objectIdParam = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id') });
export const transactionIdParam = z.object({ id: z.string().regex(/^TXN[A-F0-9]{20}$/, 'Invalid transaction id') });

const amountMessage = 'Amount must be a positive number with at most 2 decimals (max 1,00,00,000)';

/** Rupee string/number -> integer paise. Strict: no exponents, no more than 2 decimals. */
export const positiveAmount = z.union([z.string(), z.number()], { errorMap: () => ({ message: amountMessage }) }).transform((v, ctx) => {
  const paise = parseRupeesToPaise(v);
  if (paise === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: amountMessage });
    return z.NEVER;
  }
  return paise;
});

const optionalAmount = z.string().trim().optional().transform((v, ctx) => {
  if (v === undefined || v === '') return undefined;
  const paise = parseRupeesToPaise(v, { allowZero: true });
  if (paise === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount filter must be a valid rupee amount' });
    return z.NEVER;
  }
  return paise;
});

const dateBound = z.string().trim().optional().transform((v, ctx) => {
  if (v === undefined || v === '') return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date' });
    return z.NEVER;
  }
  // date-only strings are treated as whole UTC days
  return { date: d, dateOnly: /^\d{4}-\d{2}-\d{2}$/.test(v) };
});

export const transactionQuery = z
  .object({
    q: z.string().trim().max(40).optional(),
    type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']).optional().or(z.literal('').transform(() => undefined)),
    status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED']).optional().or(z.literal('').transform(() => undefined)),
    from: dateBound,
    to: dateBound,
    minAmount: optionalAmount,
    maxAmount: optionalAmount,
    sortBy: z.enum(['createdAt', 'amount']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .refine((v) => v.minAmount === undefined || v.maxAmount === undefined || v.minAmount <= v.maxAmount, {
    message: 'Minimum amount cannot exceed maximum amount',
    path: ['minAmount'],
  })
  .refine((v) => !v.from || !v.to || v.from.date <= v.to.date, {
    message: 'Start date cannot be after end date',
    path: ['from'],
  });

export const reportQuery = z
  .object({
    from: dateBound,
    to: dateBound,
    type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']).optional().or(z.literal('').transform(() => undefined)),
  })
  .refine((v) => !v.from || !v.to || v.from.date <= v.to.date, {
    message: 'Start date cannot be after end date',
    path: ['from'],
  });
