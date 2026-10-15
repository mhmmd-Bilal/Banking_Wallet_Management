import { z } from 'zod';
import { ID_TYPES } from '../models/User.js';

const dob = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD')
  .transform((s) => new Date(`${s}T00:00:00.000Z`))
  .refine((d) => !Number.isNaN(d.getTime()), 'Invalid date of birth')
  .refine((d) => {
    const now = new Date();
    let age = now.getUTCFullYear() - d.getUTCFullYear();
    const m = now.getUTCMonth() - d.getUTCMonth();
    if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
    return age >= 18 && age <= 120;
  }, 'You must be at least 18 years old');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s-]/g, ''))
    .refine((s) => /^(\+91)?[6-9]\d{9}$/.test(s), 'Enter a valid 10-digit Indian mobile number')
    .transform((s) => s.slice(-10)),
  dateOfBirth: dob,
  address: z.string().trim().min(5, 'Address must be at least 5 characters').max(300),
  identityType: z.enum(ID_TYPES, { errorMap: () => ({ message: 'Select a valid identity document type' }) }),
  identityNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{4,30}$/, 'Identity number must be 4-30 letters, digits or hyphens'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[a-z]/, 'Password needs a lowercase letter')
    .regex(/[A-Z]/, 'Password needs an uppercase letter')
    .regex(/\d/, 'Password needs a digit'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required').max(72),
});

// Admin-created customers: same fields as registration plus account options.
export const adminCreateCustomerSchema = registerSchema.extend({
  accountType: z.enum(['SAVINGS', 'CURRENT']).default('SAVINGS'),
  activate: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
});
