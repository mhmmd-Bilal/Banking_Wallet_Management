import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { COOKIE_NAME, cookieOptions, signToken } from '../utils/token.js';
import { getProfile, loginUser, registerUser } from '../services/authService.js';

export const register = asyncHandler(async (req, res) => {
  const { user, account } = await registerUser(req.body, req.file);
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
  sendSuccess(res, 'Registration successful. Your identity documents are awaiting admin review.', { user, account }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const user = await loginUser(req.body.email, req.body.password);
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
  sendSuccess(res, 'Login successful', await getProfile(user));
});

export const logout = asyncHandler(async (req, res) => {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE_NAME, opts);
  sendSuccess(res, 'Logged out');
});

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, 'Authenticated user', await getProfile(req.user));
});
