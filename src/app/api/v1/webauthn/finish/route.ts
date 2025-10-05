import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { approveSession } from '@/lib/mfa';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';

export async function POST(req: NextRequest) {
  const { sessionId, assertion } = await req.json();
  const db = await getDb();
  const s = await db.collection('mfa_sessions').findOne({ sessionId });
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (Array.isArray(s.methods) && !s.methods.includes('webauthn')) {
    return NextResponse.json({ error: 'Method not allowed for this session' }, { status: 400 });
  }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0];
  const base = process.env.NEXTAUTH_URL || (host ? `${proto}://${host}` : 'http://localhost:3000');
  const rpID = new URL(base).hostname;
  const origin = base;
  const userId = s.user?.email?.toLowerCase() || s.user?.id || s.user?.uid || s.state;
  const challenge = await db.collection('webauthn_challenges').findOne({ sessionId, userId }, { sort: { createdAt: -1 } });
  if (!challenge) return NextResponse.json({ error: 'No challenge' }, { status: 400 });
  const devices = await db.collection('webauthn_devices').find({ userId }).toArray();
  const credId = assertion?.id as string;
  const dev = devices.find(d => d.credentialID === credId);
  if (!dev) return NextResponse.json({ error: 'Unknown device' }, { status: 400 });
  const verification = await verifyAuthenticationResponse({
    response: assertion,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialPublicKey: Buffer.from(dev.credentialPublicKey, 'base64url'),
      credentialID: Buffer.from(dev.credentialID, 'base64url'),
      counter: dev.counter || 0,
      transports: dev.transports || [],
    },
  });
  if (!verification.verified || !verification.authenticationInfo) return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  const { newCounter } = verification.authenticationInfo;
  await db.collection('webauthn_devices').updateOne({ userId, credentialID: dev.credentialID }, { $set: { counter: newCounter, updatedAt: new Date() } });
  const res = await approveSession(s, 'webauthn');
  if ('partial' in res && res.partial) {
    await db.collection('analytics_events').insertOne({ merchantId: s.merchantId, type: 'challenge_partial', sessionId, ts: new Date(), method: 'webauthn' });
    return NextResponse.json({ status: 'partial', satisfiedMethods: ['webauthn'] });
  }
  const url = new URL(s.successUrl);
  url.searchParams.set('state', s.state);
  url.searchParams.set('challengeId', res.challengeId);
  url.searchParams.set('mfaToken', res.jwt);
  await db.collection('analytics_events').insertOne({ merchantId: s.merchantId, type: 'session_approved', sessionId, ts: new Date(), method: 'webauthn' });
  return NextResponse.json({ redirect: url.toString() });
}
