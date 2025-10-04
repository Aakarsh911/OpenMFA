import { NextResponse } from 'next/server';
import { auth, getUserIdFromSession } from '@/lib/auth';
import { rotateMerchantKey } from '@/lib/merchants';

export async function POST() {
  const session = await auth();
  try {
    const session = await auth();
    const userId = getUserIdFromSession(session);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
    const { merchant, rawKey } = await rotateMerchantKey(userId, env);
    return NextResponse.json({ merchant, merchantKey: rawKey, showOnce: true });
  } catch (err) {
    console.error('/api/merchant/rotate POST error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
