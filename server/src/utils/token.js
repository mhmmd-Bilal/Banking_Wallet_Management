import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const COOKIE_NAME = "token";

export const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    algorithm: "HS256",
  });

export const verifyToken = (token) =>
  jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });

export const cookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.SAMESITE,
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
});
