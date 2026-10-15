import { Account, User } from "../models/index.js";
import { env } from "../config/env.js";
import { generateAccountNumber } from "../utils/ids.js";
import { ApiError } from "../utils/ApiError.js";
import { runTransaction } from "../utils/dbTransaction.js";
import { isDuplicateKey } from "../utils/dbErrors.js";
import { audit } from "./auditService.js";

export async function createAccount(
  userId,
  session,
  { status = "PENDING", accountType = "SAVINGS" } = {},
) {
  const [account] = await Account.create(
    [
      {
        userId,
        accountNumber: generateAccountNumber(),
        ifsc: env.ifsc,
        branch: env.branch,
        accountType,
        balance: 0,
        status,
      },
    ],
    { session },
  );
  return account;
}

export async function getAccountForUser(userId) {
  const account = await Account.findOne({ userId });
  if (!account) throw new ApiError(404, "Account not found");
  return account;
}

/**
 * A customer opens their own (single) bank account. It is ACTIVE straight away when the
 * user's identity is already verified, otherwise PENDING until an admin approves them.
 * One account per user is enforced by the unique index on Account.userId.
 */
export async function openOwnAccount(userId, accountType) {
  const already = () => new ApiError(409, "You already have a bank account");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await runTransaction(async (session) => {
        const user = await User.findOne({ _id: userId, role: "USER" }).session(
          session,
        );
        if (!user) throw new ApiError(404, "User not found");
        if (await Account.exists({ userId }).session(session)) throw already();
        const status =
          user.verificationStatus === "APPROVED" ? "ACTIVE" : "PENDING";
        const account = await createAccount(userId, session, {
          status,
          accountType,
        });
        await User.updateOne(
          { _id: userId },
          { accountStatus: status },
          { session },
        );
        await audit(
          {
            actorId: userId,
            action: "ACCOUNT_OPENED",
            targetId: account._id,
            metadata: { accountType, status },
          },
          session,
        );
        return account;
      });
    } catch (err) {
      if (isDuplicateKey(err, "userId")) throw already();
      if (isDuplicateKey(err, "accountNumber") && attempt < 2) continue;
      throw err;
    }
  }
  throw new ApiError(500, "Could not open account");
}
