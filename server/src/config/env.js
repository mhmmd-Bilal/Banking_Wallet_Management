import "dotenv/config";
import path from "node:path";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32)
  throw new Error("JWT_SECRET must be at least 32 characters long");

const cloudinary = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
};
const cloudinaryConfigured = Boolean(
  cloudinary.cloudName && cloudinary.apiKey && cloudinary.apiSecret,
);
if (nodeEnv === "production" && !cloudinaryConfigured) {
  throw new Error(
    "Cloudinary is required in production: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET",
  );
}

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === "production",
  isTest: nodeEnv === "test",
  port: Number(process.env.PORT) || 5000,
  mongoUri: required("MONGODB_URI"),
  jwtSecret,
  jwtExpiresIn: "1d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  cookieSecure: nodeEnv === "production",
  ifsc: process.env.BANK_IFSC || "SIMB0000001",
  branch: process.env.BANK_BRANCH || "Main Branch",
  uploadDir: path.resolve(process.env.UPLOAD_DIR || "storage/kyc"),
  maxUploadBytes: 5 * 1024 * 1024,
  cloudinary,
  // Cloudinary whenever configured (always in production); local disk only for dev/tests without credentials
  storageDriver:
    cloudinaryConfigured && nodeEnv !== "test" ? "cloudinary" : "local",
  // Number of reverse proxies in front of the API (Vercel rewrite + Render = 2). "true" means 1.
  trustProxy:
    process.env.TRUST_PROXY === "true"
      ? 1
      : Math.max(0, parseInt(process.env.TRUST_PROXY || "0", 10) || 0),
  disableRateLimit: process.env.DISABLE_RATE_LIMIT === "true",
});
