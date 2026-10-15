# SimBank — Banking / Wallet Management (academic simulation)

A MERN application that demonstrates secure account management, admin-reviewed identity verification,
deposits, withdrawals, atomic money transfers, transaction consistency and real-time notifications.
**All money is simulated (integer paise stored in MongoDB). No real funds, gateways or external banking APIs.**

## Technology stack
- **Client:** React 18 + Vite, JavaScript/JSX, React Router, Tailwind CSS 3, **Redux Toolkit (RTK Query)** for all API access, Socket.IO Client, Lucide React
- **Server:** Node.js, Express, MongoDB + Mongoose, JWT (HTTP-only cookie), bcrypt, Socket.IO, Multer, **Cloudinary** (private KYC storage), dotenv, cors, helmet, express-rate-limit, Zod
- **Tests:** `node:test`, supertest, socket.io-client, mongodb-memory-server (in-memory replica set)

## Project layout
```
client/   React app (components, pages, layouts, context, hooks, services, utils)
server/   Express API (config, models, controllers, services, routes, middleware, validators, utils, socket, seeds, tests)
docs/     Postman collection
```

## Installation
Requires Node 20+ and a MongoDB **replica set** (see below).
```bash
cd server && cp .env.example .env && npm install     # edit .env
cd ../client && cp .env.example .env && npm install
```

### MongoDB configuration (transactions are mandatory)
Money transfers use MongoDB multi-document transactions, which only work on a replica set or Atlas.
- **Atlas:** use the connection string in `MONGODB_URI`.
- **Local:** start a single-node replica set, e.g.
  `mongod --dbpath ./data --replSet rs0` then once: `mongosh --eval 'rs.initiate()'`,
  and use `MONGODB_URI=mongodb://127.0.0.1:27017/banking_wallet?replicaSet=rs0`.
The server refuses to start on a standalone MongoDB and says why.

### Environment variables (server/.env)
| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Replica-set / Atlas connection string (required) |
| `JWT_SECRET` | ≥ 32 random characters (required) |
| `CLIENT_URL` | Exact browser origin allowed by CORS/CSRF/Socket.IO (default `http://localhost:5173`) |
| `PORT`, `NODE_ENV` | Server port; `production` enables `Secure` cookies |
| `BANK_IFSC`, `BANK_BRANCH` | Stored on each new account |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | KYC document storage. **Required in production** (the server refuses to start without them) |
| `UPLOAD_DIR` | Local fallback directory, used only in development/tests when Cloudinary is not configured |
| `TRUST_PROXY` | `true` when behind one reverse proxy (needed for correct rate limiting) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD` | Seed credentials (never commit real ones) |

## Running
```bash
cd server && npm run seed      # optional: wipes the target DB and loads consistent sample data
cd server && npm run dev       # API on :5000
cd client && npm run dev       # UI on :5173 (Vite proxies /api and /socket.io to the API)
```
Seed data: 1 admin, 5 customers (2 active, 1 frozen, 2 pending), deposits, withdrawals, transfers and notifications.
Balances are *derived* from the seeded ledger, so they always match the transactions.

## Tests
```bash
cd server && npm test
```
Uses an in-memory replica set and a separate database (`banking_test`); it never touches your dev data.
`mongodb-memory-server` downloads a `mongod` binary on first run (needs network access).

## How it works
**Authentication.** `POST /api/auth/login` sets an HTTP-only, `SameSite=Strict` JWT cookie (`Secure` in production).
The role is read from the database on every request, not from the token. CSRF defence: every state-changing request
must carry `X-Requested-With: XMLHttpRequest` and, if present, an `Origin` equal to `CLIENT_URL`; CORS only allows `CLIENT_URL`.

**Opening an account.** Registration creates only the user (status `PENDING`); no account is created automatically.
After registering, the customer opens their own account from **Open account** (`POST /api/accounts`, choosing Savings or Current).
The server generates the account number and sets the balance to ₹0 (client-supplied balances are ignored). One account per user is enforced by a
unique index. The account is `ACTIVE` immediately if the user is already verified, otherwise `PENDING` until approval.
Admins can also onboard a customer with **Add account** (`POST /api/admin/users`): the customer is created with an account, either verified and
active straight away or queued for document review.

**Verification workflow.** Register (with ID document) → user `PENDING` → customer opens an account → admin reviews the document
→ approve → user `APPROVED`, account `ACTIVE` (if the user has not opened an account yet, it is created `ACTIVE` when they do). Verification status and account status are separate: an approved user can be `FROZEN`.
Documents are validated by magic bytes (PDF/JPG/PNG, 5 MB max) and then uploaded to **Cloudinary as `authenticated` (private) assets** — there is no
public URL. An admin viewing a document triggers the server to build a 60-second signed download URL, fetch the bytes and stream them through
the authenticated `/api/admin/users/:id/document` route. Files uploaded before Cloudinary was enabled remain readable from local disk.
Without Cloudinary credentials (dev/test only) files go to a private local directory under random names.

**Freeze behaviour.** Frozen accounts cannot deposit, withdraw, send or receive. The check is repeated *inside* the database
transaction as part of each conditional update, so freezing during processing is respected.

**Deposit / withdrawal.** Amounts are strings in rupees validated to ≤ 2 decimals and converted to integer paise server-side.
A withdrawal is a single conditional atomic update (`balance >= amount`) plus the transaction record in one DB transaction,
so concurrent withdrawals cannot overspend.

**Atomic transfer.** Inside one `session.withTransaction`: validate sender/receiver → conditional debit (`status ACTIVE`,
`balance >= amount`) → credit → create the immutable Transaction, the receiver Notification and an AuditLog entry → commit.
Any failure aborts everything (no partial debit). The sender always comes from the session.
`withTransaction` only re-runs the callback for *transient* errors (nothing committed) and retries only the commit step when the
commit outcome is unknown, so a committed transfer is never executed twice.

**Idempotency.** Every financial POST requires an `Idempotency-Key` header (the UI generates a UUID per distinct request and re-uses it
on retry). A unique index on `(initiatedBy, idempotencyKey)` makes concurrent duplicates abort; the loser receives the original result
(`200`, `replayed: true`). Re-using a key with a different payload returns `409`.

**Socket.IO.** Connections authenticate with the same cookie (and an Origin check). The server puts each socket in `user:<id>`;
there is no client-callable join event. Events (`balance:update`, `transaction:new`, `notification:new`) are emitted *after commit*
only to the involved users; emit failures are swallowed and never affect committed money. Offline users read persisted
notifications after logging in, and the client re-syncs on reconnect.

**Immutability.** Transaction and AuditLog schemas reject updates/deletes through Mongoose and no API route exposes them.
(Raw driver access or `bulkWrite` is outside the application's protection; use database permissions in a real deployment.)

## Frontend data layer
All HTTP goes through one RTK Query API slice (`client/src/services/api.js`): cookie credentials, the CSRF header, normalised errors, and tag-based
cache invalidation (a transfer, a socket event or an admin action refreshes exactly the lists that changed). Balances are never updated optimistically:
they come from the mutation response or a socket event. Idempotency keys are sent per request as a header.

## API summary
All responses: `{ "success": true|false, "message": "...", "data": {} }` (errors add `"errors": []`). Amounts in responses are integer **paise**.
Mutating requests need `X-Requested-With: XMLHttpRequest`; financial POSTs also need `Idempotency-Key`.

| Method & path | Role | Notes |
|---|---|---|
| POST `/api/auth/register` | public | multipart: name, email, phone, dateOfBirth (YYYY-MM-DD), address, identityType, identityNumber, password, identityDocument |
| POST `/api/auth/login` · `/logout` · GET `/me` | — | |
| POST `/api/accounts` `{accountType: "SAVINGS"\|"CURRENT"}` | USER | open own account (one per user) |
| GET `/api/accounts/me` · `/me/balance` | USER | 404 until an account is opened |
| POST `/api/transactions/deposit` `{amount}` · `/withdraw` `{amount}` | USER, active | amount like `"100.50"` |
| POST `/api/transactions/transfer` `{receiverAccountNumber, amount}` | USER, active | |
| GET `/api/transactions/my` | USER | `q,type,status,from,to,minAmount,maxAmount,sortBy,order,page,limit` |
| GET `/api/transactions/:transactionId` | USER | participants only (404 otherwise) |
| GET `/api/notifications` · `/unread-count` · PATCH `/:id/read` | USER | own only |
| POST `/api/admin/users` (multipart: registration fields + `accountType`, `activate`) | ADMIN | create a customer with an account |
| GET `/api/admin/users` (`q,verificationStatus,accountStatus,page,limit`) · `/users/pending` · `/users/:id` · `/users/:id/document` | ADMIN | |
| PATCH `/api/admin/users/:id/verify` · `/accounts/:id/freeze` · `/accounts/:id/unfreeze` | ADMIN | |
| GET `/api/admin/transactions` · `/transactions/:transactionId` · `/reports` | ADMIN | reports filter: `from,to,type` |

Example transfer:
```http
POST /api/transactions/transfer
Idempotency-Key: 6f1c2f6e-9a67-4c7e-bd10-6d0f2b0d3a11
X-Requested-With: XMLHttpRequest
{ "receiverAccountNumber": "123456789012", "amount": "250.25" }
```
```json
{ "success": true, "message": "Transfer completed successfully",
  "data": { "transaction": { "transactionId": "TXN…", "reference": "REF…", "type": "TRANSFER", "amount": 25025, "status": "SUCCESS", "direction": "DEBIT" },
            "balance": 74975, "replayed": false } }
```
A Postman collection is in `docs/postman_collection.json` (uses a cookie jar; set the `baseUrl` variable).

## Known limitations
- Logout clears the cookie but does not revoke the JWT server-side (it expires after 1 day).
- Date filters from the UI use the user's local day; date-only API values are interpreted as UTC days.
- Admin accounts are created only by the seed script (no self-service admin creation, by design).
- One bank account per user (the original rule). Supporting several accounts per user would touch every financial flow and is not included.
- Existing production users who registered before this change already have an auto-created account and keep it; no data migration is needed. Existing local KYC files are not migrated to Cloudinary.
- Cloudinary behaviour (private upload + signed download of PDFs/images) is implemented per the SDK documentation but was not exercised against a live Cloudinary account.
- Failed financial attempts are recorded in AuditLog, not as Transaction documents (the `FAILED`/`PENDING`/`REFUNDED` statuses exist in the schema but no refund feature is implemented).
