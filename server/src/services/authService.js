import bcrypt from 'bcrypt';
import { User, Account } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { runTransaction } from '../utils/dbTransaction.js';
import { isDuplicateKey } from '../utils/dbErrors.js';
import { deleteDocument, saveDocument } from '../utils/fileStorage.js';
import { createAccount } from './accountService.js';
import { audit } from './auditService.js';

const BCRYPT_ROUNDS = 12;
// Used to keep login timing similar for unknown emails
const DUMMY_HASH = bcrypt.hashSync('timing-equalisation-password', BCRYPT_ROUNDS);

const emailTaken = () =>
  new ApiError(409, 'An account with this email already exists', [{ field: 'email', message: 'Email is already registered' }]);

/**
 * Shared by self-registration and admin-created accounts.
 * role is always USER; statuses come from `verified`, never from request data.
 */
export async function createCustomer(fields, file, { actorId = null, verified = false, accountType = 'SAVINGS', withAccount = false } = {}) {
  if (await User.exists({ email: fields.email })) throw emailTaken();

  const passwordHash = await bcrypt.hash(fields.password, BCRYPT_ROUNDS);
  const identityDocument = file ? await saveDocument(file) : undefined; // validates magic bytes, stores privately
  const status = verified ? 'ACTIVE' : 'PENDING';

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await runTransaction(async (session) => {
          const [user] = await User.create(
            [{
              name: fields.name,
              email: fields.email,
              phone: fields.phone,
              dateOfBirth: fields.dateOfBirth,
              address: fields.address,
              identityDetails: { type: fields.identityType, number: fields.identityNumber },
              passwordHash,
              role: 'USER',
              verificationStatus: verified ? 'APPROVED' : 'PENDING',
              accountStatus: withAccount ? status : 'PENDING',
              ...(identityDocument && { identityDocument }),
            }],
            { session }
          );
          const account = withAccount ? await createAccount(user._id, session, { status, accountType }) : null;
          await audit(
            actorId
              ? { actorId, action: 'USER_CREATED_BY_ADMIN', targetId: user._id, metadata: { email: user.email, activated: verified, accountType } }
              : { actorId: user._id, action: 'USER_REGISTERED', targetId: user._id, metadata: { email: user.email } },
            session
          );
          return { user, account };
        });
      } catch (err) {
        if (isDuplicateKey(err, 'accountNumber') && attempt < 2) continue; // astronomically rare; regenerate
        throw err;
      }
    }
    throw new ApiError(500, 'Could not create account');
  } catch (err) {
    await deleteDocument(identityDocument);
    if (isDuplicateKey(err, 'email')) throw emailTaken();
    throw err;
  }
}

export async function registerUser(fields, file) {
  if (!file) {
    throw new ApiError(400, 'Identity document is required', [{ field: 'identityDocument', message: 'Identity document is required' }]);
  }
  return createCustomer(fields, file);
}

export async function loginUser(email, password) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, 'Invalid email or password');
  return user;
}

export async function getProfile(user) {
  const account = user.role === 'USER' ? await Account.findOne({ userId: user._id }) : null;
  return { user, account };
}
