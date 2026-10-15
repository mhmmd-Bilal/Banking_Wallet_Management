import { User } from './User.js';
import { Account } from './Account.js';
import { Transaction } from './Transaction.js';
import { Notification } from './Notification.js';
import { AuditLog } from './AuditLog.js';

export { User, Account, Transaction, Notification, AuditLog };

/** Create collections and indexes up-front (collections must exist before use inside transactions). */
export async function initModels() {
  for (const model of [User, Account, Transaction, Notification, AuditLog]) {
    await model.createCollection().catch(() => {});
    await model.syncIndexes();
  }
}
