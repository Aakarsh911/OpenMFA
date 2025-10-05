import { NextResponse } from 'next/server';
import { auth, getUserIdFromSession } from '@/lib/auth';
import { getOrCreateMerchantForUser } from '@/lib/merchants';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  const userId = getUserIdFromSession(session);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { merchant } = await getOrCreateMerchantForUser(userId);
  const db = await getDb();

  // Compute overall totals
  const [successes, denied, activeApps] = await Promise.all([
    db.collection('analytics_events').countDocuments({ merchantId: merchant.merchantId, type: 'session_approved' }),
    db.collection('analytics_events').countDocuments({ merchantId: merchant.merchantId, type: 'session_denied_attempts' }),
    db.collection('apps').countDocuments({ merchantId: merchant.merchantId }),
  ]);

  // Only count as failed when a redirect to failure URL happened (i.e., denied)
  const failedAttempts = denied;
  const attempts = successes + failedAttempts;
  const successRate = attempts > 0 ? successes / attempts : 0;

  // Methods breakdown for successful authentications
  const methodsAgg = await db.collection('analytics_events').aggregate([
    { $match: { merchantId: merchant.merchantId, type: 'session_approved' } },
    { $group: { _id: '$method', count: { $sum: 1 } } },
  ]).toArray();

  const methods = methodsAgg
    .filter(m => !!m._id)
    .map(m => ({ method: m._id as string, count: m.count as number }));

  return NextResponse.json({
    totals: {
  totalAuthentications: attempts,
      failedAttempts,
      successRate,
      activeApps,
    },
    methods,
  });
}
