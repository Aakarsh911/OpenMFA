import { getDb } from './mongodb';
import { signApprovalToken } from './jwt';
import { randomBytes } from 'crypto';

export async function getSessionById(sessionId: string) {
  const db = await getDb();
  return db.collection('mfa_sessions').findOne({ sessionId });
}

export async function approveSession(session: any, method: 'otp' | 'webauthn') {
  const db = await getDb();
  const challengeId = 'ch_' + base64url(randomBytes(10));
  const { jwt, jti, exp } = await signApprovalToken({
    merchantId: session.merchantId,
    amount: session.amount,
    currency: session.currency,
    metadata: session.metadata,
    challengeId,
  });
  await db.collection('approval_tokens').insertOne({
    jti,
    merchantId: session.merchantId,
    challengeId,
    jwt,
    exp: new Date(exp * 1000),
    createdAt: new Date(),
  });
  await db.collection('mfa_sessions').updateOne(
    { sessionId: session.sessionId },
    { $set: { status: 'approved', challengeId } }
  );
  await db.collection('audits').insertOne({
    merchantId: session.merchantId,
    event: 'challenge.approved',
    sessionId: session.sessionId,
    challengeId,
    ts: new Date(),
  });
  return { challengeId, jwt };
}

export async function denySession(session: any, reason: 'denied' | 'expired') {
  const db = await getDb();
  await db.collection('mfa_sessions').updateOne({ sessionId: session.sessionId }, { $set: { status: reason } });
  await db.collection('audits').insertOne({ merchantId: session.merchantId, event: `challenge.${reason}`, sessionId: session.sessionId, ts: new Date() });
}

function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
