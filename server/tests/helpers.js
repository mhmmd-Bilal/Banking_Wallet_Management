import { MongoMemoryReplSet } from 'mongodb-memory-server';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
export const PASSWORD = 'Str0ngPassw0rd';

export async function bootstrap() {
  const repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = `${repl.getUri()}banking_test`; // separate test database
  process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.DISABLE_RATE_LIMIT = 'true';
  process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'kyc-'));
  const { connectDB, disconnectDB } = await import('../src/config/db.js');
  const { createApp } = await import('../src/app.js');
  const models = await import('../src/models/index.js');
  await connectDB();
  const { default: request } = await import('supertest');
  const app = createApp();
  return {
    app, request, models, repl,
    agent: () => request.agent(app),
    async close() { await disconnectDB(); await repl.stop(); },
    async reset() { for (const m of Object.values(models)) if (m.deleteMany) await m.collection.deleteMany({}); },
  };
}

export const csrf = { 'X-Requested-With': 'XMLHttpRequest' };
export const key = () => crypto.randomUUID();

export async function registerUser(ctx, n, overrides = {}) {
  const agent = ctx.agent();
  const email = overrides.email || `user${n}@example.com`;
  const res = await agent.post('/api/auth/register').set(csrf)
    .field('name', overrides.name || `User ${n}`)
    .field('email', email)
    .field('phone', `98765${String(10000 + n)}`)
    .field('dateOfBirth', '1995-05-05')
    .field('address', '12 Test Street, Kochi')
    .field('identityType', 'AADHAAR')
    .field('identityNumber', `ID${100000 + n}`)
    .field('password', PASSWORD)
    .attach('identityDocument', overrides.file || PDF, { filename: 'id.pdf', contentType: 'application/pdf' });
  return { agent, res, email };
}

export async function createAdmin(ctx) {
  const bcrypt = (await import('bcrypt')).default;
  await ctx.models.User.create({
    name: 'Admin', email: 'admin@example.com', phone: '9000000000', dateOfBirth: new Date('1980-01-01'),
    address: 'HQ Office', identityDetails: { type: 'PAN', number: 'ADMIN1' },
    passwordHash: await bcrypt.hash(PASSWORD, 4), role: 'ADMIN', verificationStatus: 'APPROVED', accountStatus: 'ACTIVE',
  });
  const agent = ctx.agent();
  await agent.post('/api/auth/login').set(csrf).send({ email: 'admin@example.com', password: PASSWORD });
  return agent;
}

/** Registers a user, has the admin approve them, and returns { agent, user, account }. */
export async function activeUser(ctx, admin, n) {
  const { agent } = await registerUser(ctx, n);
  const me = await agent.get('/api/auth/me');
  await admin.patch(`/api/admin/users/${me.body.data.user.id}/verify`).set(csrf);
  await agent.post('/api/accounts').set(csrf).send({ accountType: 'SAVINGS' }); // verified first => ACTIVE immediately
  const fresh = await agent.get('/api/auth/me');
  return { agent, user: fresh.body.data.user, account: fresh.body.data.account };
}

export const deposit = (agent, amount, k = key()) =>
  agent.post('/api/transactions/deposit').set(csrf).set('Idempotency-Key', k).send({ amount });
export const withdraw = (agent, amount, k = key()) =>
  agent.post('/api/transactions/withdraw').set(csrf).set('Idempotency-Key', k).send({ amount });
export const transfer = (agent, receiverAccountNumber, amount, k = key()) =>
  agent.post('/api/transactions/transfer').set(csrf).set('Idempotency-Key', k).send({ receiverAccountNumber, amount });
