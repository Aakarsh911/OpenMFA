import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { approveSession, denySession } from '@/lib/mfa';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, code } = await req.json();
    const db = await getDb();
    const s = await db.collection('mfa_sessions').findOne({ sessionId });
    if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // If session already denied, send failure redirect immediately
    if (s.status === 'denied') {
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
      const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0];
      const base = process.env.NEXTAUTH_URL || (host ? `${proto}://${host}` : 'http://localhost:3000');
      const url = new URL(s.failureUrl, base);
      url.searchParams.set('state', s.state);
      url.searchParams.set('reason', 'denied');
      return NextResponse.json({ redirect: url.toString() });
    }
    if (Array.isArray(s.methods) && !s.methods.includes('email_otp')) {
      return NextResponse.json({ error: 'Method not allowed for this session' }, { status: 400 });
    }
    const rec = await db.collection('otp_codes').findOne({ email: s.user.email.toLowerCase(), sessionId }, { sort: { createdAt: -1 } });
    if (!rec) return NextResponse.json({ error: 'No code' }, { status: 400 });
    if (new Date(rec.expiresAt).getTime() < Date.now()) return NextResponse.json({ error: 'Expired' }, { status: 400 });
    const ok = await bcrypt.compare(code, rec.hash);
    if (!ok) {
      // Record attempt on both the code record and the session
  const updateCode = db.collection('otp_codes').updateOne({ _id: rec._id }, { $inc: { attempts: 1 } });
  // Increment and then read back the latest count to avoid any driver option mismatches
  await db.collection('mfa_sessions').updateOne({ sessionId }, { $inc: { failedAttempts: 1 } });
  const cur = await db.collection('mfa_sessions').findOne({ sessionId }, { projection: { failedAttempts: 1, failureUrl: 1, state: 1 } });
  const failedAttempts = (cur?.failedAttempts as number) ?? 1;
  await db.collection('audits').insertOne({ merchantId: s.merchantId, event: 'otp.invalid', sessionId, ts: new Date(), attempt: failedAttempts });
  await db.collection('analytics_events').insertOne({ merchantId: s.merchantId, type: 'otp_invalid', sessionId, ts: new Date(), attempt: failedAttempts });
      await updateCode;
  if (failedAttempts >= 3) {
        // Deny session and send failure redirect
        await denySession(s, 'denied');
        await db.collection('analytics_events').insertOne({ merchantId: s.merchantId, type: 'session_denied_attempts', sessionId, ts: new Date(), failedAttempts });
        const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
        const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0];
        const base = process.env.NEXTAUTH_URL || (host ? `${proto}://${host}` : 'http://localhost:3000');
        const url = new URL(s.failureUrl, base);
        url.searchParams.set('state', s.state);
        url.searchParams.set('reason', 'attempts_exceeded');
        return NextResponse.json({ redirect: url.toString() });
      }
  // Provide attempt counters to client for UX
  return NextResponse.json({ error: 'Invalid code', attempts: failedAttempts, remaining: Math.max(0, 3 - failedAttempts) }, { status: 400 });
    }

  const res = await approveSession(s, 'email_otp');
    if ('partial' in res && res.partial) {
      await db.collection('analytics_events').insertOne({ merchantId: s.merchantId, type: 'challenge_partial', sessionId, ts: new Date(), method: 'email_otp' });
      return NextResponse.json({ status: 'partial', satisfiedMethods: ['email_otp'] });
    }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0];
  const base = process.env.NEXTAUTH_URL || (host ? `${proto}://${host}` : 'http://localhost:3000');
  const url = new URL(s.successUrl, base);
    url.searchParams.set('state', s.state);
    url.searchParams.set('challengeId', res.challengeId);
    url.searchParams.set('mfaToken', res.jwt);
    await db.collection('analytics_events').insertOne({ merchantId: s.merchantId, type: 'session_approved', sessionId, ts: new Date(), method: 'email_otp' });
    return NextResponse.json({ redirect: url.toString() });
  } catch (err) {
    console.error('/api/v1/otp/verify error', err);
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
