import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie auth, layered with SameSite=Strict cookies and the CORS allow-list:
 * state-changing requests must carry a custom header (which cross-site forms cannot send and
 * cross-origin scripts can only send after a CORS preflight we only grant to CLIENT_URL),
 * and a present Origin header must match CLIENT_URL.
 */
export function csrfGuard(req, res, next) {
  if (SAFE.has(req.method)) return next();
  if (req.get('x-requested-with') !== 'XMLHttpRequest') {
    return next(new ApiError(403, 'Missing CSRF protection header'));
  }
  const origin = req.get('origin');
  if (origin && origin !== env.clientUrl) return next(new ApiError(403, 'Origin not allowed'));
  return next();
}
