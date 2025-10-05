import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyRegistrationResponse } from '@simplewebauthn/server';

export async function POST(req: NextRequest) {
  const { sessionId, attestation } = await req.json();
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
  const verification = await verifyRegistrationResponse({ response: attestation, expectedChallenge: challenge.challenge, expectedOrigin: origin, expectedRPID: rpID });
  if (!verification.verified || !verification.registrationInfo) return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  await db.collection('webauthn_devices').updateOne(
    { userId, credentialID: Buffer.from(credentialID).toString('base64url') },
    {
      $set: {
        userId,
        credentialID: Buffer.from(credentialID).toString('base64url'),
        credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        credentialDeviceType,
        credentialBackedUp,
        transports: attestation?.response?.transports || [],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
  await db.collection('analytics_events').insertOne({ merchantId: s.merchantId, type: 'webauthn_register_finish', sessionId, ts: new Date() });
  return NextResponse.json({ ok: true });
}
