import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { COOKIE_NAME, verifyToken } from '../utils/token.js';

/** Verifies the JWT cookie and loads the CURRENT user (role is taken from the DB, not the token). */
export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new ApiError(401, 'Authentication required');
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired session');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'Account no longer exists');
  req.user = user;
  next();
});
