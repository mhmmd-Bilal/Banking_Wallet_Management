import { AuditLog } from '../models/index.js';

const SENSITIVE = /password|token|secret|document|identity|hash/i;

function clean(metadata = {}) {
  const out = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (SENSITIVE.test(k)) continue;
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = v;
  }
  return out;
}

/** Writes an audit entry; pass `session` to make it part of a financial/admin transaction. */
export async function audit({ actorId, action, targetId, metadata }, session) {
  await AuditLog.create([{ actorId, action, targetId, metadata: clean(metadata) }], session ? { session } : {});
}

/** Best-effort audit for failures; never throws. */
export async function auditSafe(entry) {
  try {
    await audit(entry);
  } catch (e) {
    console.error('[audit] failed to write audit log:', e.message);
  }
}
