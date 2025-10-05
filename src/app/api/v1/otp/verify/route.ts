import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { approveSession } from '@/lib/mfa';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, code } = await req.json();
    const db = await getDb();
    const s = await db.collection('mfa_sessions').findOne({ sessionId });
    if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (Array.isArray(s.methods) && !s.methods.includes('email_otp')) {
      return NextResponse.json({ error: 'Method not allowed for this session' }, { status: 400 });
    }
    const rec = await db.collection('otp_codes').findOne({ email: s.user.email.toLowerCase() }, { sort: { createdAt: -1 } });
    if (!rec) return NextResponse.json({ error: 'No code' }, { status: 400 });
    if (new Date(rec.expiresAt).getTime() < Date.now()) return NextResponse.json({ error: 'Expired' }, { status: 400 });
    if (rec.attempts >= 6) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
    const ok = await bcrypt.compare(code, rec.hash);
    await db.collection('otp_codes').updateOne({ _id: rec._id }, { $inc: { attempts: 1 } });
    if (!ok) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

  const res = await approveSession(s, 'email_otp');
    if ('partial' in res && res.partial) {
      return NextResponse.json({ status: 'partial', satisfiedMethods: ['email_otp'] });
    }
    const url = new URL(s.successUrl);
    url.searchParams.set('state', s.state);
    url.searchParams.set('challengeId', res.challengeId);
    url.searchParams.set('mfaToken', res.jwt);
    return NextResponse.json({ redirect: url.toString() });
  } catch (err) {
    console.error('/api/v1/otp/verify error', err);
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
