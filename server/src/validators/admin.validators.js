import { z } from 'zod';

const empty = z.literal('').transform(() => undefined);

export const adminUserQuery = z.object({
  q: z.string().trim().max(60).optional(),
  verificationStatus: z.enum(['PENDING', 'APPROVED']).optional().or(empty),
  accountStatus: z.enum(['PENDING', 'ACTIVE', 'FROZEN']).optional().or(empty),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
