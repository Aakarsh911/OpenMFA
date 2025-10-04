import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const s = await db.collection('mfa_sessions').findOne({ sessionId: params.id });
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    sessionId: s.sessionId,
    status: s.status,
    amount: s.amount,
    currency: s.currency,
    user: s.user,
    expiresAt: s.expiresAt,
  });
}
