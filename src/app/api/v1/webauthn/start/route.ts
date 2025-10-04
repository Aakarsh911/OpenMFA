import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  const db = await getDb();
  const s = await db.collection('mfa_sessions').findOne({ sessionId });
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // TODO: integrate @simplewebauthn/server generateAssertionOptions using stored devices
  return NextResponse.json({ publicKey: { challenge: 'todo', rpId: new URL(process.env.NEXTAUTH_URL!).hostname } });
}
