import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { makeState, ensureAllowedOrigin } from '@/lib/security';
import { getAppById, resolveMfaMethodsForAmount } from '@/lib/apps';

export async function POST(req: NextRequest) {
  try {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-merchant-id',
    'Access-Control-Max-Age': '86400',
  } as const;
  const json = (body: any, init?: { status?: number }) => NextResponse.json(body, { status: init?.status, headers: corsHeaders });
  const { amount, currency, user, successUrl, failureUrl, metadata, appId } = await req.json();
    const merchantId = req.headers.get('x-merchant-id') || '';
    const authHeader = req.headers.get('authorization') || '';
    const key = authHeader.replace(/^Bearer\s+/i, '');

    const db = await getDb();
    const m = await db.collection('merchants').findOne({ merchantId });
    if (!m) return json({ error: 'Unauthorized' }, { status: 401 });
    const ok = await bcrypt.compare(key, m.key.hash);
    if (!ok) return json({ error: 'Unauthorized' }, { status: 401 });

    const state = makeState();
    let app: any = null;
    let methods: ('webauthn'|'email_otp')[] = ['email_otp'];
    let strategy: 'first-available' | 'all-required' = 'first-available';
  let allowed: string[] = [];
    if (appId) {
      app = await getAppById(appId);
      if (!app || app.merchantId !== merchantId) {
        return json({ error: 'Invalid appId' }, { status: 400 });
      }
      methods = resolveMfaMethodsForAmount(app, amount, currency) as any;
      strategy = app.strategy || 'first-available';
      if (Array.isArray(app.allowedOrigins) && app.allowedOrigins.length > 0) {
        allowed = app.allowedOrigins;
      }
      if (methods.length === 0) {
        // fallback to email if not configured
        methods = ['email_otp'];
      }
    }
  if (allowed.length === 0) {
      allowed = (m.allowedOrigins && m.allowedOrigins.length > 0)
        ? m.allowedOrigins
        : ['http://localhost:3000', 'http://localhost:3001'];
    }
  // Temporarily bypass allowed origin checks for success/failure URLs
  // if (!ensureAllowedOrigin(successUrl, allowed) || !ensureAllowedOrigin(failureUrl, allowed)) {
  //   return json({ error: 'Unallowed redirect origin' }, { status: 400 });
  // }
    const sessionId = 'ses_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    const doc = {
      sessionId,
      merchantId,
      appId: appId || null,
      state,
      amount,
      currency,
      user,
      successUrl,
      failureUrl,
      status: 'pending',
  strategy,
  satisfiedMethods: [],
      methods,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      metadata,
    };
    await db.collection('mfa_sessions').insertOne(doc);
    await db.collection('audits').insertOne({ merchantId, event: 'session.created', sessionId, ts: new Date() });

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0];
  const base = process.env.NEXTAUTH_URL || (host ? `${proto}://${host}` : 'http://localhost:3000');
  const url = `${base}/mfa/${sessionId}`;
    return json({ sessionId, state, url, expiresAt: doc.expiresAt.toISOString() });
  } catch (err) {
    console.error('/api/v1/sessions POST error:', err);
    return NextResponse.json({ error: 'Bad Request' }, { status: 400, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-merchant-id',
      'Access-Control-Max-Age': '86400',
    }});
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-merchant-id',
      'Access-Control-Max-Age': '86400',
    },
  });
}
