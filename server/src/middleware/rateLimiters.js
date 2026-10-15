import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => env.disableRateLimit,
    message: { success: false, message, errors: [] },
  });

export const globalLimiter = make(
  15 * 60 * 1000,
  600,
  "Too many requests, please try again later",
);
export const authLimiter = make(
  15 * 60 * 1000,
  30,
  "Too many authentication attempts, please try again later",
);
export const financialLimiter = make(
  60 * 1000,
  30,
  "Too many financial requests, please slow down",
);
