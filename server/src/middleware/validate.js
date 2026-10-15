import { ApiError } from '../utils/ApiError.js';

export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(new ApiError(400, errors[0]?.message ? `Validation failed: ${errors[0].message}` : 'Validation failed', errors));
  }
  req[source] = result.data; // unknown keys are stripped by zod
  return next();
};

const KEY_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** Financial POSTs must carry an Idempotency-Key header (client-generated UUID). */
export function requireIdempotencyKey(req, res, next) {
  const key = req.get('idempotency-key');
  if (!key || !KEY_RE.test(key)) {
    return next(new ApiError(400, 'A valid Idempotency-Key header (16-64 chars: letters, digits, _ or -) is required'));
  }
  req.idempotencyKey = key;
  return next();
}
