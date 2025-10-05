import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { sendOtp } from '@/lib/email';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    const db = await getDb();
    const s = await db.collection('mfa_sessions').findOne({ sessionId });
    if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // rate limit: max 3 sends per session, and at most once per 60s
  const now = Date.now();
    const sendsLast10m = await db.collection('otp_codes').countDocuments({ sessionId });
    if (sendsLast10m >= 3) return NextResponse.json({ error: 'Too many codes sent' }, { status: 429 });
    const last = await db.collection('otp_codes').findOne({ sessionId }, { sort: { createdAt: -1 } });
    if (last) {
      const diff = now - new Date(last.createdAt).getTime();
      const minInterval = 60 * 1000;
      if (diff < minInterval) {
        const retryAfter = Math.ceil((minInterval - diff) / 1000);
        return NextResponse.json({ error: 'Too soon', retryAfter }, { status: 429 });
      }
    }
    if (Array.isArray(s.methods) && !s.methods.includes('email_otp')) {
      return NextResponse.json({ error: 'Method not allowed for this session' }, { status: 400 });
    }
    const code = ('' + Math.floor(100000 + Math.random() * 900000)).slice(-6);
    const hash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const challengeId = 'ch_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    await db.collection('otp_codes').insertOne({ sessionId, challengeId, email: s.user.email.toLowerCase(), hash, attempts: 0, createdAt: new Date(), expiresAt });
    await db.collection('audits').insertOne({ merchantId: s.merchantId, event: 'challenge.created', sessionId, challengeId, ts: new Date() });
    try {
      await sendOtp(s.user.email, code);
      return NextResponse.json({ challengeId, expiresAt: expiresAt.toISOString() });
    } catch (e: any) {
      console.warn('[otp] email send failed:', e?.message || e);
      return NextResponse.json({ error: 'Email delivery failed' }, { status: 502 });
    }
  } catch (err) {
    console.error('/api/v1/otp/send error', err);
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
