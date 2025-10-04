import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { makeState, ensureAllowedOrigin } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const { amount, currency, user, successUrl, failureUrl, metadata } = await req.json();
    const merchantId = req.headers.get('x-merchant-id') || '';
    const authHeader = req.headers.get('authorization') || '';
    const key = authHeader.replace(/^Bearer\s+/i, '');

    const db = await getDb();
    const m = await db.collection('merchants').findOne({ merchantId });
    if (!m) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const ok = await bcrypt.compare(key, m.key.hash);
    if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allowed = (m.allowedOrigins && m.allowedOrigins.length > 0)
      ? m.allowedOrigins
      : ['http://localhost:3000', 'http://localhost:3001'];
    if (!ensureAllowedOrigin(successUrl, allowed) || !ensureAllowedOrigin(failureUrl, allowed)) {
      return NextResponse.json({ error: 'Unallowed redirect origin' }, { status: 400 });
    }

    const state = makeState();
    const sessionId = 'ses_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    const doc = {
      sessionId,
      merchantId,
      state,
      amount,
      currency,
      user,
      successUrl,
      failureUrl,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      metadata,
    };
    await db.collection('mfa_sessions').insertOne(doc);
    await db.collection('audits').insertOne({ merchantId, event: 'session.created', sessionId, ts: new Date() });

    const url = `${process.env.NEXTAUTH_URL}/mfa/${sessionId}`;
    return NextResponse.json({ sessionId, state, url, expiresAt: doc.expiresAt.toISOString() });
  } catch (err) {
    console.error('/api/v1/sessions POST error:', err);
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
