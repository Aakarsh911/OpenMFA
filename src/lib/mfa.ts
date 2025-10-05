import { getDb } from './mongodb';
import { signApprovalToken } from './jwt';
import { randomBytes } from 'crypto';

export async function getSessionById(sessionId: string) {
  const db = await getDb();
  return db.collection('mfa_sessions').findOne({ sessionId });
}

export async function approveSession(session: any, method: 'email_otp' | 'webauthn') {
  const db = await getDb();
  const s = await db.collection('mfa_sessions').findOne({ sessionId: session.sessionId });
  if (!s) throw new Error('Session not found');
  const methods: string[] = s.methods || [];
  const strategy: 'first-available' | 'all-required' = s.strategy || 'first-available';
  const satisfied: string[] = Array.isArray(s.satisfiedMethods) ? s.satisfiedMethods : [];

  if (!methods.includes(method)) {
    throw new Error('Method not allowed for session');
  }

  // Record this factor as satisfied
  const updatedSatisfied = Array.from(new Set([...satisfied, method]));

  const needsAll = strategy === 'all-required';
  const allSatisfied = needsAll ? methods.every(m => updatedSatisfied.includes(m)) : true;

  if (!allSatisfied) {
    // Update progress; keep session pending
    await db.collection('mfa_sessions').updateOne(
      { sessionId: s.sessionId },
      { $set: { satisfiedMethods: updatedSatisfied, status: 'pending' } }
    );
    await db.collection('audits').insertOne({ merchantId: s.merchantId, event: `challenge.partial.${method}`, sessionId: s.sessionId, ts: new Date() });
    return { partial: true } as const;
  }

  // All satisfied or first-available: issue token and approve
  const challengeId = 'ch_' + base64url(randomBytes(10));
  const { jwt, jti, exp } = await signApprovalToken({
    merchantId: s.merchantId,
    amount: s.amount,
    currency: s.currency,
    metadata: s.metadata,
    challengeId,
  });
  await db.collection('approval_tokens').insertOne({ jti, merchantId: s.merchantId, challengeId, jwt, exp: new Date(exp * 1000), createdAt: new Date() });
  await db.collection('mfa_sessions').updateOne(
    { sessionId: s.sessionId },
    { $set: { status: 'approved', challengeId, satisfiedMethods: updatedSatisfied } }
  );
  await db.collection('audits').insertOne({ merchantId: s.merchantId, event: 'challenge.approved', sessionId: s.sessionId, challengeId, ts: new Date() });
  return { challengeId, jwt } as const;
}

export async function denySession(session: any, reason: 'denied' | 'expired') {
  const db = await getDb();
  await db.collection('mfa_sessions').updateOne({ sessionId: session.sessionId }, { $set: { status: reason } });
  await db.collection('audits').insertOne({ merchantId: session.merchantId, event: `challenge.${reason}`, sessionId: session.sessionId, ts: new Date() });
}

function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
