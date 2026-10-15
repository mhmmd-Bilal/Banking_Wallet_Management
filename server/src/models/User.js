import mongoose from "mongoose";
import { applyJsonTransform } from "./plugins/jsonTransform.js";

export const ROLES = Object.freeze({ USER: "USER", ADMIN: "ADMIN" });
export const VERIFICATION_STATUSES = ["PENDING", "APPROVED"];
export const ACCOUNT_STATUSES = ["PENDING", "ACTIVE", "FROZEN"];
export const ID_TYPES = [
  "AADHAAR",
  "PAN",
  "PASSPORT",
  "VOTER_ID",
  "DRIVING_LICENSE",
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    dateOfBirth: { type: Date, required: true },
    address: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 300,
    },
    identityDetails: {
      type: { type: String, enum: ID_TYPES, required: true },
      number: { type: String, required: true, trim: true, maxlength: 30 },
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: "PENDING",
      required: true,
    },
    // Mirror of Account.status kept in sync by the admin service (Account is the source of truth for money).
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: "PENDING",
      required: true,
    },
    identityDocument: {
      provider: { type: String, enum: ["local", "cloudinary"] },
      storedName: { type: String }, // local driver
      publicId: { type: String }, // cloudinary driver
      resourceType: { type: String },
      format: { type: String },
      originalName: { type: String },
      mimeType: { type: String },
      size: { type: Number },
    },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, verificationStatus: 1, createdAt: -1 });
userSchema.index({ accountStatus: 1 });
applyJsonTransform(userSchema, [
  "passwordHash",
  "identityDocument.storedName",
  "identityDocument.publicId",
  "identityDocument.provider",
  "identityDocument.resourceType",
  "identityDocument.format",
]);

export const User = mongoose.model("User", userSchema);
