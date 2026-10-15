import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';
import http from 'node:http';
import {
  bootstrap, csrf, key, PDF, PASSWORD, registerUser, createAdmin, activeUser, deposit, withdraw, transfer,
} from './helpers.js';

let ctx;
let admin;

before(async () => { ctx = await bootstrap(); });
after(async () => { await ctx.close(); });
beforeEach(async () => { await ctx.reset(); admin = await createAdmin(ctx); });

const balanceOf = async (agent) => (await agent.get('/api/accounts/me/balance')).body.data.balance;

describe('registration & authentication', () => {
  it('registers a user with PENDING statuses, hides the hash, ignores a role field', async () => {
    const { res } = await registerUser(ctx, 1);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.verificationStatus, 'PENDING');
    assert.equal(res.body.data.user.role, 'USER');
    assert.equal(res.body.data.account, null, 'no account is auto-created at registration');
    assert.equal(res.body.data.user.passwordHash, undefined);
    assert.equal(res.body.data.user.identityDocument?.storedName, undefined);
    const hacked = await ctx.agent().post('/api/auth/register').set(csrf)
      .field('role', 'ADMIN').field('name', 'Mallory').field('email', 'm@example.com').field('phone', '9876543210')
      .field('dateOfBirth', '1990-01-01').field('address', '1 Some Street').field('identityType', 'PAN')
      .field('identityNumber', 'ABCDE1234F').field('password', PASSWORD)
      .attach('identityDocument', PDF, { filename: 'a.pdf', contentType: 'application/pdf' });
    assert.equal(hacked.body.data.user.role, 'USER');
  });

  it('rejects duplicate email, invalid phone, weak password and fake documents', async () => {
    await registerUser(ctx, 1);
    const dup = await registerUser(ctx, 1);
    assert.equal(dup.res.status, 409);
    const badPhone = await ctx.agent().post('/api/auth/register').set(csrf)
      .field('name', 'X Y').field('email', 'x@example.com').field('phone', '12345')
      .field('dateOfBirth', '1990-01-01').field('address', '1 Some Street').field('identityType', 'PAN')
      .field('identityNumber', 'ABCDE1234F').field('password', 'weak')
      .attach('identityDocument', PDF, { filename: 'a.pdf', contentType: 'application/pdf' });
    assert.equal(badPhone.status, 400);
    const fake = await registerUser(ctx, 2, { file: Buffer.from('not really a pdf at all') });
    assert.equal(fake.res.status, 400);
  });

  it('logs in, rejects wrong credentials, authenticates via cookie, logs out', async () => {
    const { agent, email } = await registerUser(ctx, 3);
    assert.equal((await agent.get('/api/auth/me')).status, 200);
    await agent.post('/api/auth/logout').set(csrf);
    assert.equal((await agent.get('/api/auth/me')).status, 401);
    const bad = await ctx.agent().post('/api/auth/login').set(csrf).send({ email, password: 'Wrong1234' });
    assert.equal(bad.status, 401);
    const ok = await agent.post('/api/auth/login').set(csrf).send({ email, password: PASSWORD });
    assert.equal(ok.status, 200);
    assert.match(ok.headers['set-cookie'][0], /HttpOnly/i);
  });

  it('requires the CSRF header on state-changing requests', async () => {
    const res = await ctx.agent().post('/api/auth/login').send({ email: 'a@b.co', password: 'x' });
    assert.equal(res.status, 403);
  });
});

describe('role authorization & verification', () => {
  it('blocks unverified users from financial operations and users from admin routes', async () => {
    const { agent } = await registerUser(ctx, 1);
    assert.equal((await deposit(agent, '100')).status, 403);
    assert.equal((await agent.get('/api/admin/users')).status, 403);
    assert.equal((await ctx.agent().get('/api/accounts/me')).status, 401);
  });

  it('keeps admins out of user financial operations', async () => {
    assert.equal((await deposit(admin, '100')).status, 403);
  });

  it('admin approval activates the account', async () => {
    const { agent } = await registerUser(ctx, 1);
    const me = (await agent.get('/api/auth/me')).body.data.user;
    const opened = await agent.post('/api/accounts').set(csrf).send({ accountType: 'SAVINGS' });
    assert.equal(opened.body.data.account.status, 'PENDING');
    const pending = await admin.get('/api/admin/users/pending');
    assert.equal(pending.body.data.items.length, 1);
    const doc = await admin.get(`/api/admin/users/${me.id}/document`);
    assert.equal(doc.status, 200);
    assert.equal((await agent.get(`/api/admin/users/${me.id}/document`)).status, 403);
    const verify = await admin.patch(`/api/admin/users/${me.id}/verify`).set(csrf);
    assert.equal(verify.status, 200);
    assert.equal(verify.body.data.account.status, 'ACTIVE');
    assert.equal((await admin.patch(`/api/admin/users/${me.id}/verify`).set(csrf)).status, 409);
    assert.equal((await deposit(agent, '100')).status, 201);
  });

  it('freezes and unfreezes accounts, blocking money movement while frozen', async () => {
    const a = await activeUser(ctx, admin, 1);
    const b = await activeUser(ctx, admin, 2);
    await deposit(a.agent, '500');
    assert.equal((await admin.patch(`/api/admin/accounts/${a.account.id}/freeze`).set(csrf)).status, 200);
    assert.equal((await deposit(a.agent, '10')).status, 403);
    assert.equal((await withdraw(a.agent, '10')).status, 403);
    assert.equal((await transfer(a.agent, b.account.accountNumber, '10')).status, 403);
    assert.equal((await transfer(b.agent, a.account.accountNumber, '10')).status, 422); // receiver frozen
    assert.equal((await admin.patch(`/api/admin/accounts/${a.account.id}/freeze`).set(csrf)).status, 409);
    assert.equal((await admin.patch(`/api/admin/accounts/${a.account.id}/unfreeze`).set(csrf)).status, 200);
    assert.equal((await deposit(a.agent, '10')).status, 201);
  });
});

describe('user opens a bank account', () => {
  it('has no account until opened; balance starts at zero; only one allowed', async () => {
    const { agent } = await registerUser(ctx, 1);
    assert.equal((await agent.get('/api/accounts/me')).status, 404);
    assert.equal((await deposit(agent, '10')).status, 403);
    assert.equal((await agent.post('/api/accounts').set(csrf).send({ accountType: 'GOLD' })).status, 400);
    assert.equal((await agent.post('/api/accounts').send({ accountType: 'SAVINGS' })).status, 403); // CSRF header
    const res = await agent.post('/api/accounts').set(csrf).send({ accountType: 'CURRENT', balance: 999999 });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.account.accountType, 'CURRENT');
    assert.equal(res.body.data.account.balance, 0, 'client cannot set a balance');
    assert.match(res.body.data.account.accountNumber, /^\d{12}$/);
    assert.equal((await agent.post('/api/accounts').set(csrf).send({ accountType: 'SAVINGS' })).status, 409);
  });

  it('becomes ACTIVE on approval, or immediately if the user was approved before opening', async () => {
    const a = await registerUser(ctx, 1);
    await a.agent.post('/api/accounts').set(csrf).send({ accountType: 'SAVINGS' });
    const b = await registerUser(ctx, 2);
    const bId = (await b.agent.get('/api/auth/me')).body.data.user.id;
    const aId = (await a.agent.get('/api/auth/me')).body.data.user.id;
    assert.equal((await admin.patch(`/api/admin/users/${aId}/verify`).set(csrf)).body.data.account.status, 'ACTIVE');
    const noAcct = await admin.patch(`/api/admin/users/${bId}/verify`).set(csrf);
    assert.equal(noAcct.status, 200);
    assert.equal(noAcct.body.data.account, null);
    const opened = await b.agent.post('/api/accounts').set(csrf).send({ accountType: 'SAVINGS' });
    assert.equal(opened.body.data.account.status, 'ACTIVE');
    assert.equal((await deposit(b.agent, '5')).status, 201);
    assert.equal((await ctx.agent().post('/api/accounts').set(csrf).send({ accountType: 'SAVINGS' })).status, 401);
    assert.equal((await admin.post('/api/accounts').set(csrf).send({ accountType: 'SAVINGS' })).status, 403);
  });
});

describe('admin-created accounts', () => {
  const fields = (req, email) => req.field('name', 'Walk In').field('email', email).field('phone', '9123456780')
    .field('dateOfBirth', '1990-02-02').field('address', '9 Branch Road, Kochi').field('identityType', 'PAN')
    .field('identityNumber', 'ABCDE1234F').field('password', PASSWORD);

  it('lets an admin create an active customer who can log in and transact', async () => {
    const res = await fields(admin.post('/api/admin/users').set(csrf), 'walkin@example.com').field('accountType', 'CURRENT');
    assert.equal(res.status, 201);
    assert.equal(res.body.data.account.status, 'ACTIVE');
    assert.equal(res.body.data.account.accountType, 'CURRENT');
    assert.equal(res.body.data.account.balance, 0);
    assert.equal(res.body.data.user.verificationStatus, 'APPROVED');
    const agent = ctx.agent();
    await agent.post('/api/auth/login').set(csrf).send({ email: 'walkin@example.com', password: PASSWORD });
    assert.equal((await deposit(agent, '10')).status, 201);
    assert.equal(await ctx.models.AuditLog.countDocuments({ action: 'USER_CREATED_BY_ADMIN' }), 1);
  });

  it('queues a non-activated customer for verification and requires a document for it', async () => {
    const noDoc = await fields(admin.post('/api/admin/users').set(csrf), 'later@example.com').field('activate', 'false');
    assert.equal(noDoc.status, 400);
    const ok = await fields(admin.post('/api/admin/users').set(csrf), 'later@example.com').field('activate', 'false')
      .attach('identityDocument', PDF, { filename: 'id.pdf', contentType: 'application/pdf' });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.data.account.status, 'PENDING');
    assert.equal((await admin.get('/api/admin/users/pending')).body.data.items.length, 1);
  });

  it('rejects duplicate emails and non-admin callers', async () => {
    await fields(admin.post('/api/admin/users').set(csrf), 'dup@example.com');
    assert.equal((await fields(admin.post('/api/admin/users').set(csrf), 'dup@example.com')).status, 409);
    const u = await activeUser(ctx, admin, 1);
    assert.equal((await fields(u.agent.post('/api/admin/users').set(csrf), 'x@example.com')).status, 403);
  });
});

describe('deposit & withdrawal', () => {
  it('updates balances in paise and records transactions', async () => {
    const u = await activeUser(ctx, admin, 1);
    const d = await deposit(u.agent, '100.50');
    assert.equal(d.status, 201);
    assert.equal(d.body.data.balance, 10050);
    const w = await withdraw(u.agent, '0.50');
    assert.equal(w.body.data.balance, 10000);
    assert.equal(await balanceOf(u.agent), 10000);
    const hist = await u.agent.get('/api/transactions/my');
    assert.equal(hist.body.data.items.length, 2);
    assert.equal(await ctx.models.Transaction.countDocuments({ status: 'SUCCESS' }), 2);
  });

  it('rejects invalid amounts and overdrafts', async () => {
    const u = await activeUser(ctx, admin, 1);
    await deposit(u.agent, '50');
    for (const bad of ['0', '-5', '1.234', 'abc', '1e3', '', null, 20000000]) {
      assert.equal((await deposit(u.agent, bad)).status, 400, `deposit ${bad}`);
    }
    const over = await withdraw(u.agent, '50.01');
    assert.equal(over.status, 422);
    assert.match(over.body.message, /insufficient/i);
    assert.equal(await balanceOf(u.agent), 5000);
    assert.equal(await ctx.models.AuditLog.countDocuments({ action: 'WITHDRAWAL_FAILED' }), 1);
  });

  it('requires an Idempotency-Key and replays duplicates without moving money twice', async () => {
    const u = await activeUser(ctx, admin, 1);
    const noKey = await u.agent.post('/api/transactions/deposit').set(csrf).send({ amount: '10' });
    assert.equal(noKey.status, 400);
    const k = key();
    const first = await deposit(u.agent, '25', k);
    const second = await deposit(u.agent, '25', k);
    assert.equal(first.status, 201);
    assert.equal(second.status, 200);
    assert.equal(second.body.data.replayed, true);
    assert.equal(second.body.data.transaction.transactionId, first.body.data.transaction.transactionId);
    assert.equal(await balanceOf(u.agent), 2500);
    assert.equal((await deposit(u.agent, '26', k)).status, 409); // same key, different payload
  });

  it('never overspends under concurrent withdrawals', async () => {
    const u = await activeUser(ctx, admin, 1);
    await deposit(u.agent, '1000');
    const results = await Promise.all(Array.from({ length: 6 }, () => withdraw(u.agent, '400')));
    const ok = results.filter((r) => r.status === 201).length;
    assert.equal(ok, 2);
    assert.equal(await balanceOf(u.agent), 20000);
    assert.equal(await ctx.models.Transaction.countDocuments({ type: 'WITHDRAWAL' }), 2);
  });
});

describe('transfers', () => {
  it('moves money atomically, records one immutable transaction, notifies the receiver', async () => {
    const a = await activeUser(ctx, admin, 1);
    const b = await activeUser(ctx, admin, 2);
    await deposit(a.agent, '1000');
    const t = await transfer(a.agent, b.account.accountNumber, '250.25');
    assert.equal(t.status, 201);
    assert.equal(await balanceOf(a.agent), 74975);
    assert.equal(await balanceOf(b.agent), 25025);
    assert.equal(await ctx.models.Transaction.countDocuments({ type: 'TRANSFER' }), 1);
    // both parties see it
    const aHist = await a.agent.get('/api/transactions/my?type=TRANSFER');
    const bHist = await b.agent.get('/api/transactions/my?type=TRANSFER');
    assert.equal(aHist.body.data.items[0].direction, 'DEBIT');
    assert.equal(bHist.body.data.items[0].direction, 'CREDIT');
    // notification persisted for the receiver only
    const n = await b.agent.get('/api/notifications');
    assert.equal(n.body.data.items.length, 1);
    assert.equal(n.body.data.unread, 1);
    assert.equal((await a.agent.get('/api/notifications/unread-count')).body.data.count, 0);
    const marked = await b.agent.patch(`/api/notifications/${n.body.data.items[0].id}/read`).set(csrf);
    assert.equal(marked.body.data.notification.read, true);
    assert.equal((await a.agent.patch(`/api/notifications/${n.body.data.items[0].id}/read`).set(csrf)).status, 404);
    // ledger consistency: money in the system equals deposits
    const accounts = await ctx.models.Account.find();
    assert.equal(accounts.reduce((s, x) => s + x.balance, 0), 100000);
  });

  it('rejects bad transfers: unknown, self, insufficient, invalid amount', async () => {
    const a = await activeUser(ctx, admin, 1);
    const b = await activeUser(ctx, admin, 2);
    await deposit(a.agent, '100');
    assert.equal((await transfer(a.agent, '999999999999', '1')).status, 404);
    assert.equal((await transfer(a.agent, a.account.accountNumber, '1')).status, 400);
    assert.equal((await transfer(a.agent, b.account.accountNumber, '100.01')).status, 422);
    assert.equal((await transfer(a.agent, b.account.accountNumber, '-1')).status, 400);
    assert.equal((await transfer(a.agent, b.account.accountNumber, '0.001')).status, 400);
    assert.equal(await balanceOf(a.agent), 10000);
    assert.equal(await balanceOf(b.agent), 0);
  });

  it('rolls back the debit when the credit cannot be applied (receiver frozen mid-flight)', async () => {
    const a = await activeUser(ctx, admin, 1);
    const b = await activeUser(ctx, admin, 2);
    await deposit(a.agent, '100');
    // Simulate the race: receiver becomes FROZEN after validation but before the credit.
    const Account = ctx.models.Account;
    const original = Account.findOneAndUpdate.bind(Account);
    let calls = 0;
    Account.findOneAndUpdate = function patched(filter, update, opts) {
      calls += 1;
      if (calls === 2) return original({ _id: filter._id, status: 'FROZEN' }, update, opts); // credit matches nothing
      return original(filter, update, opts);
    };
    try {
      const res = await transfer(a.agent, b.account.accountNumber, '40');
      assert.equal(res.status, 422);
    } finally {
      Account.findOneAndUpdate = original;
    }
    assert.equal(await balanceOf(a.agent), 10000, 'sender debit must be rolled back');
    assert.equal(await balanceOf(b.agent), 0);
    assert.equal(await ctx.models.Transaction.countDocuments({ type: 'TRANSFER' }), 0);
    assert.equal(await ctx.models.Notification.countDocuments(), 0);
  });

  it('does not duplicate a transfer for repeated and concurrent identical requests', async () => {
    const a = await activeUser(ctx, admin, 1);
    const b = await activeUser(ctx, admin, 2);
    await deposit(a.agent, '1000');
    const k = key();
    const results = await Promise.all(Array.from({ length: 5 }, () => transfer(a.agent, b.account.accountNumber, '100', k)));
    assert.ok(results.every((r) => [200, 201].includes(r.status)), JSON.stringify(results.map((r) => r.status)));
    assert.equal(await ctx.models.Transaction.countDocuments({ type: 'TRANSFER' }), 1);
    assert.equal(await balanceOf(b.agent), 10000);
  });

  it('never creates negative balances under concurrent transfers', async () => {
    const a = await activeUser(ctx, admin, 1);
    const b = await activeUser(ctx, admin, 2);
    await deposit(a.agent, '1000');
    const results = await Promise.all(Array.from({ length: 6 }, () => transfer(a.agent, b.account.accountNumber, '300')));
    assert.equal(results.filter((r) => r.status === 201).length, 3);
    assert.equal(await balanceOf(a.agent), 10000);
    assert.equal(await balanceOf(b.agent), 90000);
  });

  it('transaction records are immutable', async () => {
    const u = await activeUser(ctx, admin, 1);
    await deposit(u.agent, '10');
    const tx = await ctx.models.Transaction.findOne();
    await assert.rejects(() => ctx.models.Transaction.updateOne({ _id: tx._id }, { amount: 1 }));
    await assert.rejects(() => ctx.models.Transaction.deleteOne({ _id: tx._id }));
    tx.amount = 5;
    await assert.rejects(() => tx.save());
    await assert.rejects(() => ctx.models.AuditLog.deleteMany({}));
  });
});

describe('transaction history & admin monitoring', () => {
  it('filters, searches, sorts, paginates and never leaks other users\' data', async () => {
    const a = await activeUser(ctx, admin, 1);
    const b = await activeUser(ctx, admin, 2);
    await deposit(a.agent, '1000');
    await withdraw(a.agent, '100');
    const t = await transfer(a.agent, b.account.accountNumber, '300');
    await deposit(b.agent, '5');
    const ref = t.body.data.transaction.reference;
    const id = t.body.data.transaction.transactionId;

    const byRef = await a.agent.get(`/api/transactions/my?q=${ref}`);
    assert.equal(byRef.body.data.items.length, 1);
    assert.equal((await a.agent.get(`/api/transactions/my?q=${id}`)).body.data.items.length, 1);
    assert.equal((await a.agent.get('/api/transactions/my?type=DEPOSIT')).body.data.items.length, 1);
    assert.equal((await a.agent.get('/api/transactions/my?status=FAILED')).body.data.items.length, 0);
    assert.equal((await a.agent.get('/api/transactions/my?minAmount=200&maxAmount=500')).body.data.items.length, 1);
    const sorted = await a.agent.get('/api/transactions/my?sortBy=amount&order=asc');
    assert.deepEqual(sorted.body.data.items.map((i) => i.amount), [10000, 30000, 100000]);
    const page = await a.agent.get('/api/transactions/my?limit=2&page=2');
    assert.equal(page.body.data.items.length, 1);
    assert.equal(page.body.data.pagination.total, 3);
    const today = new Date().toISOString().slice(0, 10);
    assert.equal((await a.agent.get(`/api/transactions/my?from=${today}&to=${today}`)).body.data.items.length, 3);
    assert.equal((await a.agent.get('/api/transactions/my?from=2000-01-01&to=2000-01-02')).body.data.items.length, 0);
    assert.equal((await a.agent.get('/api/transactions/my?minAmount=500&maxAmount=1')).status, 400);

    // B's own deposit is not visible to A, and A's withdrawal is not visible to B
    const bHist = await b.agent.get('/api/transactions/my');
    assert.equal(bHist.body.data.items.length, 2);
    const aWithdrawal = (await a.agent.get('/api/transactions/my?type=WITHDRAWAL')).body.data.items[0];
    assert.equal((await b.agent.get(`/api/transactions/${aWithdrawal.transactionId}`)).status, 404);
    assert.equal((await a.agent.get(`/api/transactions/${id}`)).status, 200);
    assert.equal((await b.agent.get(`/api/transactions/${id}`)).status, 200);

    // admin sees everything
    const all = await admin.get('/api/admin/transactions?limit=50');
    assert.equal(all.body.data.pagination.total, 4);
    assert.equal((await admin.get(`/api/admin/transactions/${aWithdrawal.transactionId}`)).status, 200);
    assert.equal((await a.agent.get('/api/admin/transactions')).status, 403);
  });

  it('reports use real SUCCESS data only', async () => {
    const a = await activeUser(ctx, admin, 1);
    const b = await activeUser(ctx, admin, 2);
    await deposit(a.agent, '1000');
    await withdraw(a.agent, '100.50');
    await transfer(a.agent, b.account.accountNumber, '300');
    await withdraw(a.agent, '99999'); // fails: must not count
    const r = await admin.get('/api/admin/reports');
    assert.equal(r.status, 200);
    const t = r.body.data.totals;
    assert.equal(t.totalDeposits, 100000);
    assert.equal(t.totalWithdrawals, 10050);
    assert.equal(t.totalTransfers, 30000);
    assert.equal(t.successfulCount, 3);
    assert.equal(r.body.data.byStatus.find((s) => s.status === 'SUCCESS').count, 3);
    const onlyDeposits = await admin.get('/api/admin/reports?type=DEPOSIT');
    assert.equal(onlyDeposits.body.data.totals.successfulCount, 1);
    assert.equal((await a.agent.get('/api/admin/reports')).status, 403);
  });
});

describe('Socket.IO', () => {
  let server;
  let port;
  before(async () => {
    const { initSocket } = await import('../src/socket/index.js');
    const { createApp } = await import('../src/app.js');
    server = http.createServer(createApp());
    initSocket(server);
    await new Promise((r) => server.listen(0, r));
    port = server.address().port;
  });
  after(async () => {
    const { closeSocket } = await import('../src/socket/index.js');
    await closeSocket();
    server.close();
  });

  const connect = (cookie) =>
    new Promise((resolve) => {
      const s = ioClient(`http://localhost:${port}`, {
        extraHeaders: cookie ? { cookie } : {}, transports: ['websocket'], reconnection: false,
      });
      s.on('connect', () => resolve({ ok: true, socket: s }));
      s.on('connect_error', (e) => { s.close(); resolve({ ok: false, error: e.message }); });
    });

  it('rejects unauthenticated connections and delivers private events only to the right user', async () => {
    assert.equal((await connect()).ok, false);
    assert.equal((await connect('token=garbage')).ok, false);

    const a = await activeUser(ctx, admin, 1);
    const b = await activeUser(ctx, admin, 2);
    const c = await activeUser(ctx, admin, 3);
    const cookieOf = async (u) => {
      const res = await ctx.agent().post('/api/auth/login').set(csrf).send({ email: u.user.email, password: PASSWORD });
      return res.headers['set-cookie'].map((x) => x.split(';')[0]).join('; ');
    };
    const [sa, sb, sc] = await Promise.all([a, b, c].map(async (u) => connect(await cookieOf(u))));
    assert.ok(sa.ok && sb.ok && sc.ok);

    const got = { b: [], c: [] };
    sb.socket.on('notification:new', (n) => got.b.push(n));
    sb.socket.on('balance:update', (p) => got.b.push(p));
    sc.socket.on('notification:new', (n) => got.c.push(n));
    sc.socket.on('balance:update', (p) => got.c.push(p));

    await deposit(a.agent, '100');
    await transfer(a.agent, b.account.accountNumber, '40');
    await new Promise((r) => setTimeout(r, 400));
    assert.ok(got.b.some((e) => e.balance === 4000));
    assert.ok(got.b.some((e) => e.type === 'TRANSFER_RECEIVED'));
    assert.equal(got.c.length, 0, 'unrelated user must receive nothing');
    [sa, sb, sc].forEach((s) => s.socket.close());
  });
});
