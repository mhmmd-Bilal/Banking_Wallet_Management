// Development seed. Wipes the target database and recreates consistent sample data.
// Usage: set SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD in .env, then `npm run seed`.
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User, Account, Transaction, Notification, AuditLog } from '../models/index.js';
import { generateAccountNumber, generateReference, generateTransactionId } from '../utils/ids.js';
import { formatPaise } from '../utils/money.js';
import { saveDocument } from '../utils/fileStorage.js';

if (env.isProduction) {
  console.error('Refusing to seed in production.');
  process.exit(1);
}
const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const userPassword = process.env.SEED_USER_PASSWORD;
if (!adminPassword || !userPassword) {
  console.error('Set SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD in your environment (.env).');
  process.exit(1);
}

// Smallest valid PDF, used as a stand-in identity document for seeded users.
const MINI_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'
);

const storeSampleDocument = (label) => saveDocument({ buffer: MINI_PDF, originalname: `${label}-id.pdf` });

const daysAgo = (n, hour = 10) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
};

const PEOPLE = [
  { key: 'alice', name: 'Alice Menon', email: 'alice@example.com', phone: '9876500001', verified: true, status: 'ACTIVE' },
  { key: 'bob', name: 'Bob Nair', email: 'bob@example.com', phone: '9876500002', verified: true, status: 'ACTIVE' },
  { key: 'carol', name: 'Carol Thomas', email: 'carol@example.com', phone: '9876500003', verified: true, status: 'FROZEN' },
  { key: 'dave', name: 'Dave Pillai', email: 'dave@example.com', phone: '9876500004', verified: false, status: 'PENDING' },
  { key: 'erin', name: 'Erin Varghese', email: 'erin@example.com', phone: '9876500005', verified: false, status: 'PENDING' },
];

// Ledger of operations in paise. Balances are DERIVED from these, so they always agree.
const LEDGER = [
  { type: 'DEPOSIT', to: 'alice', amount: 5_000_000, day: 20 },
  { type: 'DEPOSIT', to: 'bob', amount: 2_000_000, day: 19 },
  { type: 'DEPOSIT', to: 'carol', amount: 300_000, day: 18 },
  { type: 'WITHDRAWAL', from: 'alice', amount: 500_000, day: 15 },
  { type: 'TRANSFER', from: 'alice', to: 'bob', amount: 750_050, day: 12 },
  { type: 'TRANSFER', from: 'bob', to: 'alice', amount: 120_025, day: 8 },
  { type: 'WITHDRAWAL', from: 'bob', amount: 200_000, day: 5 },
  { type: 'DEPOSIT', to: 'alice', amount: 150_075, day: 2 },
];

async function main() {
  await connectDB();
  await mongoose.connection.dropDatabase();
  await (await import('../models/index.js')).initModels();

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const userHash = await bcrypt.hash(userPassword, 12);

  const admin = await User.create({
    name: 'System Admin', email: adminEmail, phone: '9876500000', dateOfBirth: new Date('1985-01-01T00:00:00Z'),
    address: 'Head Office, Thiruvananthapuram', identityDetails: { type: 'PAN', number: 'ADMIN0001' },
    passwordHash: adminHash, role: 'ADMIN', verificationStatus: 'APPROVED', accountStatus: 'ACTIVE',
  });

  const users = {};
  const accounts = {};
  const used = new Set();
  for (const p of PEOPLE) {
    users[p.key] = await User.create({
      name: p.name, email: p.email, phone: p.phone, dateOfBirth: new Date('1995-06-15T00:00:00Z'),
      address: `${p.name}, MG Road, Kochi`, identityDetails: { type: 'AADHAAR', number: `${p.phone}1234` },
      passwordHash: userHash, role: 'USER', verificationStatus: p.verified ? 'APPROVED' : 'PENDING',
      accountStatus: p.status, identityDocument: await storeSampleDocument(p.key),
    });
    let accountNumber;
    do { accountNumber = generateAccountNumber(); } while (used.has(accountNumber));
    used.add(accountNumber);
    accounts[p.key] = { userId: users[p.key]._id, accountNumber, ifsc: env.ifsc, branch: env.branch, accountType: 'SAVINGS', balance: 0, status: p.status };
  }

  const txDocs = [];
  const notifications = [];
  const audits = [];
  for (const op of LEDGER) {
    const at = daysAgo(op.day);
    if (op.from) accounts[op.from].balance -= op.amount;
    if (op.to) accounts[op.to].balance += op.amount;
    for (const k of [op.from, op.to].filter(Boolean)) {
      if (accounts[k].balance < 0) throw new Error(`Seed ledger would overdraw ${k}`);
    }
    const tx = {
      transactionId: generateTransactionId(), reference: generateReference(), type: op.type, amount: op.amount,
      status: 'SUCCESS', createdAt: at,
      ...(op.from && { senderId: users[op.from]._id, senderAccountNumber: accounts[op.from].accountNumber }),
      ...(op.to && { receiverId: users[op.to]._id, receiverAccountNumber: accounts[op.to].accountNumber }),
    };
    txDocs.push(tx);
    const actor = users[op.from || op.to]._id;
    audits.push({ actorId: actor, action: `${op.type}_SUCCESS`, targetId: actor, metadata: { amount: op.amount, reference: tx.reference }, createdAt: at });
    if (op.type === 'TRANSFER') {
      notifications.push({
        userId: users[op.to]._id, type: 'TRANSFER_RECEIVED', read: op.day > 10, createdAt: at,
        message: `You received ${formatPaise(op.amount)} from ${PEOPLE.find((p) => p.key === op.from).name} (Ref: ${tx.reference})`,
      });
    }
  }
  for (const p of PEOPLE) {
    audits.push({ actorId: users[p.key]._id, action: 'USER_REGISTERED', targetId: users[p.key]._id, metadata: { email: p.email }, createdAt: daysAgo(25) });
    if (p.verified) audits.push({ actorId: admin._id, action: 'USER_VERIFIED', targetId: users[p.key]._id, metadata: {}, createdAt: daysAgo(22) });
  }
  audits.push({ actorId: admin._id, action: 'ACCOUNT_FROZEN', targetId: users.carol._id, metadata: {}, createdAt: daysAgo(10) });

  delete accounts.erin; // Erin is pending and has not opened an account yet (demonstrates the open-account flow)
  await Account.insertMany(Object.values(accounts));
  await Transaction.insertMany(txDocs);
  await Notification.insertMany(notifications);
  await AuditLog.insertMany(audits);

  console.log('Seed complete.');
  console.log(`Admin login: ${adminEmail}`);
  console.log('Users (all share SEED_USER_PASSWORD):');
  for (const p of PEOPLE) {
    const a = accounts[p.key];
    console.log(`  ${p.email.padEnd(20)} ${p.status.padEnd(7)} ${a ? `account ${a.accountNumber}  balance ${formatPaise(a.balance)}` : 'no account yet'}`);
  }
  await disconnectDB();
}

main().catch(async (e) => {
  console.error('Seed failed:', e);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
