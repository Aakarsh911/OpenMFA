import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { approveSession } from '@/lib/mfa';

export async function POST(req: NextRequest) {
  const { sessionId, assertion } = await req.json();
  const db = await getDb();
  const s = await db.collection('mfa_sessions').findOne({ sessionId });
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // TODO: verify assertion via @simplewebauthn/server and devices collection
  const { challengeId, jwt } = await approveSession(s, 'webauthn');
  const url = new URL(s.successUrl);
  url.searchParams.set('state', s.state);
  url.searchParams.set('challengeId', challengeId);
  url.searchParams.set('mfaToken', jwt);
  return NextResponse.json({ redirect: url.toString() });
}
