import { NextResponse } from 'next/server';
import { getPublicJwk } from '@/lib/jwt';

export async function GET() {
  try {
    const jwk = await getPublicJwk();
    return NextResponse.json(
      { keys: [jwk] },
      { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } },
    );
  } catch (err: any) {
    const message = err?.message || 'JWKS error';
    // Return a minimal error payload to help diagnose env issues without leaking secrets
    return NextResponse.json({ error: 'jwks_generation_failed', message }, { status: 500 });
  }
}
