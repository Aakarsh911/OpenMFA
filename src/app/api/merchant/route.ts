import { NextResponse } from 'next/server';
import { auth, getUserIdFromSession } from '@/lib/auth';
import { getOrCreateMerchantForUser } from '@/lib/merchants';

export async function GET() {
  try {
    const session = await auth();
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
    const { merchant, rawKey } = await getOrCreateMerchantForUser(userId, env);
    return NextResponse.json({ merchant, merchantKey: rawKey ?? null, showOnce: !!rawKey });
  } catch (err) {
    console.error('/api/merchant GET error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
