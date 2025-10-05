import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { generateRegistrationOptions } from '@simplewebauthn/server';

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
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
  const userId = s.user?.email?.toLowerCase() || s.user?.id || s.user?.uid || s.state;
  const existing = await db.collection('webauthn_devices').find({ userId }).toArray();
  await db.collection('analytics_events').insertOne({ merchantId: s.merchantId, type: 'webauthn_register_start', sessionId, ts: new Date() });
  const options = await generateRegistrationOptions({
    rpName: 'OpenMFA',
    rpID,
    userID: userId,
    userName: s.user?.email || userId,
    attestationType: 'none',
    excludeCredentials: existing.map(d => ({ id: Buffer.from(d.credentialID, 'base64url'), type: 'public-key' as const })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred', authenticatorAttachment: 'platform' },
  });
  await db.collection('webauthn_challenges').insertOne({ sessionId, userId, challenge: options.challenge, createdAt: new Date() });
  return NextResponse.json({ publicKey: options });
}
